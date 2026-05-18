from flask import Blueprint, jsonify
import logging

bp = Blueprint('health', __name__, url_prefix='/api')
logger = logging.getLogger(__name__)

@bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        from app import db
        # Verificar conexión a base de datos
        db.session.execute('SELECT 1')
        
        return jsonify({
            'status': 'healthy',
            'service': 'JobPilot Backend',
            'version': '1.0.0'
        }), 200
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500

@bp.route('/version', methods=['GET'])
def version():
    """Get API version"""
    return jsonify({
        'version': '1.0.0',
        'api': 'JobPilot AI Backend'
    }), 200
