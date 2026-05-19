# 🏗️ ARQUITECTURA BACKEND - JobPilot AI

## STACK TECNOLÓGICO

```
Frontend:       React + Tailwind CSS (Vercel)
Backend:        Python 3.10+ (Flask/FastAPI)
Database:       PostgreSQL (Supabase o Render)
Auth:           JWT + bcrypt
Payments:       Stripe API
IA:             Claude API (Anthropic)
Cache:          Redis (para sesiones)
Deploy:         Railway o Render (backend)
```

---

## ESTRUCTURA DE CARPETAS

```
jobpilot-backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # Entry point
│   ├── config.py               # Variables de ambiente
│   ├── models.py               # DB models (User, Subscription, Chat)
│   ├── database.py             # Conexión PostgreSQL
│   │
│   ├── routes/
│   │   ├── auth.py             # Login/Signup
│   │   ├── chat.py             # Coach IA endpoints
│   │   ├── subscription.py     # Stripe integration
│   │   ├── user.py             # Profile, settings
│   │   └── health.py           # Health check
│   │
│   ├── services/
│   │   ├── claude_service.py   # Claude API client
│   │   ├── stripe_service.py   # Stripe webhooks
│   │   ├── email_service.py    # Notificaciones
│   │   └── kb_service.py       # Knowledge base loader
│   │
│   └── utils/
│       ├── jwt_utils.py        # Token management
│       ├── validators.py       # Input validation
│       └── constants.py        # KB data, prompts
│
├── tests/
│   ├── test_auth.py
│   ├── test_chat.py
│   └── test_subscription.py
│
├── requirements.txt            # Dependencies
├── .env.example                # Template variables
├── .gitignore
├── Dockerfile                  # Para deploy
├── docker-compose.yml
└── README.md
```

---

## 1. DATABASE SCHEMA (PostgreSQL)

```sql
-- Tabla Users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  tier VARCHAR(50) DEFAULT 'free',  -- free, pro, premium
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla Subscriptions
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  tier VARCHAR(50),  -- free, pro, premium
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  status VARCHAR(50),  -- active, cancelled, expired
  started_at TIMESTAMP DEFAULT NOW(),
  ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla Chat History
CREATE TABLE chat_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  message_user TEXT,
  message_ai TEXT,
  tokens_used INTEGER,
  cost_usd DECIMAL(10,5),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla Limits (para tracking de free tier)
CREATE TABLE usage_limits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  chats_this_month INTEGER DEFAULT 0,
  reset_date TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 2. DEPENDENCIAS (requirements.txt)

```
Flask==3.0.0
Flask-CORS==4.0.0
Flask-SQLAlchemy==3.1.1
python-dotenv==1.0.0
anthropic==0.7.8
stripe==5.4.0
PyJWT==2.8.1
bcrypt==4.1.2
psycopg2-binary==2.9.9
redis==5.0.1
requests==2.31.0
pydantic==2.5.0
gunicorn==21.2.0
```

---

## 3. ARCHIVO PRINCIPAL (main.py)

```python
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuración
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

db = SQLAlchemy(app)

# Importar rutas
from routes import auth, chat, subscription, user, health

# Registrar blueprints
app.register_blueprint(auth.bp)
app.register_blueprint(chat.bp)
app.register_blueprint(subscription.bp)
app.register_blueprint(user.bp)
app.register_blueprint(health.bp)

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=os.getenv('FLASK_ENV') == 'development')
```

---

## 4. MODELOS (models.py)

```python
from app.database import db
from datetime import datetime

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255))
    tier = db.Column(db.String(50), default='free')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    chats = db.relationship('ChatHistory', backref='user', lazy=True)
    subscription = db.relationship('Subscription', backref='user', uselist=False)

class ChatHistory(db.Model):
    __tablename__ = 'chat_history'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message_user = db.Column(db.Text, nullable=False)
    message_ai = db.Column(db.Text, nullable=False)
    tokens_used = db.Column(db.Integer)
    cost_usd = db.Column(db.Numeric(10,5))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Subscription(db.Model):
    __tablename__ = 'subscriptions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    tier = db.Column(db.String(50))
    stripe_customer_id = db.Column(db.String(255))
    stripe_subscription_id = db.Column(db.String(255))
    status = db.Column(db.String(50), default='active')
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    ends_at = db.Column(db.DateTime)
```

---

## 5. SERVICIO CLAUDE (claude_service.py)

```python
import anthropic
import os
from app.models import ChatHistory, User
from app.database import db

client = anthropic.Anthropic(api_key=os.getenv('CLAUDE_API_KEY'))

SYSTEM_PROMPT = """Eres un Coach de Carrera IA especializado en búsqueda de empleo en Chile.
[... (el system prompt completo que ya creamos) ...]
"""

def chat_with_coach(user_id: int, message: str) -> dict:
    """Envía un mensaje al Coach IA y retorna respuesta + costos"""
    
    user = User.query.get(user_id)
    if not user:
        raise ValueError("Usuario no encontrado")
    
    try:
        # Obtener historial previo (últimos 5 chats para contexto)
        history = ChatHistory.query.filter_by(user_id=user_id)\
            .order_by(ChatHistory.created_at.desc())\
            .limit(5).all()
        
        # Construir messages array para Claude
        messages = []
        for chat in reversed(history):
            messages.append({
                "role": "user",
                "content": chat.message_user
            })
            messages.append({
                "role": "assistant",
                "content": chat.message_ai
            })
        
        # Agregar mensaje actual
        messages.append({
            "role": "user",
            "content": message
        })
        
        # Llamar a Claude API
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1200,
            system=SYSTEM_PROMPT,
            messages=messages
        )
        
        # Extraer respuesta
        ai_response = response.content[0].text
        
        # Calcular tokens usados
        input_tokens = response.usage.input_tokens
        output_tokens = response.usage.output_tokens
        total_tokens = input_tokens + output_tokens
        
        # Calcular costo
        cost = (input_tokens * 0.003 + output_tokens * 0.015) / 1000
        
        # Guardar en DB
        chat_record = ChatHistory(
            user_id=user_id,
            message_user=message,
            message_ai=ai_response,
            tokens_used=total_tokens,
            cost_usd=cost
        )
        db.session.add(chat_record)
        db.session.commit()
        
        return {
            "response": ai_response,
            "tokens": total_tokens,
            "cost": float(cost)
        }
        
    except anthropic.APIError as e:
        raise Exception(f"Claude API error: {str(e)}")

def get_chat_history(user_id: int, limit: int = 20) -> list:
    """Obtiene historial de chats del usuario"""
    chats = ChatHistory.query.filter_by(user_id=user_id)\
        .order_by(ChatHistory.created_at.desc())\
        .limit(limit).all()
    
    return [{
        "id": c.id,
        "message_user": c.message_user,
        "message_ai": c.message_ai,
        "created_at": c.created_at.isoformat(),
        "cost": float(c.cost_usd)
    } for c in chats]
```

---

## 6. RUTAS PRINCIPALES (routes/chat.py)

```python
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.claude_service import chat_with_coach, get_chat_history
from app.models import User
import logging

bp = Blueprint('chat', __name__, url_prefix='/api/chat')
logger = logging.getLogger(__name__)

@bp.route('/send', methods=['POST'])
@jwt_required()
def send_message():
    """Envía mensaje al Coach IA"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        message = data.get('message', '').strip()
        
        if not message:
            return jsonify({'error': 'Message is required'}), 400
        
        # Validar límites según tier
        user = User.query.get(user_id)
        if user.tier == 'free':
            # Verificar límite de 5 chats/mes
            monthly_count = ChatHistory.query.filter_by(user_id=user_id)\
                .filter(ChatHistory.created_at >= datetime(datetime.now().year, datetime.now().month, 1))\
                .count()
            
            if monthly_count >= 5:
                return jsonify({'error': 'Free tier limit reached'}), 429
        
        # Llamar al servicio
        result = chat_with_coach(user_id, message)
        
        return jsonify({
            'success': True,
            'response': result['response'],
            'tokens': result['tokens'],
            'cost': result['cost']
        }), 200
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/history', methods=['GET'])
@jwt_required()
def get_history():
    """Obtiene historial de chats"""
    user_id = get_jwt_identity()
    limit = request.args.get('limit', 20, type=int)
    
    history = get_chat_history(user_id, limit)
    return jsonify({'history': history}), 200

@bp.route('/clear', methods=['DELETE'])
@jwt_required()
def clear_history():
    """Borra historial de chats"""
    user_id = get_jwt_identity()
    ChatHistory.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    
    return jsonify({'success': True}), 200
```

---

## 7. RUTAS AUTH (routes/auth.py)

```python
from flask import Blueprint, request, jsonify
from app.models import User, Subscription
from app.database import db
import bcrypt
import jwt
import os
from datetime import datetime, timedelta

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route('/signup', methods=['POST'])
def signup():
    """Crea nuevo usuario"""
    data = request.get_json()
    email = data.get('email', '').lower().strip()
    password = data.get('password', '')
    name = data.get('name', '')
    
    # Validaciones
    if not email or not password or len(password) < 8:
        return jsonify({'error': 'Invalid email or password'}), 400
    
    # Verificar si existe
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already exists'}), 409
    
    # Crear usuario
    try:
        user = User(
            email=email,
            password_hash=bcrypt.hashpw(password.encode(), bcrypt.gensalt()),
            name=name,
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
        
        # Generar token
        token = jwt.encode(
            {'user_id': user.id, 'exp': datetime.utcnow() + timedelta(days=30)},
            os.getenv('SECRET_KEY'),
            algorithm='HS256'
        )
        
        return jsonify({
            'success': True,
            'token': token,
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'tier': user.tier
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/login', methods=['POST'])
def login():
    """Login de usuario"""
    data = request.get_json()
    email = data.get('email', '').lower()
    password = data.get('password', '')
    
    user = User.query.filter_by(email=email).first()
    
    if not user or not bcrypt.checkpw(password.encode(), user.password_hash):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    token = jwt.encode(
        {'user_id': user.id, 'exp': datetime.utcnow() + timedelta(days=30)},
        os.getenv('SECRET_KEY'),
        algorithm='HS256'
    )
    
    return jsonify({
        'success': True,
        'token': token,
        'user': {
            'id': user.id,
            'email': user.email,
            'tier': user.tier
        }
    }), 200
```

---

## 8. VARIABLES DE AMBIENTE (.env)

```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/jobpilot

# Flask
FLASK_ENV=development
SECRET_KEY=tu-secret-key-aqui

# Claude API
CLAUDE_API_KEY=sk-ant-...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...

# Redis (opcional para sesiones)
REDIS_URL=redis://localhost:6379

# Frontend
FRONTEND_URL=http://localhost:3000
```

---

## 9. DEPLOY (Dockerfile)

```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app.main:app"]
```

---

## 10. ENDPOINTS RESUMEN

```
# Auth
POST   /api/auth/signup          → Crear usuario
POST   /api/auth/login           → Login

# Chat
POST   /api/chat/send            → Enviar mensaje
GET    /api/chat/history         → Historial
DELETE /api/chat/clear           → Borrar historial

# Subscription
POST   /api/subscription/upgrade → Upgrade a Pro
POST   /api/subscription/webhook → Stripe webhook
GET    /api/subscription/status  → Estado suscripción

# User
GET    /api/user/profile         → Perfil usuario
PUT    /api/user/profile         → Actualizar perfil
GET    /api/user/usage           → Uso tokens/mes

# Health
GET    /api/health               → Health check
```

---

## 🚀 PRÓXIMOS PASOS

1. Crear el repo en GitHub
2. Configurar DB (Supabase gratis)
3. Implementar cada ruta
4. Testing local
5. Deploy en Railway/Render
6. Integrar con Stripe
7. Deploy frontend + backend

¿Creamos el repo ahora?
