from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, CV
from app.services import analyze_cv_with_claude
from app import db
import logging
import os
from werkzeug.utils import secure_filename

bp = Blueprint('cv', __name__, url_prefix='/api/cv')
logger = logging.getLogger(__name__)

UPLOAD_FOLDER = 'uploads/cvs'
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'txt'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_cv():
    """Sube y analiza CV del usuario"""
    logger.info("=" * 60)
    logger.info("🔄 CV UPLOAD REQUEST INICIADO")
    logger.info("=" * 60)

    try:
        # Paso 1: Obtener usuario
        logger.info("📍 Paso 1: Verificando JWT y usuario...")
        user_id = int(get_jwt_identity())
        logger.info(f"✅ JWT válido - user_id: {user_id}")

        user = User.query.get(user_id)
        if not user:
            logger.warning(f"❌ Usuario {user_id} no encontrado en BD")
            return jsonify({'error': 'User not found'}), 404

        logger.info(f"✅ Usuario encontrado: {user.email}")

        # Paso 2: Validar archivo
        logger.info("📍 Paso 2: Validando archivo...")
        if 'file' not in request.files:
            logger.warning("❌ No hay archivo en request")
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        logger.info(f"✅ Archivo recibido: {file.filename}")

        if file.filename == '':
            logger.warning("❌ Nombre de archivo vacío")
            return jsonify({'error': 'No file selected'}), 400

        if not allowed_file(file.filename):
            logger.warning(f"❌ Tipo de archivo no permitido: {file.filename.rsplit('.', 1)[-1] if '.' in file.filename else 'sin extensión'}")
            return jsonify({'error': 'File type not allowed. Allowed: pdf, doc, docx, txt'}), 400

        logger.info(f"✅ Tipo de archivo válido")

        # Paso 3: Crear carpeta y guardar archivo
        logger.info("📍 Paso 3: Guardando archivo en disco...")
        upload_dir = os.path.abspath(UPLOAD_FOLDER)
        os.makedirs(upload_dir, exist_ok=True)
        logger.info(f"✅ Carpeta: {upload_dir}")

        filename = secure_filename(f"cv_{user_id}_{file.filename}")
        filepath = os.path.join(upload_dir, filename)
        file.save(filepath)
        file_size = os.path.getsize(filepath)
        logger.info(f"✅ Archivo guardado: {filepath} ({file_size} bytes)")

        # Paso 4: Crear registro en BD
        logger.info("📍 Paso 4: Guardando registro en BD...")
        cv = CV(
            user_id=user_id,
            filename=file.filename,
            file_path=filepath,
            file_size=file_size
        )
        db.session.add(cv)
        db.session.flush()
        logger.info(f"✅ Registro creado en BD - CV ID: {cv.id}")

        # Paso 5: Analizar con Claude
        logger.info("📍 Paso 5: Analizando CV con Claude API...")
        try:
            analysis_result = analyze_cv_with_claude(filepath)
            logger.info(f"✅ Análisis completado")
            logger.info(f"   - Skills detectados: {analysis_result.get('skills', [])}")
            logger.info(f"   - Años de experiencia: {analysis_result.get('experience_years', 0)}")
            logger.info(f"   - Puestos previos: {analysis_result.get('job_titles', [])}")
            logger.info(f"   - ATS Score: {analysis_result.get('ats_score', 0)}")
        except Exception as claude_error:
            logger.error(f"❌ Error analizando con Claude: {str(claude_error)}")
            db.session.rollback()
            return jsonify({'error': f'CV analysis failed: {str(claude_error)}'}), 500

        # Paso 6: Actualizar CV con análisis
        logger.info("📍 Paso 6: Actualizando CV con análisis...")
        cv.analysis = analysis_result['analysis']
        cv.skills = analysis_result.get('skills', [])
        cv.experience_years = analysis_result.get('experience_years', 0)
        cv.job_titles = analysis_result.get('job_titles', [])
        cv.ats_score = analysis_result.get('ats_score', 0)
        cv.optimized = True
        cv.analyzed_at = db.func.now()

        db.session.commit()
        logger.info(f"✅ CV actualizado en BD")

        logger.info("=" * 60)
        logger.info("✅ CV UPLOAD COMPLETADO EXITOSAMENTE")
        logger.info("=" * 60)

        return jsonify({
            'success': True,
            'message': 'CV uploaded and analyzed successfully',
            'cv': cv.to_dict()
        }), 201

    except Exception as e:
        logger.error("=" * 60)
        logger.error(f"❌ ERROR EN CV UPLOAD: {str(e)}", exc_info=True)
        logger.error("=" * 60)
        db.session.rollback()
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@bp.route('/current', methods=['GET'])
@jwt_required()
def get_current_cv():
    """Obtiene el CV actual del usuario"""
    try:
        user_id = int(get_jwt_identity())
        cv = CV.query.filter_by(user_id=user_id).order_by(CV.uploaded_at.desc()).first()

        if not cv:
            return jsonify({'success': True, 'cv': None}), 200

        return jsonify({'success': True, 'cv': cv.to_dict()}), 200

    except Exception as e:
        logger.error(f"Get CV error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/<int:cv_id>', methods=['DELETE'])
@jwt_required()
def delete_cv(cv_id):
    """Elimina un CV"""
    try:
        user_id = int(get_jwt_identity())
        cv = CV.query.filter_by(id=cv_id, user_id=user_id).first()

        if not cv:
            return jsonify({'error': 'CV not found'}), 404

        # Eliminar archivo
        if os.path.exists(cv.file_path):
            os.remove(cv.file_path)

        db.session.delete(cv)
        db.session.commit()

        return jsonify({'success': True, 'message': 'CV deleted'}), 200

    except Exception as e:
        logger.error(f"Delete CV error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/update/<int:cv_id>', methods=['PUT'])
@jwt_required()
def update_cv(cv_id):
    """Actualiza campos editables del CV"""
    try:
        user_id = int(get_jwt_identity())
        cv = CV.query.filter_by(id=cv_id, user_id=user_id).first()

        if not cv:
            return jsonify({'error': 'CV not found'}), 404

        data = request.get_json()

        if 'summary' in data:
            cv.summary = data['summary']
        if 'skills' in data:
            cv.skills = data['skills']
        if 'experience' in data:
            cv.experience = data['experience']
        if 'education' in data:
            cv.education = data['education']
        if 'certifications' in data:
            cv.certifications = data['certifications']
        if 'experience_years' in data:
            cv.experience_years = data['experience_years']

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'CV updated successfully',
            'cv': cv.to_dict()
        }), 200

    except Exception as e:
        logger.error(f"Update CV error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500
