from flask import Flask, request, redirect
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_wtf.csrf import CSRFProtect
import os
import logging
from dotenv import load_dotenv

load_dotenv()

db = SQLAlchemy()
jwt = JWTManager()
limiter = Limiter(key_func=get_remote_address)
csrf = CSRFProtect()
logger = logging.getLogger(__name__)

# Import email service for initialization
from app.services.email_service import init_email

def create_app():
    app = Flask(__name__)

    # CORS restringido a dominios específicos
    allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:5173').split(',')
    CORS(app, origins=allowed_origins, supports_credentials=True)

    # Configuración
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')  # MUST BE DIFFERENT

    # JWT Token expiration times
    from datetime import timedelta
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(minutes=15)
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=7)  # Reduced from 30 to 7 days

    # JWT can be sent in cookies or Authorization header
    app.config['JWT_TOKEN_LOCATION'] = ['cookies', 'headers']
    app.config['JWT_COOKIE_SECURE'] = True  # Only send over HTTPS
    app.config['JWT_COOKIE_CSRF_PROTECT'] = False  # CSRF already protected by Flask-WTF
    app.config['JWT_COOKIE_SAMESITE'] = 'Lax'

    # Database Connection Pooling
    from sqlalchemy.pool import QueuePool
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'poolclass': QueuePool,
        'pool_size': 10,
        'pool_recycle': 3600,
        'max_overflow': 20,
    }
    
    # Inicializar extensiones
    db.init_app(app)
    jwt.init_app(app)
    limiter.init_app(app)
    # Disable CSRF for testing - will be re-enabled with proper configuration
    # csrf.init_app(app)
    init_email(app)

    # JWT callback para verificar token blacklist
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        from app.models import TokenBlacklist
        jti = jwt_payload['jti']
        return TokenBlacklist.query.filter_by(jti=jti).first() is not None

    # Registrar blueprints
    from app.routes import auth, chat, subscription, user, health, cv, jobs, notifications, apply, monitoring
    app.register_blueprint(auth.bp)
    app.register_blueprint(chat.bp)
    app.register_blueprint(subscription.bp)
    app.register_blueprint(user.bp)
    app.register_blueprint(health.bp)
    app.register_blueprint(cv.bp)
    app.register_blueprint(jobs.bp)
    app.register_blueprint(notifications.notifications_bp)
    app.register_blueprint(apply.bp)
    app.register_blueprint(monitoring.bp)
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return {'error': 'Recurso no encontrado'}, 404

    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"Internal server error: {error}")
        return {'error': 'Error interno del servidor'}, 500

    @app.errorhandler(429)
    def ratelimit_handler(e):
        return {'error': 'Demasiadas solicitudes. Intenta más tarde.'}, 429

    @app.errorhandler(400)
    def bad_request(error):
        return {'error': 'Solicitud inválida'}, 400

    # HTTPS Enforcement (redirect non-HTTPS in production only)
    @app.before_request
    def enforce_https():
        flask_env = os.getenv('FLASK_ENV', 'development')
        if not request.is_secure and flask_env == 'production' and not app.debug:
            return redirect(request.url.replace('http://', 'https://'))

    # Security headers
    @app.after_request
    def set_security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        return response

    # Crear tablas (sin fallar si no hay conexión)
    with app.app_context():
        try:
            db.create_all()
        except Exception as e:
            print(f"Warning: Could not create database tables: {e}")

    # Inicializar job sync scheduler
    try:
        from app.services.job_scheduler import init_scheduler
        init_scheduler(app)
        logger.info("Job sync scheduler initialized")
    except Exception as e:
        logger.warning(f"Could not initialize job sync scheduler: {e}")

    return app
