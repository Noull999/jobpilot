from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, CV, Job, JobMatch
from app.services import calculate_job_match, sync_portal_jobs
from app import db
import logging

bp = Blueprint('jobs', __name__, url_prefix='/api/jobs')
logger = logging.getLogger(__name__)

@bp.route('/matches', methods=['GET'])
@jwt_required()
def get_job_matches():
    """Obtiene empleos que coinciden con el CV del usuario"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Obtener CV actual
        cv = CV.query.filter_by(user_id=user_id).order_by(CV.uploaded_at.desc()).first()

        if not cv:
            return jsonify({
                'success': True,
                'matches': [],
                'message': 'Please upload a CV first'
            }), 200

        # Obtener límite de resultados (default 10, máximo 50)
        limit = request.args.get('limit', 10, type=int)
        if limit > 50:
            limit = 50

        # Buscar matches existentes en la BD
        existing_matches = JobMatch.query.filter_by(user_id=user_id, cv_id=cv.id)\
            .order_by(JobMatch.match_score.desc())\
            .limit(limit).all()

        # Si hay matches en cache, devolverlos
        if existing_matches:
            return jsonify({
                'success': True,
                'matches': [match.to_dict() for match in existing_matches],
                'count': len(existing_matches)
            }), 200

        # Si no hay matches en cache, calcular nuevos
        # Obtener todos los jobs (en producción, usar paginación o filtros)
        jobs = Job.query.limit(100).all()

        if not jobs:
            return jsonify({
                'success': True,
                'matches': [],
                'message': 'No jobs available'
            }), 200

        # Calcular matches
        matches = []
        for job in jobs:
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

        db.session.commit()

        # Ordenar por score y tomar top N
        matches.sort(key=lambda x: x['score'], reverse=True)
        top_matches = matches[:limit]

        return jsonify({
            'success': True,
            'matches': [m['match_obj'].to_dict() for m in top_matches],
            'count': len(top_matches)
        }), 200

    except Exception as e:
        logger.error(f"Get matches error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

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
def search_jobs():
    """Busca empleos por título o empresa"""
    try:
        query = request.args.get('q', '').strip()
        limit = request.args.get('limit', 20, type=int)

        if not query:
            return jsonify({'error': 'Search query required'}), 400

        # Buscar en título o empresa
        jobs = Job.query.filter(
            (Job.title.ilike(f'%{query}%')) |
            (Job.company.ilike(f'%{query}%'))
        ).limit(limit).all()

        return jsonify({
            'success': True,
            'jobs': [job.to_dict() for job in jobs],
            'count': len(jobs)
        }), 200

    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/sync/<portal>', methods=['POST'])
@jwt_required()
def manual_sync_portal(portal):
    """Manually refresh jobs from specific portal"""
    try:
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
