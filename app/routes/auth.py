from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token
from app.models import User, Subscription
from app import db
import bcrypt
import logging

bp = Blueprint('auth', __name__, url_prefix='/api/auth')
logger = logging.getLogger(__name__)

@bp.route('/signup', methods=['POST'])
def signup():
    """Crea nuevo usuario"""
    try:
        data = request.get_json()
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')
        name = data.get('name', '').strip()
        
        # Validaciones
        if not email or '@' not in email:
            return jsonify({'error': 'Valid email required'}), 400
        
        if not password or len(password) < 8:
            return jsonify({'error': 'Password must be at least 8 characters'}), 400
        
        # Verificar si existe
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already exists'}), 409
        
        # Crear usuario
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        user = User(
            email=email,
            password_hash=password_hash,
            name=name if name else email.split('@')[0],
            tier='free'
        )
        db.session.add(user)
        db.session.flush()
        
        # Crear subscripción free
        subscription = Subscription(
            user_id=user.id,
            tier='free',
            status='active'
        )
        db.session.add(subscription)
        db.session.commit()
        
        # Generar tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        
        return jsonify({
            'success': True,
            'message': 'Account created successfully',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        logger.error(f"Signup error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/login', methods=['POST'])
def login():
    """Login de usuario"""
    try:
        data = request.get_json()
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400
        
        user = User.query.filter_by(email=email).first()
        
        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Verificar password
        if not bcrypt.checkpw(password.encode('utf-8'), user.password_hash):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Generar tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/refresh', methods=['POST'])
def refresh():
    """Refresh access token"""
    try:
        from flask_jwt_extended import jwt_required, get_jwt_identity
        
        @jwt_required(refresh=True)
        def _refresh():
            user_id = get_jwt_identity()
            access_token = create_access_token(identity=user_id)
            return jsonify({'access_token': access_token}), 200
        
        return _refresh()
    except Exception as e:
        logger.error(f"Refresh error: {str(e)}")
        return jsonify({'error': 'Refresh failed'}), 401
