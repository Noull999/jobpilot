from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
import os
import logging
from dotenv import load_dotenv

load_dotenv()

db = SQLAlchemy()
jwt = JWTManager()
logger = logging.getLogger(__name__)

# Import email service for initialization
from app.services.email_service import init_email

def create_app():
    app = Flask(__name__)
    CORS(app)
    
    # Configuración
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    app.config['JWT_SECRET_KEY'] = os.getenv('SECRET_KEY')

    # JWT Token expiration times
    from datetime import timedelta
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(minutes=15)
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
    
    # Inicializar extensiones
    db.init_app(app)
    jwt.init_app(app)
    init_email(app)

    # Registrar blueprints
    from app.routes import auth, chat, subscription, user, health, cv, jobs, notifications
    app.register_blueprint(auth.bp)
    app.register_blueprint(chat.bp)
    app.register_blueprint(subscription.bp)
    app.register_blueprint(user.bp)
    app.register_blueprint(health.bp)
    app.register_blueprint(cv.bp)
    app.register_blueprint(jobs.bp)
    app.register_blueprint(notifications.notifications_bp)
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return {'error': 'Not found'}, 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return {'error': 'Internal server error'}, 500
    
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
