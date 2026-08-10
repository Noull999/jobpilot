from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.orm import joinedload
from app.models import User, CV, Job, JobMatch, Application
from app.services import calculate_job_match, sync_portal_jobs
from app import db, limiter
from app.schemas import JobMatchQuery
from pydantic import ValidationError
import logging

bp = Blueprint('jobs', __name__, url_prefix='/api/jobs')
logger = logging.getLogger(__name__)

@bp.route('/matches', methods=['GET'])
@jwt_required()
@limiter.limit("30 per hour")
def get_job_matches():
    """Obtiene empleos que coinciden con el CV del usuario (con paginación)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404

        # Obtener CV actual
        cv = CV.query.filter_by(user_id=user_id).order_by(CV.uploaded_at.desc()).first()

        if not cv:
            return jsonify({
                'success': True,
                'matches': [],
                'message': 'Por favor sube un CV primero',
                'total': 0
            }), 200

        # Validar parámetros con Pydantic
        try:
            query_params = JobMatchQuery(
                limit=request.args.get('limit', 10, type=int),
                offset=request.args.get('offset', 0, type=int)
            )
        except ValidationError as e:
            errors = {field['loc'][0]: field['msg'] for field in e.errors()}
            return jsonify({'error': 'Parámetros inválidos', 'details': errors}), 400

        # Buscar matches existentes con eager loading (evitar N+1)
        existing_matches = JobMatch.query\
            .options(joinedload(JobMatch.job))\
            .filter_by(user_id=user_id, cv_id=cv.id)\
            .order_by(JobMatch.match_score.desc())\
            .limit(query_params.limit)\
            .offset(query_params.offset)\
            .all()

        # Si hay matches en cache, devolverlos
        if existing_matches:
            total = JobMatch.query.filter_by(user_id=user_id, cv_id=cv.id).count()
            return jsonify({
                'success': True,
                'matches': [match.to_dict() for match in existing_matches],
                'total': total,
                'limit': query_params.limit,
                'offset': query_params.offset
            }), 200

        # Si no hay matches en cache, obtener jobs con paginación
        jobs = Job.query\
            .order_by(Job.created_at.desc())\
            .limit(100)\
            .all()

        if not jobs:
            return jsonify({
                'success': True,
                'matches': [],
                'message': 'No hay empleos disponibles',
                'total': 0
            }), 200

        # Calcular matches (máximo para este endpoint)
        matches = []
        for job in jobs:
            try:
                match_result = calculate_job_match(cv, job)

                # Guardar match en BD
                job_match = JobMatch(
                    user_id=user_id,
                    job_id=job.id,
                    cv_id=cv.id,
                    match_score=match_result['score'],
                    skills_matched=match_result['skills_matched'],
                    skills_missing=match_result['skills_missing'],
                    match_reason=match_result['reason']
                )
                db.session.add(job_match)
                matches.append({
                    'score': match_result['score'],
                    'job': job,
                    'match_obj': job_match
                })
            except Exception as e:
                logger.error(f"Error calculating match for job {job.id}: {str(e)}")
                continue

        db.session.commit()

        # Ordenar por score y aplicar paginación
        matches.sort(key=lambda x: x['score'], reverse=True)
        paginated_matches = matches[query_params.offset:query_params.offset + query_params.limit]

        return jsonify({
            'success': True,
            'matches': [m['match_obj'].to_dict() for m in paginated_matches],
            'total': len(matches),
            'limit': query_params.limit,
            'offset': query_params.offset
        }), 200

    except Exception as e:
        logger.error(f"Get matches error: {str(e)}", exc_info=True)
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500

@bp.route('/<int:job_id>', methods=['GET'])
@jwt_required()
def get_job(job_id):
    """Obtiene detalles de un empleo específico"""
    try:
        job = Job.query.get(job_id)

        if not job:
            return jsonify({'error': 'Job not found'}), 404

        return jsonify({
            'success': True,
            'job': job.to_dict()
        }), 200

    except Exception as e:
        logger.error(f"Get job error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/search', methods=['GET'])
@jwt_required()
@limiter.limit("30 per hour")
def search_jobs():
    """Busca empleos por título o empresa"""
    try:
        query = request.args.get('q', '').strip()
        limit = request.args.get('limit', 20, type=int)

        if not query:
            return jsonify({'error': 'Search query required'}), 400

        # Validar longitud de query (prevenir LIKE injection)
        if len(query) > 100:
            return jsonify({'error': 'Search query too long (max 100 chars)'}), 400

        # Validar limit
        if limit < 1 or limit > 100:
            limit = 20

        # Escapar wildcards en LIKE
        safe_query = query.replace('%', '\\%').replace('_', '\\_')

        # Buscar en título o empresa
        jobs = Job.query.filter(
            (Job.title.ilike(f'%{safe_query}%', escape='\\')) |
            (Job.company.ilike(f'%{safe_query}%', escape='\\'))
        ).limit(limit).all()

        return jsonify({
            'success': True,
            'jobs': [job.to_dict() for job in jobs],
            'count': len(jobs)
        }), 200

    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/<int:job_id>/apply', methods=['POST'])
@jwt_required()
def apply_job(job_id):
    """Aplica a un empleo con el CV del usuario"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json() or {}

        # Validar que el trabajo existe
        job = Job.query.get(job_id)
        if not job:
            return jsonify({'error': 'Job not found'}), 404

        # Obtener CV actual
        cv = CV.query.filter_by(user_id=user_id).order_by(CV.uploaded_at.desc()).first()
        if not cv:
            return jsonify({'error': 'Please upload a CV first'}), 400

        # Verificar si ya aplicó a este trabajo
        existing_app = Application.query.filter_by(
            user_id=user_id,
            job_id=job_id
        ).first()

        if existing_app:
            return jsonify({
                'error': 'Already applied',
                'message': 'Ya has aplicado a este empleo'
            }), 409

        # Crear aplicación
        application = Application(
            user_id=user_id,
            job_id=job_id,
            cv_id=cv.id,
            cover_letter=data.get('cover_letter')
        )
        db.session.add(application)
        db.session.commit()

        logger.info(f"User {user_id} applied to job {job_id}")

        return jsonify({
            'success': True,
            'application': application.to_dict(),
            'message': 'Solicitud enviada exitosamente'
        }), 201

    except Exception as e:
        logger.error(f"Apply error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/applications', methods=['GET'])
@jwt_required()
@limiter.limit("60 per hour")
def get_user_applications():
    """Obtiene todas las aplicaciones del usuario"""
    try:
        user_id = int(get_jwt_identity())

        applications = Application.query.filter_by(user_id=user_id)\
            .order_by(Application.applied_at.desc()).all()

        return jsonify({
            'success': True,
            'applications': [app.to_dict() for app in applications],
            'count': len(applications)
        }), 200

    except Exception as e:
        logger.error(f"Get applications error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/sync/<portal>', methods=['POST'])
@jwt_required()
@limiter.limit("10 per hour")
def manual_sync_portal(portal):
    """Manually refresh jobs from specific portal"""
    try:
        # Validar que el portal sea válido
        VALID_PORTALS = {'linkedin', 'computrabajo', 'indeed', 'glassdoor', 'builtin'}
        if portal not in VALID_PORTALS:
            return jsonify({'error': f'Invalid portal. Valid: {", ".join(VALID_PORTALS)}'}), 400

        result = sync_portal_jobs(portal, limit=100)
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Sync error for {portal}: {str(e)}")
        return jsonify({'error': str(e)}), 400

@bp.route('/sync-all', methods=['POST'])
@jwt_required()
def sync_all_portals():
    """Manually refresh all portals"""
    try:
        from app.services.job_integrations import get_all_portal_integrations

        results = {}
        for portal in get_all_portal_integrations():
            results[portal.source_name] = sync_portal_jobs(portal.source_name)

        return jsonify({
            'status': 'success',
            'results': results
        }), 200

    except Exception as e:
        logger.error(f"Sync all error: {str(e)}")
        return jsonify({'error': str(e)}), 400
