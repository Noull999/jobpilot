# QuickStart: ApplyPilot en 5 Minutos

## 1️⃣ Instalar Dependencias

```bash
pip install -r requirements.txt
```

## 2️⃣ Obtener API Keys

### Claude (Anthropic) - Principal
- URL: https://console.anthropic.com/
- Crear API Key
- Copiar key en `.env`

### Gemini (Google) - Fallback
- URL: https://aistudio.google.com/app/apikeys
- Crear API Key (gratis, sin tarjeta)
- Copiar key en `.env`

## 3️⃣ Configurar .env

```bash
cp .env.example .env
```

Editar `.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...        # Obtener de Anthropic
GEMINI_API_KEY=...                  # Obtener de Google
APPLYPILOT_ENABLED=true
APPLYPILOT_PRIMARY_LLM=claude-opus
APPLYPILOT_FALLBACK_LLM=gemini
LITELLM_PROXY_URL=http://localhost:4000
```

## 4️⃣ Iniciar Proxy LiteLLM

En **Terminal 1**:

```bash
python scripts/start_litellm.py
```

Debes ver:
```
✅ LiteLLM proxy started on http://localhost:4000
```

## 5️⃣ Iniciar Backend

En **Terminal 2**:

```bash
python run.py
```

## 🧪 Verificar Setup

```bash
# Terminal 3 (o en Python)
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/apply/status

# Respuesta esperada:
{
  "success": true,
  "status": {
    "enabled": true,
    "litellm_available": true,
    "anthropic_api_key": true,
    "gemini_api_key": true
  }
}
```

## 📡 Usar ApplyPilot

### Desde Frontend (React)

```javascript
// Aplicar a matches específicos
const response = await fetch('/api/apply/apply-to-matches', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    match_ids: [1, 2, 3]  // IDs de JobMatch
  })
})

const data = await response.json()
console.log(`✅ ${data.results.successful} aplicaciones enviadas`)
```

### Preview antes de aplicar

```javascript
const response = await fetch('/api/apply/preview', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    job_id: 123
  })
})

const { preview } = await response.json()
console.log('Resume tailored:', preview.tailored_resume)
console.log('Cover letter:', preview.cover_letter)
```

## 🎯 Cómo Funciona

1. **Usuario selecciona job matches** en Dashboard
2. **Click en "Aplicar Automático"**
3. Backend llama a ApplyPilot service:
   - Extrae CV del usuario
   - Para cada job:
     - Usa Claude para tailorizar CV
     - Usa Claude para generar cover letter
     - Crea Application record en BD
4. Si Claude falla → usa Gemini automáticamente
5. **Muestra resultados** al usuario (✅ aplicadas, ❌ fallidas)

## ⚙️ Modelos Usados

### Principal: Claude Opus
- Mejor para escribir
- Reescribe resume + cover letters
- ~$0.05-0.10 por aplicación

### Fallback: Gemini
- Si Claude falla
- Free tier: 15 req/min, 1M tokens/día
- Más rápido pero menos potente

## 📖 Documentación Completa

Ver: `APPLYPILOT_SETUP.md`

## 🆘 Si algo falla

1. **Proxy no responde:**
   ```bash
   curl http://localhost:4000/health
   ```

2. **Verificar logs:**
   ```bash
   # Terminal con LiteLLM
   # Debes ver requests/responses
   ```

3. **Revisar .env:**
   ```bash
   cat .env | grep -E "ANTHROPIC|GEMINI|APPLYPILOT"
   ```

4. **API Key inválida:**
   - Regenerar en Anthropic/Google
   - Verificar que no tenga espacios

---

**¡Listo para aplicar automáticamente a empleos!** 🚀
