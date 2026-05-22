from flask import Blueprint, request, jsonify, make_response
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_jwt
from app.models import User, Subscription, TokenBlacklist, EmailVerificationToken
from app import db, limiter, csrf
from app.schemas import UserSignup, UserLogin
from app.services.email_verification_service import generate_verification_token, send_verification_email, verify_token
from app.services.monitoring import get_monitor
from pydantic import ValidationError
import bcrypt
import logging
import os

bp = Blueprint('auth', __name__, url_prefix='/api/auth')
logger = logging.getLogger(__name__)

FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')

def get_client_ip():
    """Get client IP address from request"""
    return request.headers.get('X-Forwarded-For', request.remote_addr).split(',')[0].strip()

@bp.route('/signup', methods=['POST'])
@limiter.limit("5 per hour")
@csrf.exempt
def signup():
    """Crea nuevo usuario con verificación de email"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'JSON body required'}), 400

        # Validar con Pydantic
        signup_data = UserSignup(**data)
        email = signup_data.email.lower()

        # Verificar si existe (sin enumerar usuarios)
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Credenciales inválidas'}), 400

        # Crear usuario con password hasheado
        password_hash = bcrypt.hashpw(signup_data.password.encode('utf-8'), bcrypt.gensalt(rounds=12))

        user = User(
            email=email,
            password_hash=password_hash,
            name=signup_data.name,
            tier='free',
            email_verified=False
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

        # Generar token de verificación de email
        verification_token = generate_verification_token(user.id)
        email_sent = send_verification_email(email, signup_data.name, verification_token, FRONTEND_URL)

        if not email_sent:
            logger.warning(f"Could not send verification email to {email}, but account created")

        logger.info(f"User signup: user_id={user.id} - email verification pending")
        return jsonify({
            'success': True,
            'message': 'Cuenta creada. Verifica tu email para completar el registro',
            'email_verification_required': True
        }), 201

    except ValidationError as e:
        errors = {field['loc'][0]: field['msg'] for field in e.errors()}
        return jsonify({'error': 'Validación fallida', 'details': errors}), 400
    except Exception as e:
        logger.error(f"Signup error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500

@bp.route('/login', methods=['POST'])
@limiter.limit("10 per hour")
@csrf.exempt
def login():
    """Login de usuario con validación y verificación de email"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'JSON body required'}), 400

        login_data = UserLogin(**data)
        email = login_data.email.lower()

        user = User.query.filter_by(email=email).first()

        if not user:
            ip = get_client_ip()
            monitor = get_monitor()
            monitor.log_failed_login(ip)
            logger.warning("Login attempt failed: user not found")
            return jsonify({'error': 'Credenciales inválidas'}), 401

        # Verificar password
        if not bcrypt.checkpw(login_data.password.encode('utf-8'), user.password_hash):
            ip = get_client_ip()
            monitor = get_monitor()
            monitor.log_failed_login(ip)
            logger.warning("Login attempt failed: invalid password")
            return jsonify({'error': 'Credenciales inválidas'}), 401

        # Verificar que el email está verificado
        if not user.email_verified:
            logger.warning(f"Login attempt with unverified email for user_id={user.id}")
            return jsonify({
                'error': 'Email no verificado',
                'message': 'Por favor verifica tu email antes de iniciar sesión'
            }), 403

        # Generar tokens
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))

        # Crear respuesta con tokens en cookies httpOnly
        response = make_response(jsonify({
            'success': True,
            'message': 'Login exitoso',
            'user': user.to_dict()
        }), 200)

        # Guardar tokens en httpOnly cookies
        response.set_cookie(
            'access_token',
            access_token,
            httponly=True,
            secure=True,
            samesite='Lax',
            max_age=15*60  # 15 minutos
        )
        response.set_cookie(
            'refresh_token',
            refresh_token,
            httponly=True,
            secure=True,
            samesite='Lax',
            max_age=7*24*60*60  # 7 días
        )

        logger.info(f"User login: user_id={user.id}")
        return response

    except ValidationError as e:
        errors = {field['loc'][0]: field['msg'] for field in e.errors()}
        return jsonify({'error': 'Validación fallida', 'details': errors}), 400
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@bp.route('/refresh', methods=['POST'])
@limiter.limit("30 per hour")
@jwt_required(refresh=True)
def refresh():
    """Refrescar access token usando refresh token"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))

        if not user:
            logger.warning(f"Refresh attempt for non-existent user: {user_id}")
            return jsonify({'error': 'Usuario no encontrado'}), 404

        access_token = create_access_token(identity=str(user.id))
        return jsonify({
            'success': True,
            'access_token': access_token
        }), 200
    except Exception as e:
        logger.error(f"Refresh error: {str(e)}")
        return jsonify({'error': 'Error al refrescar token'}), 401

@bp.route('/verify-email', methods=['POST'])
@limiter.limit("10 per hour")
@csrf.exempt
def verify_email():
    """Verifica el email del usuario usando token"""
    try:
        data = request.get_json()
        if not data or 'token' not in data:
            return jsonify({'error': 'Token required'}), 400

        token = data.get('token', '').strip()
        user_id, error = verify_token(token)

        if error:
            return jsonify({'error': error}), 400

        # Marcar email como verificado
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404

        user.email_verified = True
        db.session.commit()

        logger.info(f"Email verified for user_id={user_id}")
        return jsonify({
            'success': True,
            'message': 'Email verificado exitosamente. Ahora puedes iniciar sesión'
        }), 200

    except Exception as e:
        logger.error(f"Email verification error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Error al verificar email'}), 500

@bp.route('/resend-verification-email', methods=['POST'])
@limiter.limit("3 per hour")
@csrf.exempt
def resend_verification_email():
    """Reenvía el email de verificación"""
    try:
        data = request.get_json()
        if not data or 'email' not in data:
            return jsonify({'error': 'Email required'}), 400

        email = data.get('email', '').lower().strip()
        user = User.query.filter_by(email=email).first()

        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404

        if user.email_verified:
            return jsonify({'error': 'El email ya está verificado'}), 400

        # Generar nuevo token de verificación
        verification_token = generate_verification_token(user.id)
        email_sent = send_verification_email(email, user.name, verification_token, FRONTEND_URL)

        if not email_sent:
            return jsonify({'error': 'No se pudo enviar el email'}), 500

        logger.info(f"Verification email resent to user_id={user.id}")
        return jsonify({
            'success': True,
            'message': 'Email de verificación reenviado. Revisa tu bandeja de entrada'
        }), 200

    except Exception as e:
        logger.error(f"Resend verification email error: {str(e)}")
        return jsonify({'error': 'Error al reenviar email'}), 500

@bp.route('/logout', methods=['POST'])
@jwt_required()
@limiter.limit("20 per hour")
def logout():
    """Revoca el access token actual (logout)"""
    try:
        jti = get_jwt()['jti']
        token_blacklist = TokenBlacklist(jti=jti)
        db.session.add(token_blacklist)
        db.session.commit()

        # Limpiar cookies
        response = make_response(jsonify({
            'success': True,
            'message': 'Logout exitoso'
        }), 200)

        response.set_cookie('access_token', '', httponly=True, expires=0)
        response.set_cookie('refresh_token', '', httponly=True, expires=0)

        logger.info(f"User {get_jwt_identity()} logged out")
        return response
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Error al hacer logout'}), 500
