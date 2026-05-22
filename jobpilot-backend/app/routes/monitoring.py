from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from app.services.monitoring import get_monitor
import logging

bp = Blueprint('monitoring', __name__, url_prefix='/api/monitoring')
logger = logging.getLogger(__name__)

@bp.route('/status', methods=['GET'])
@jwt_required()
def get_monitoring_status():
    """Get monitoring and security status (admin only)"""
    try:
        monitor = get_monitor()
        status = monitor.get_status()

        return jsonify({
            'success': True,
            'monitoring': status
        }), 200

    except Exception as e:
        logger.error(f"Monitoring status error: {str(e)}")
        return jsonify({'error': 'Error getting monitoring status'}), 500

@bp.route('/alerts', methods=['GET'])
@jwt_required()
def get_alerts():
    """Get recent security alerts (admin only)"""
    try:
        monitor = get_monitor()
        alerts = monitor.get_alerts(limit=20)

        return jsonify({
            'success': True,
            'alerts': alerts,
            'count': len(alerts)
        }), 200

    except Exception as e:
        logger.error(f"Get alerts error: {str(e)}")
        return jsonify({'error': 'Error getting alerts'}), 500
