# 🚀 Quick Start - JobPilot Backend

## Opción 1: Más Fácil (Recomendado para Windows)

### Simplemente haz doble-click en:
```
start-app.bat
```

✅ Se ejecutará automáticamente:
- Verificará Python
- Instalará dependencias si faltan
- Ejecutará diagnóstico completo
- Iniciará servidor en `http://localhost:5000`

---

## Opción 2: PowerShell (Windows)

```powershell
# Abre PowerShell en la carpeta del proyecto y ejecuta:
.\start-app.ps1
```

---

## Opción 3: Manual (Terminal)

```bash
# 1. Instalar dependencias (una sola vez)
pip install -r requirements.txt

# 2. Ejecutar diagnóstico
python diagnose.py

# 3. Iniciar servidor
python run.py
```

---

## ¿Qué verás cuando esté corriendo?

```
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://localhost:5000
 * Press CTRL+C to quit
```

✅ **El servidor está listo**

---

## Ahora Prueba Tu CV Upload

### En OTRA terminal (sin cerrar la primera):

#### 1️⃣ Crear cuenta
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test123"}'
```

**Copia el `access_token` de la respuesta**

---

#### 2️⃣ Enviar test de email
```bash
curl -X POST http://localhost:5000/api/notifications/test-email \
  -H "Authorization: Bearer <pega_aqui_tu_token>"
```

📧 Revisa tu email (carpeta spam si no lo ves)

---

#### 3️⃣ Subir tu CV (PDF pequeño)
```bash
curl -X POST http://localhost:5000/api/cv/upload \
  -H "Authorization: Bearer <tu_token>" \
  -F "file=@C:\Users\Lenovo\Desktop\tu-cv.pdf"
```

📄 Mira los logs en la terminal del servidor (Paso 1-6 detallado)

---

#### 4️⃣ Ver tu CV guardado
```bash
curl -X GET http://localhost:5000/api/cv/current \
  -H "Authorization: Bearer <tu_token>"
```

---

## 🐛 Si hay error en CV upload

**Mira el servidor (primera terminal):**
- ✅ Si ves "✅ CV UPLOAD COMPLETADO" → TODO BIEN
- ❌ Si ves "❌ ERROR EN CV UPLOAD" → El log te dice exactamente dónde falló

---

## 📋 Checklist de Configuración

Antes de ejecutar, verifica:

- [ ] Python 3.8+ instalado
- [ ] `.env` existe con:
  - `DATABASE_URL`
  - `CLAUDE_API_KEY`
  - `SECRET_KEY`
  - `MAIL_SERVER`
  - `MAIL_USERNAME`
  - `MAIL_PASSWORD`
- [ ] `requirements.txt` actualizado
- [ ] Carpeta `uploads/cvs` creada (se hace automática)

---

## 🚨 Troubleshooting

### "Port 5000 already in use"
```bash
# Encuentra qué está usando el puerto
netstat -ano | findstr :5000

# O usa otro puerto
python run.py --port 5001
```

### "CLAUDE_API_KEY invalid"
- Verifica que esté en `.env`
- Verifica que no tenga espacios
- Revisa que no esté expirada

### "Email not sent"
- Verifica `MAIL_SERVER`, `MAIL_USERNAME`, `MAIL_PASSWORD`
- Prueba credenciales en Gmail/SendGrid primero
- Revisa carpeta SPAM

---

## 📊 Estado de Servicios

Cuando ejecutes `diagnose.py` verás:

```
✅ Environment - Todas las variables configuradas
✅ Database - Conectado a SQLite
✅ Claude API - Funcionando
✅ Email Service - SMTP configurado
✅ Scheduler - Jobs programados
✅ Upload Folder - Listo para CVs
✅ API Routes - 20+ endpoints disponibles
```

---

## 🎯 Endpoints Principales

| Endpoint | Método | Propósito |
|----------|--------|-----------|
| `/api/auth/signup` | POST | Crear cuenta |
| `/api/auth/login` | POST | Loguear |
| `/api/cv/upload` | POST | Subir CV |
| `/api/cv/current` | GET | Ver CV actual |
| `/api/jobs` | GET | Listar trabajos |
| `/api/jobs/matches` | GET | Ver matches personalizados |
| `/api/notifications/subscribe` | POST | Subscribirse a digests |
| `/api/notifications/test-email` | POST | Probar email |
| `/api/notifications/preferences` | GET/PUT | Preferencias de notificaciones |

---

## 💡 Tips

1. **Mantén el servidor corriendo** en una terminal
2. **Usa otra terminal** para hacer curl/requests
3. **Mira los logs** cuando algo no funcione
4. **El diagnóstico es tu mejor amigo** - corre `python diagnose.py` antes de reportar bugs

---

## ✅ Success!

Cuando veas:
```
 * Running on http://localhost:5000
```

Y en otra terminal ejecutes:
```bash
curl http://localhost:5000/api/health
{"status": "OK"}
```

¡🎉 **Tu backend está completamente funcional!**

---

Próximos pasos:
1. Sube tu CV (PDF)
2. Subscribete a digests diarios
3. Espera a que llegue email con oportunidades
4. ¡Disfruta! 🚀
