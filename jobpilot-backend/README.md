# JobPilot AI - Backend

Backend de la plataforma JobPilot AI - Coach de IA para búsqueda de empleo en Chile.

## Tech Stack

- **Framework:** Flask 3.0
- **Database:** PostgreSQL
- **Authentication:** JWT
- **IA:** Claude API (Anthropic)
- **Payments:** Stripe
- **Deploy:** Gunicorn + Docker

## Instalación Local

### 1. Clonar repositorio

```bash
git clone https://github.com/tuuser/jobpilot-ai-backend.git
cd jobpilot-ai-backend
```

### 2. Crear virtual environment

```bash
python3 -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

### 3. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 4. Configurar variables de ambiente

```bash
cp .env.example .env
# Editar .env con tus claves
```

### 5. Crear base de datos (Supabase o PostgreSQL local)

```sql
-- Si usas PostgreSQL local:
createdb jobpilot
```

### 6. Inicializar base de datos

```bash
python -c "from app import create_app; app = create_app(); app.app_context().push()"
```

### 7. Correr servidor

```bash
python run.py
```

El servidor estará disponible en `http://localhost:5000`

## API Endpoints

### Autenticación

- `POST /api/auth/signup` - Crear cuenta
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token

### Chat IA

- `POST /api/chat/send` - Enviar mensaje al Coach
- `GET /api/chat/history` - Obtener historial
- `GET /api/chat/usage` - Ver uso mensual
- `DELETE /api/chat/clear` - Limpiar historial

### Usuario

- `GET /api/user/profile` - Obtener perfil
- `PUT /api/user/profile` - Actualizar perfil
- `GET /api/user/stats` - Estadísticas

### Suscripción

- `GET /api/subscription/status` - Estado suscripción
- `POST /api/subscription/upgrade` - Upgrade a Pro/Premium
- `POST /api/subscription/webhook` - Webhook Stripe

### Health

- `GET /api/health` - Health check
- `GET /api/version` - Versión API

## Variables de Ambiente

```
DATABASE_URL=postgresql://user:password@localhost:5432/jobpilot
FLASK_ENV=development
SECRET_KEY=tu-secret-key-aqui
CLAUDE_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:3000
```

## Deploy en Railway

1. Crear cuenta en Railway.app
2. Conectar repositorio GitHub
3. Agregar variables de ambiente
4. Esperar build automático
5. Acceder a URL generada

## Deploy en Render

1. Crear cuenta en Render.com
2. Conectar GitHub
3. Crear servicio Web
4. Agregar env vars
5. Deploy automático

## Estructura

```
jobpilot-backend/
├── app/
│   ├── __init__.py           # Inicializador Flask
│   ├── models.py             # DB models
│   ├── services/             # Servicios (Claude, Stripe)
│   ├── routes/               # Endpoints
│   └── utils/                # Utilidades
├── tests/                    # Tests
├── run.py                    # Entry point
├── requirements.txt
├── .env.example
└── Dockerfile
```

## Próximos Pasos

- [ ] Implementar tests (pytest)
- [ ] Agregar logging avanzado
- [ ] Cacheo con Redis
- [ ] Rate limiting
- [ ] Email notifications
- [ ] Dashboard admin

## Soporte

Para dudas o reportar bugs, contactar a: [email]

## Licencia

MIT License
