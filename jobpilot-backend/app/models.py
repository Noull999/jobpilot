from app import db
from datetime import datetime, timezone
import json

def utc_now():
    return datetime.now(timezone.utc)

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255))
    tier = db.Column(db.String(50), default='free')  # free, pro, premium
    email_verified = db.Column(db.Boolean, default=False, index=True)
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
    
    # Relaciones
    chats = db.relationship('ChatHistory', backref='user', lazy=True, cascade='all, delete-orphan')
    subscription = db.relationship('Subscription', backref='user', uselist=False, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'tier': self.tier,
            'created_at': self.created_at.isoformat()
        }

class ChatHistory(db.Model):
    __tablename__ = 'chat_history'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message_user = db.Column(db.Text, nullable=False)
    message_ai = db.Column(db.Text, nullable=False)
    tokens_used = db.Column(db.Integer)
    cost_usd = db.Column(db.Numeric(10, 5))
    created_at = db.Column(db.DateTime, default=utc_now, index=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'message_user': self.message_user,
            'message_ai': self.message_ai,
            'tokens': self.tokens_used,
            'cost': float(self.cost_usd) if self.cost_usd else 0,
            'created_at': self.created_at.isoformat()
        }

class Subscription(db.Model):
    __tablename__ = 'subscriptions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    tier = db.Column(db.String(50), default='free')  # free, pro, premium
    stripe_customer_id = db.Column(db.String(255))
    stripe_subscription_id = db.Column(db.String(255))
    status = db.Column(db.String(50), default='active')  # active, cancelled, expired
    started_at = db.Column(db.DateTime, default=utc_now)
    ends_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=utc_now)
    
    def to_dict(self):
        return {
            'id': self.id,
            'tier': self.tier,
            'status': self.status,
            'started_at': self.started_at.isoformat(),
            'ends_at': self.ends_at.isoformat() if self.ends_at else None
        }

class UsageLimit(db.Model):
    __tablename__ = 'usage_limits'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    chats_this_month = db.Column(db.Integer, default=0)
    reset_date = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)

class CV(db.Model):
    __tablename__ = 'cvs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer)
    analysis = db.Column(db.JSON)  # Análisis extraído por Claude
    skills = db.Column(db.JSON)  # Lista de skills detectadas
    experience_years = db.Column(db.Integer)
    job_titles = db.Column(db.JSON)  # Puestos previos
    ats_score = db.Column(db.Float)  # Score de compatibilidad ATS (0-100)
    optimized = db.Column(db.Boolean, default=False)
    uploaded_at = db.Column(db.DateTime, default=utc_now)
    analyzed_at = db.Column(db.DateTime)

    # Campos editables estructurados
    summary = db.Column(db.Text)  # Resumen profesional
    experience = db.Column(db.JSON)  # [{position, company, start_date, end_date, description}]
    education = db.Column(db.JSON)  # [{school, degree, field, graduation_year}]
    certifications = db.Column(db.JSON)  # [{title, issuer, issue_date, expiration_date}]
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)

    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'ats_score': self.ats_score,
            'optimized': self.optimized,
            'skills': self.skills or [],
            'experience_years': self.experience_years,
            'job_titles': self.job_titles or [],
            'summary': self.summary,
            'experience': self.experience or [],
            'education': self.education or [],
            'certifications': self.certifications or [],
            'uploaded_at': self.uploaded_at.isoformat(),
            'analyzed_at': self.analyzed_at.isoformat() if self.analyzed_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Job(db.Model):
    __tablename__ = 'jobs'

    id = db.Column(db.Integer, primary_key=True)
    external_id = db.Column(db.String(255), unique=True)  # ID from job portal
    title = db.Column(db.String(255), nullable=False, index=True)
    company = db.Column(db.String(255), nullable=False, index=True)
    location = db.Column(db.String(255), index=True)
    description = db.Column(db.Text)
    requirements = db.Column(db.JSON)  # Lista de skills requeridos
    salary_min = db.Column(db.Integer)
    salary_max = db.Column(db.Integer)
    job_type = db.Column(db.String(50), index=True)  # Full-time, Part-time, Contract
    posted_at = db.Column(db.DateTime)
    source = db.Column(db.String(100), index=True)  # computrabajo, linkedin, etc
    url = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=utc_now, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'company': self.company,
            'location': self.location,
            'description': self.description,
            'requirements': self.requirements or [],
            'salary_min': self.salary_min,
            'salary_max': self.salary_max,
            'job_type': self.job_type,
            'source': self.source,
            'url': self.url
        }

class Application(db.Model):
    __tablename__ = 'applications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    job_id = db.Column(db.Integer, db.ForeignKey('jobs.id'), nullable=False, index=True)
    cv_id = db.Column(db.Integer, db.ForeignKey('cvs.id'), nullable=False, index=True)
    status = db.Column(db.String(50), default='pending', index=True)  # pending, viewed, rejected, accepted
    cover_letter = db.Column(db.Text)
    applied_at = db.Column(db.DateTime, default=utc_now, index=True)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)

    # Relación para evitar N+1 queries
    job = db.relationship('Job', lazy='joined')

    def to_dict(self, include_job=True):
        """Evitar N+1 queries usando la relación lazy-loaded"""
        result = {
            'id': self.id,
            'user_id': self.user_id,
            'job_id': self.job_id,
            'cv_id': self.cv_id,
            'status': self.status,
            'cover_letter': self.cover_letter,
            'applied_at': self.applied_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }
        if include_job and self.job:
            result['job'] = self.job.to_dict()
        return result

class JobMatch(db.Model):
    __tablename__ = 'job_matches'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    job_id = db.Column(db.Integer, db.ForeignKey('jobs.id'), nullable=False, index=True)
    cv_id = db.Column(db.Integer, db.ForeignKey('cvs.id'), nullable=False, index=True)
    match_score = db.Column(db.Float, index=True)  # 0-100
    skills_matched = db.Column(db.JSON)
    skills_missing = db.Column(db.JSON)
    match_reason = db.Column(db.Text)  # Explicación del match
    created_at = db.Column(db.DateTime, default=utc_now, index=True)

    # Relación para evitar N+1 queries
    job = db.relationship('Job', lazy='joined')

    def to_dict(self, include_job=True):
        """Evitar N+1 queries usando la relación lazy-loaded"""
        result = {
            'id': self.id,
            'job_id': self.job_id,
            'match_score': self.match_score,
            'skills_matched': self.skills_matched or [],
            'skills_missing': self.skills_missing or [],
            'match_reason': self.match_reason
        }
        if include_job and self.job:
            result['job'] = self.job.to_dict()
        return result

class NotificationPreference(db.Model):
    __tablename__ = 'notification_preferences'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    email = db.Column(db.String(255), nullable=False)
    enabled = db.Column(db.Boolean, default=True)
    frequency = db.Column(db.String(50), default='daily')  # daily, weekly
    min_match_score = db.Column(db.Integer, default=70)  # Notificar solo si score >= 70%
    last_sent = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'enabled': self.enabled,
            'frequency': self.frequency,
            'min_match_score': self.min_match_score,
            'last_sent': self.last_sent.isoformat() if self.last_sent else None
        }

class TokenBlacklist(db.Model):
    __tablename__ = 'token_blacklist'

    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(36), unique=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=utc_now, index=True)

class EmailVerificationToken(db.Model):
    __tablename__ = 'email_verification_tokens'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    token = db.Column(db.String(255), unique=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=utc_now, index=True)
    expires_at = db.Column(db.DateTime, nullable=False)  # 24 horas

    user = db.relationship('User', backref='verification_tokens')
