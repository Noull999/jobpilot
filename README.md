# JobPilot AI — Backend

Coach de carrera con IA para el mercado laboral chileno: chat conversacional con contexto persistente, comandos especializados (salarios, CV, entrevistas, negociación) y suscripciones pagas vía Stripe. API REST en Flask, lista para producción con Docker + Gunicorn.

![Python](https://img.shields.io/badge/Python-3.10-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.0-000000?logo=flask&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-SQLAlchemy-4169E1?logo=postgresql&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white)
![Stripe](https://img.shields.io/badge/Payments-Stripe-635BFF?logo=stripe&logoColor=white)
![Claude API](https://img.shields.io/badge/AI-Claude%20API-D97757?logo=anthropic&logoColor=white)
![Docker](https://img.shields.io/badge/Deploy-Docker%20%2B%20Gunicorn-2496ED?logo=docker&logoColor=white)

## Qué hace

Backend de una plataforma que conecta a un usuario con un coach de carrera impulsado por Claude (Anthropic). El asistente está acotado por system prompt a temas laborales y responde con datos concretos del mercado chileno (rangos salariales, empresas que contratan, portales de empleo), además de reconocer comandos como `/salario`, `/cv-tips`, `/entrevista` o `/negociar-salario` dentro de la conversación.

## Features implementadas

- **Chat con IA con memoria de contexto** — cada mensaje se envía a Claude junto con los últimos 10 turnos de historial del usuario, para mantener conversaciones coherentes.
- **Coach acotado por dominio** — system prompt que restringe las respuestas a empleo/CV/entrevistas/salarios y rechaza temas fuera de scope.
- **Autenticación JWT completa** — signup con hash bcrypt, login, refresh tokens.
- **Control de uso por tier** — usuarios free limitados a 5 chats/mes, tracking de tokens y costo real por conversación (basado en `usage` que devuelve la API de Claude).
- **Suscripciones y pagos con Stripe** — creación de Stripe Customer, Checkout Session para upgrade a Pro/Premium, y webhook que sincroniza el estado de la suscripción (activación y cancelación) con la base de datos.
- **Perfil y estadísticas de usuario** — historial de chats, tokens consumidos y costo acumulado por usuario.
- **Health check con verificación de DB** — endpoint de monitoreo que valida conexión real a PostgreSQL.

> Nota: la simulación de entrevistas y los tips de CV se resuelven **dentro del chat** vía comandos del system prompt (no hay parsing de archivos de CV ni un flujo de entrevista simulada separado).

## Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Flask 3.0 + Flask-CORS |
| Base de datos | PostgreSQL vía Flask-SQLAlchemy |
| Auth | Flask-JWT-Extended + bcrypt |
| IA | Claude API (`anthropic` SDK, modelo `claude-sonnet-4`) |
| Pagos | Stripe (Checkout + Webhooks) |
| Servidor | Gunicorn (4 workers) |
| Deploy | Docker |

## Endpoints

**Auth** — `POST /api/auth/signup` · `POST /api/auth/login` · `POST /api/auth/refresh`

**Chat** — `POST /api/chat/send` · `GET /api/chat/history` · `GET /api/chat/usage` · `DELETE /api/chat/clear`

**Usuario** — `GET/PUT /api/user/profile` · `GET /api/user/stats`

**Suscripción** — `GET /api/subscription/status` · `POST /api/subscription/upgrade` · `POST /api/subscription/webhook`

**Salud** — `GET /api/health` · `GET /api/version`

## Correr en local

```bash
git clone https://github.com/Noull999/jobpilot.git
cd jobpilot

python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

pip install -r requirements.txt
cp .env.example .env      # completar con tus claves (DB, Claude, Stripe)

python run.py             # http://localhost:5000
```

### Con Docker

```bash
docker build -t jobpilot-backend .
docker run -p 5000:5000 --env-file .env jobpilot-backend
```

## Variables de ambiente

```
DATABASE_URL=postgresql://user:password@host:5432/jobpilot
CLAUDE_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
FLASK_ENV=development
SECRET_KEY=...
JWT_SECRET_KEY=...
CORS_ORIGINS=http://localhost:3000
PORT=5000
```

## Estructura

```
jobpilot/
├── app/
│   ├── __init__.py       # factory Flask, extensiones, blueprints
│   ├── models.py         # User, ChatHistory, Subscription, UsageLimit
│   ├── routes/            # auth, chat, subscription, user, health
│   └── services/          # integración Claude API + lógica de negocio
├── run.py                 # entry point
├── requirements.txt
├── Dockerfile
└── .env.example
```

## Autor

Jose Esteban Asencio — desarrollador full-stack.

## Licencia

MIT
