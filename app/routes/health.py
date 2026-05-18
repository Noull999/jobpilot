from flask import Blueprint, jsonify
import logging
from sqlalchemy import text

bp = Blueprint('health', __name__, url_prefix='/api')
logger = logging.getLogger(__name__)

@bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    db_status = 'disconnected'
    try:
        from app import db
        db.session.execute(text('SELECT 1'))
        db_status = 'connected'
    except Exception as e:
        logger.warning(f"Database connection unavailable: {str(e)}")

    return jsonify({
        'status': 'healthy',
        'service': 'JobPilot Backend',
        'version': '1.0.0',
        'database': db_status
    }), 200

@bp.route('/version', methods=['GET'])
def version():
    """Get API version"""
    return jsonify({
        'version': '1.0.0',
        'api': 'JobPilot AI Backend'
    }), 200
