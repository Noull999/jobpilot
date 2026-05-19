"""Notification endpoints for email digest preferences"""
import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, NotificationPreference
from app.services.email_service import send_test_email

logger = logging.getLogger(__name__)

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')

@notifications_bp.route('/subscribe', methods=['POST'])
@jwt_required()
def subscribe_to_digest():
    """Subscribe user to email digest notifications"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json()

    # Validate input
    frequency = data.get('frequency', 'daily')
    if frequency not in ['daily', 'weekly']:
        return jsonify({'error': 'Invalid frequency. Must be daily or weekly'}), 400

    min_score = data.get('min_match_score', 70)
    if not (0 <= min_score <= 100):
        return jsonify({'error': 'min_match_score must be between 0-100'}), 400

    # Check if already subscribed
    pref = NotificationPreference.query.filter_by(user_id=user_id).first()

    if pref:
        # Update existing preference
        pref.frequency = frequency
        pref.min_match_score = min_score
        pref.enabled = True
    else:
        # Create new preference
        pref = NotificationPreference(
            user_id=user_id,
            email=user.email,
            frequency=frequency,
            min_match_score=min_score,
            enabled=True
        )
        db.session.add(pref)

    db.session.commit()

    return jsonify({
        'message': f'Subscribed to {frequency} digest notifications',
        'preference': pref.to_dict()
    }), 201

@notifications_bp.route('/unsubscribe', methods=['POST'])
@jwt_required()
def unsubscribe_from_digest():
    """Unsubscribe user from email digest notifications"""
    user_id = get_jwt_identity()

    pref = NotificationPreference.query.filter_by(user_id=user_id).first()

    if not pref:
        return jsonify({'error': 'User not subscribed'}), 404

    pref.enabled = False
    db.session.commit()

    return jsonify({'message': 'Unsubscribed from notifications'}), 200

@notifications_bp.route('/preferences', methods=['GET'])
@jwt_required()
def get_preferences():
    """Get user's notification preferences"""
    user_id = get_jwt_identity()

    pref = NotificationPreference.query.filter_by(user_id=user_id).first()

    if not pref:
        return jsonify({'message': 'Not subscribed'}), 404

    return jsonify({
        'preference': pref.to_dict()
    }), 200

@notifications_bp.route('/preferences', methods=['PUT'])
@jwt_required()
def update_preferences():
    """Update user's notification preferences"""
    user_id = get_jwt_identity()

    pref = NotificationPreference.query.filter_by(user_id=user_id).first()

    if not pref:
        return jsonify({'error': 'User not subscribed'}), 404

    data = request.get_json()

    # Update frequency if provided
    if 'frequency' in data:
        frequency = data['frequency']
        if frequency not in ['daily', 'weekly']:
            return jsonify({'error': 'Invalid frequency'}), 400
        pref.frequency = frequency

    # Update min_match_score if provided
    if 'min_match_score' in data:
        score = data['min_match_score']
        if not (0 <= score <= 100):
            return jsonify({'error': 'min_match_score must be 0-100'}), 400
        pref.min_match_score = score

    # Update enabled status if provided
    if 'enabled' in data:
        pref.enabled = bool(data['enabled'])

    db.session.commit()

    return jsonify({
        'message': 'Preferences updated',
        'preference': pref.to_dict()
    }), 200

@notifications_bp.route('/test-email', methods=['POST'])
@jwt_required()
def send_test():
    """Send a test email to verify configuration"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Check if email server is configured
    try:
        result = send_test_email(user.email)

        if result['success']:
            return jsonify({
                'message': f'Test email sent to {user.email}',
                'email': user.email
            }), 200
        else:
            return jsonify({
                'error': 'Failed to send test email',
                'details': result.get('error', 'Unknown error')
            }), 500

    except Exception as e:
        logger.error(f"Test email error: {str(e)}")
        return jsonify({
            'error': 'Email server not configured',
            'details': str(e)
        }), 500
