from app import db
from datetime import datetime
import json

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255))
    tier = db.Column(db.String(50), default='free')  # free, pro, premium
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
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
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
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
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    ends_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
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
    reset_date = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
