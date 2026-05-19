from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Subscription
from app import db
import logging

bp = Blueprint('user', __name__, url_prefix='/api/user')
logger = logging.getLogger(__name__)

@bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Obtiene perfil del usuario"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        subscription = Subscription.query.filter_by(user_id=user_id).first()
        
        return jsonify({
            'success': True,
            'user': user.to_dict(),
            'subscription': subscription.to_dict() if subscription else None
        }), 200
        
    except Exception as e:
        logger.error(f"Get profile error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Actualiza perfil del usuario"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        # Actualizar campos permitidos
        if 'name' in data:
            user.name = data['name'].strip()
        
        # No permitir cambiar email o tier directamente
        if 'email' in data or 'tier' in data:
            return jsonify({'error': 'Cannot modify email or tier directly'}), 400
        
        user.updated_at = db.func.now()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Profile updated',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Update profile error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    """Obtiene estadísticas del usuario"""
    try:
        from app.models import ChatHistory
        from sqlalchemy import func
        
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Contar chats
        total_chats = ChatHistory.query.filter_by(user_id=user_id).count()
        
        # Calcular costo total
        total_cost = db.session.query(func.sum(ChatHistory.cost_usd))\
            .filter_by(user_id=user_id).scalar() or 0
        
        # Tokens totales
        total_tokens = db.session.query(func.sum(ChatHistory.tokens_used))\
            .filter_by(user_id=user_id).scalar() or 0
        
        return jsonify({
            'success': True,
            'stats': {
                'total_chats': total_chats,
                'total_cost': float(total_cost),
                'total_tokens': total_tokens,
                'member_since': user.created_at.isoformat()
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Get stats error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500
