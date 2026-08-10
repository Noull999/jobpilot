# ApplyPilot + LiteLLM Setup Guide

Esta guía explica cómo configurar ApplyPilot con Claude como LLM principal y Gemini como fallback.

## 🎯 Arquitectura

```
Frontend (React)
    ↓
Flask Backend
    ↓
ApplyPilot Service
    ↓
LiteLLM Proxy (localhost:4000)
    ├─→ Claude (Anthropic API) - Primary
    └─→ Gemini (Google API) - Fallback
```

## 📋 Requisitos Previos

### 1. Instalar Dependencias

```bash
pip install -r requirements.txt
```

Esto instala:
- `applypilot>=0.3.0` - Job application automation
- `litellm>=1.0.0` - LLM proxy para múltiples APIs

### 2. Obtener API Keys

#### Claude (Anthropic)
1. Ir a https://console.anthropic.com/
2. Crear una API Key
3. Copiar en `.env`: `ANTHROPIC_API_KEY=sk-ant-...`

#### Gemini (Google)
1. Ir a https://aistudio.google.com/app/apikeys
2. Crear una API Key (gratis, sin tarjeta de crédito)
3. Copiar en `.env`: `GEMINI_API_KEY=...`

## 🔧 Configuración

### 1. Crear archivo `.env`

```bash
cp .env.example .env
```

Editar `.env` y agregar:

```env
# Anthropic API (Claude)
ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE

# Google Gemini API (Fallback)
GEMINI_API_KEY=your-gemini-api-key-here

# ApplyPilot Settings
APPLYPILOT_ENABLED=true
APPLYPILOT_PRIMARY_LLM=claude-opus      # Modelo principal
APPLYPILOT_FALLBACK_LLM=gemini          # Modelo fallback
LITELLM_PROXY_URL=http://localhost:4000 # URL del proxy
```

### 2. Verificar Configuración

```bash
python app/services/apply_service.py
```

O en Python:

```python
from app.services.apply_service import ApplyPilotService
service = ApplyPilotService()
print(service.check_applypilot_status())
```

## 🚀 Iniciar el Sistema

### Terminal 1: Iniciar LiteLLM Proxy

```bash
python scripts/start_litellm.py
```

Deberías ver:

```
✅ LiteLLM proxy started on http://localhost:4000
```

### Terminal 2: Iniciar Backend Flask

```bash
python run.py
```

O con gunicorn:

```bash
gunicorn -w 4 "app:create_app()"
```

## 📡 Endpoints Disponibles

### 1. Verificar Estado de ApplyPilot

```bash
GET /api/apply/status
Authorization: Bearer <token>

Response:
{
  "success": true,
  "status": {
    "enabled": true,
    "litellm_url": "http://localhost:4000",
    "primary_llm": "claude-opus",
    "fallback_llm": "gemini",
    "litellm_available": true,
    "anthropic_api_key": true,
    "gemini_api_key": true
  }
}
```

### 2. Preview Aplicación (sin aplicar)

```bash
POST /api/apply/preview
Authorization: Bearer <token>
Content-Type: application/json

{
  "job_id": 123
}

Response:
{
  "success": true,
  "job": {
    "id": 123,
    "title": "Senior Developer",
    "company": "TechCorp"
  },
  "preview": {
    "tailored_resume": "...",
    "cover_letter": "..."
  }
}
```

### 3. Aplicar a Job Matches Específicos

```bash
POST /api/apply/apply-to-matches
Authorization: Bearer <token>
Content-Type: application/json

{
  "match_ids": [1, 2, 3, 4, 5]
}

Response:
{
  "success": true,
  "results": {
    "total": 5,
    "successful": 4,
    "failed": 1,
    "applications": [
      {
        "match_id": 1,
        "job_id": 10,
        "job_title": "Developer",
        "company": "TechCorp",
        "status": "applied"
      },
      ...
    ]
  }
}
```

### 4. Batch Apply (automático)

```bash
POST /api/apply/batch-apply
Authorization: Bearer <token>
Content-Type: application/json

{
  "min_score": 80,      # Solo aplicar a matches con score >= 80
  "limit": 20           # Máximo 20 aplicaciones
}

Response:
{
  "success": true,
  "results": { ... }
}
```

## 🎛️ Lógica de Fallback

ApplyPilot intenta usar Claude primero. Si falla, automáticamente usa Gemini:

1. **Tailor Resume**
   - Intenta con Claude Opus
   - Si falla → intenta con Gemini

2. **Generate Cover Letter**
   - Intenta con Claude Opus
   - Si falla → intenta con Gemini

3. **Aplicación**
   - Si ambos fallan → registra error y continúa

## 💰 Costos Estimados

### Claude (Recomendado)
- Input: $0.003/1K tokens
- Output: $0.015/1K tokens
- **Costo por aplicación: ~$0.05-0.10**

### Gemini Free Tier
- 15 requests/minuto
- 1M tokens/día (gratis)
- **Ideal para fallback**

### Presupuesto Mensual (100 aplicaciones/mes)
- Claude: ~$5-10/mes
- Gemini: $0 (con límites)
- **Total: ~$5-10/mes**

## 🐛 Troubleshooting

### Error: "LiteLLM proxy not available"

```bash
# Verificar si el proxy está corriendo
curl http://localhost:4000/health

# Si no, iniciar en otra terminal
python scripts/start_litellm.py
```

### Error: "ANTHROPIC_API_KEY not found"

```bash
# Verificar .env
cat .env | grep ANTHROPIC_API_KEY

# Si está vacío, agregar la key
ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE
```

### Error: "LiteLLM request timeout"

- Aumentar timeout en `apply_service.py` (línea 97)
- Reducir `max_tokens` en prompt
- Usar fallback (Gemini) que es más rápido

### Error: "Resume tailoring not working"

1. Verificar que CV está cargado
2. Verificar logs: `tail -f /tmp/litellm.log`
3. Probar manualmente:

```python
from app.services.apply_service import ApplyPilotService
from app.models import CV, Job

service = ApplyPilotService()
cv = CV.query.first()
job = Job.query.first()
result = service.tailor_resume(cv, job)
print(result)
```

## 📚 Referencias

- [ApplyPilot GitHub](https://github.com/Pickle-Pixel/ApplyPilot)
- [LiteLLM Docs](https://docs.litellm.ai)
- [Anthropic Claude API](https://console.anthropic.com/)
- [Google Gemini API](https://aistudio.google.com/)

## ✅ Checklist de Setup

- [ ] Instalar dependencias: `pip install -r requirements.txt`
- [ ] Copiar `.env.example` a `.env`
- [ ] Obtener `ANTHROPIC_API_KEY` de Anthropic
- [ ] Obtener `GEMINI_API_KEY` de Google
- [ ] Configurar claves en `.env`
- [ ] Iniciar LiteLLM: `python scripts/start_litellm.py`
- [ ] Iniciar Backend: `python run.py`
- [ ] Probar endpoint: `GET /api/apply/status`
- [ ] Probar preview: `POST /api/apply/preview`
- [ ] ¡Listo para aplicar!

---

**Última actualización:** 2026-05-20
**Version:** 1.0
