# 🔒 Mejoras de Seguridad y Performance - JobPilot

## Resumen de Cambios

Se han implementado los siguientes cambios para resolver problemas **CRÍTICOS** e **IMPORTANTES**:

---

## ✅ CAMBIOS REALIZADOS

### 🛡️ Backend - Seguridad

#### 1. **CORS Restringido** (app/__init__.py)
**Antes:** Aceptaba cualquier origen
```python
CORS(app)  # ❌ Inseguro
```

**Ahora:** Solo dominios permitidos
```python
allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:5173').split(',')
CORS(app, origins=allowed_origins, supports_credentials=True)
```

#### 2. **Rate Limiting** (app/__init__.py)
**Implementado con Flask-Limiter:**
- `/api/auth/signup`: 5 por hora
- `/api/auth/login`: 10 por hora
- `/api/jobs/matches`: 30 por hora
- Previene ataques de fuerza bruta y DoS

#### 3. **Validación Pydantic** (app/schemas.py)
Nuevo archivo con esquemas de validación:
```python
class UserSignup(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=2, max_length=255)

    @field_validator('password')
    def validate_password(cls, v):
        # ✓ Mayúsculas, minúsculas, números, caracteres especiales
```

**Validaciones agregadas:**
- ✓ Email válido
- ✓ Contraseña con requisitos estrictos (8+ caracteres, mayúscula, minúscula, número, especial)
- ✓ Nombre entre 2-255 caracteres
- ✓ Parámetros de query validados

#### 4. **Password Hashing Mejorado** (auth.py)
```python
password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12))
```
Cambio de rounds: 10 → 12 (más seguro)

#### 5. **Error Handling Mejorado**
- Errores específicos por tipo (400, 401, 403, 404, 429, 500)
- Sin exposición de detalles internos
- Logging detallado para debugging

---

### 🚀 Backend - Performance

#### 6. **Índices en Base de Datos** (models.py)

**Agregados índices en:**
```python
Job:
  - title (búsquedas frecuentes)
  - company (búsquedas)
  - location (filtros)
  - job_type (filtros)
  - source (filtros)
  - created_at (ordenamiento)

Application:
  - user_id, job_id, cv_id (foreign keys)
  - status (filtros)

JobMatch:
  - user_id, job_id, cv_id (foreign keys)
  - match_score (ordenamiento)
```

#### 7. **Resolución de N+1 Queries**

**Antes:**
```python
def to_dict(self):
    job = Job.query.get(self.job_id)  # ❌ Query por cada row
    return {...}
```

**Ahora:**
```python
class Application(db.Model):
    job = db.relationship('Job', lazy='joined')  # ✓ Eager loading

def to_dict(self, include_job=True):
    # Job ya está cargado
```

#### 8. **Paginación en /api/jobs/matches**

**Antes:**
```python
jobs = Job.query.limit(100).all()  # ❌ Limit hardcoded
```

**Ahora:**
```python
JobMatchQuery(limit=10, offset=0)  # ✓ Validado, con defaults
.limit(query_params.limit)
.offset(query_params.offset)
.all()
```

---

### 🎨 Frontend - Error Handling

#### 9. **Error Boundary** (src/components/ErrorBoundary.jsx)
Captura errores no manejados en la aplicación:
```jsx
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

#### 10. **Interceptores Mejorados** (src/services/api.js)
**Manejo específico por código de error:**
- 401: Redirige a login
- 403: Acceso denegado
- 429: Rate limit
- 500+: Error servidor
- 400: Error solicitud

#### 11. **Custom Hook para State** (src/hooks/useDashboardState.js)
Organiza el estado complejo del Dashboard en un único lugar, mejorando:
- Mantenibilidad
- Reutilización
- Testing

---

## 🚀 CÓMO USAR

### Backend

1. **Instalar dependencias nuevas:**
```bash
cd jobpilot-backend
pip install -r requirements.txt
```

2. **Configurar variables de entorno:**
```bash
# Copiar .env.example a .env
cp .env.example .env

# Editar .env con los valores reales
# ALLOWED_ORIGINS: Agregar tus dominios
# SECRET_KEY: Generar uno seguro
# JWT_SECRET_KEY: Generar uno seguro
```

3. **Inicializar BD (se crean automáticamente):**
```bash
python run.py
```

### Frontend

1. **Instalar dependencias nuevas:**
```bash
cd jobpilot-frontend
npm install  # Las deps no cambiaron, pero se agregó ErrorBoundary
```

2. **Ya implementado en App.jsx:**
```jsx
import ErrorBoundary from './components/ErrorBoundary'
// Automáticamente envuelve la app
```

---

## 🔐 Cambios de Comportamiento

### Auth endpoints ahora retornan errores específicos:
```json
// Validación fallida
{
  "error": "Validación fallida",
  "details": {
    "password": "Password debe contener al menos un carácter especial"
  }
}
```

### Rate Limiting activo:
```json
// Demasiadas solicitudes
{
  "error": "Demasiadas solicitudes. Intenta más tarde."
}
```

### Paginación en /api/jobs/matches:
```json
{
  "success": true,
  "matches": [...],
  "total": 150,
  "limit": 10,
  "offset": 0
}
```

---

## 🧪 Testing recomendado

### Backend
```bash
# Probar rate limiting (5 requests en 1 hora a signup)
for i in {1..6}; do curl -X POST http://localhost:5000/api/auth/signup; done

# Probar validación Pydantic
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123","name":"a"}'

# Probar CORS
curl -H "Origin: http://evil.com" http://localhost:5000/api/jobs/matches
```

### Frontend
```bash
# ErrorBoundary activa automáticamente on error
# Rate limit error: "Demasiadas solicitudes. Intenta más tarde."
```

---

## 📋 Checklist de Deploy

- [ ] Actualizar ALLOWED_ORIGINS en producción
- [ ] Generar nuevos SECRET_KEY y JWT_SECRET_KEY
- [ ] Configurar DEBUG=False en .env
- [ ] Cambiar FLASK_ENV=production
- [ ] Verificar que las migraciones de BD se apliquen
- [ ] Probar endpoints con nuevas validaciones
- [ ] Verificar rate limiting no está bloqueando usuarios legítimos
- [ ] Monitorear logs de error

---

## ⚠️ Notas Importantes

1. **Migraciones de BD:** Los índices se crean automáticamente con `db.create_all()` en primera ejecución
2. **ALLOWED_ORIGINS:** Cambiar en .env para cada ambiente (dev, staging, production)
3. **Rate Limits:** Ajustar según necesidad en app/__init__.py
4. **Contraseñas:** Los usuarios nuevos deben cumplir requisitos estrictos
5. **Bcrypt Rounds:** Aumentar a 12 puede hacer auth más lento (0.5-1s), es normal

---

## 🔄 Próximos Pasos (No Realizados Aún)

- [ ] Refactorización completa de Dashboard.jsx
- [ ] Implementar React Query para caché
- [ ] Tests unitarios
- [ ] Tests E2E
- [ ] Logging centralizado (Sentry)
- [ ] CI/CD pipeline
- [ ] Lazy loading de rutas
- [ ] Skeleton loaders
- [ ] Mejoras de accesibilidad (WCAG AA)

