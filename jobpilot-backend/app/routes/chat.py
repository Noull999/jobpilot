from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services import chat_with_coach, get_chat_history, get_monthly_usage, extract_cv_text
from app.models import User, CV
import logging
from datetime import datetime
import tempfile
import os

bp = Blueprint('chat', __name__, url_prefix='/api/chat')
logger = logging.getLogger(__name__)

@bp.route('/send', methods=['POST'])
@jwt_required()
def send_message():
    """Envía mensaje al Coach IA, con soporte para archivos"""
    try:
        user_id = int(get_jwt_identity())

        # Manejo de multipart/form-data o JSON
        if request.form:
            message = request.form.get('message', '').strip()
            current_page = request.form.get('current_page')
            uploaded_file = request.files.get('file')
        else:
            data = request.get_json()
            message = data.get('message', '').strip()
            current_page = data.get('current_page')
            uploaded_file = None

        if not message:
            return jsonify({'error': 'Message is required'}), 400

        if len(message) > 5000:
            return jsonify({'error': 'Message too long'}), 400

        # Obtener usuario
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Validar límites según tier
        if user.tier == 'free':
            usage = get_monthly_usage(user_id)
            if usage['chats_used'] >= usage['chats_limit']:
                return jsonify({
                    'error': 'Free tier limit reached',
                    'message': f"You've used all {usage['chats_limit']} free chats this month. Upgrade to Pro for unlimited access."
                }), 429

        # Obtener contexto del CV si existe
        context = {}
        cv = CV.query.filter_by(user_id=user_id).order_by(CV.uploaded_at.desc()).first()
        if cv:
            context['cv_skills'] = cv.skills or []
            context['cv_experience'] = cv.experience_years or 0
            context['cv_jobs'] = cv.job_titles or []

        # Obtener página actual si fue enviada
        if current_page:
            context['current_page'] = current_page

        # Procesar archivo si fue proporcionado
        file_content = None
        if uploaded_file and uploaded_file.filename:
            try:
                # Crear archivo temporal
                suffix = os.path.splitext(uploaded_file.filename)[1]
                tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
                tmp_path = tmp_file.name
                tmp_file.close()

                uploaded_file.save(tmp_path)
                # Extraer texto del archivo
                file_content = extract_cv_text(tmp_path)

                try:
                    os.unlink(tmp_path)
                except:
                    pass

                if file_content:
                    context['uploaded_file_content'] = file_content
                    logger.info(f"File processed: {len(file_content)} chars extracted")
                else:
                    logger.warning(f"No content extracted from file: {uploaded_file.filename}")
            except Exception as e:
                logger.warning(f"Error processing uploaded file: {str(e)}", exc_info=True)

        # Llamar al servicio con contexto
        result = chat_with_coach(user_id, message, user.tier, context)

        return jsonify({
            'success': True,
            'response': result['response'],
            'tokens': result['tokens'],
            'cost': result['cost']
        }), 200

    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        error_msg = str(e)
        if 'credit balance' in error_msg.lower():
            return jsonify({
                'error': 'API credits exhausted',
                'message': 'The AI service needs credits. Please update the API key.'
            }), 402
        return jsonify({'error': 'Internal server error', 'details': error_msg}), 500

@bp.route('/history', methods=['GET'])
@jwt_required()
def get_history():
    """Obtiene historial de chats"""
    try:
        user_id = int(get_jwt_identity())
        limit = request.args.get('limit', 20, type=int)
        
        if limit > 100:
            limit = 100
        
        history = get_chat_history(user_id, limit)
        return jsonify({'success': True, 'history': history}), 200
        
    except Exception as e:
        logger.error(f"History error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/usage', methods=['GET'])
@jwt_required()
def get_usage():
    """Obtiene uso actual del usuario"""
    try:
        user_id = get_jwt_identity()
        usage = get_monthly_usage(user_id)
        
        return jsonify({
            'success': True,
            'usage': usage
        }), 200
        
    except Exception as e:
        logger.error(f"Usage error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/clear', methods=['DELETE'])
@jwt_required()
def clear_history():
    """Borra historial de chats"""
    try:
        from app import db
        from app.models import ChatHistory
        
        user_id = get_jwt_identity()
        ChatHistory.query.filter_by(user_id=user_id).delete()
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'History cleared'}), 200
        
    except Exception as e:
        logger.error(f"Clear error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500
