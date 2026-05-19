# 🚀 JobPilot AI - Tu Agente de Búsqueda de Empleo

**JobPilot AI** es una plataforma web de código abierto que utiliza inteligencia artificial (Claude API) para ayudarte a encontrar trabajo de forma más rápida e inteligente. Funciona para cualquier persona en Chile y América Latina.

## ✨ Características Principales

### 🤖 Coach IA Especializado
- Responde preguntas sobre búsqueda de empleo, CV, entrevistas
- Especializado en mercado laboral chileno
- Base de conocimiento actualizada (2026)
- Rechaza temas no laborales de forma amigable

### 📊 Información de Mercado
- **Salarios**: Rangos actualizados por puesto y nivel
- **Empresas**: Top companies que contratan tech en Chile
- **Portales**: Mejores plataformas para buscar empleo
- **Entrevistas**: Guía de preparación por tipo

### 💬 Comandos Especiales
```
/salario [puesto]          → Rango salarial Chile 2026
/empresas [zona]           → Empresas que contratan en esa zona
/entrevista [tipo]         → Prepara para entrevista técnica/behavioral
/cv-tips [puesto]          → Tips específicos de CV
/portales [zona]           → Dónde buscar empleo
/negociar-salario [oferta] → Estrategia de negociación
/linkedin-tips [puesto]    → Optimizar LinkedIn
```

## 🎯 Casos de Uso

✅ Candidato junior buscando primer empleo
✅ Dev mid-level buscando cambio de empresa
✅ IT Support queriendo transicionar a desarrollo
✅ Especialista industrial automatizando su búsqueda
✅ Cualquier persona necesitando feedback de CV

## 🏗️ Arquitectura

### Versión Actual (MVP)
```
Frontend: HTML/CSS/JavaScript + React (futuro)
Backend: Claude API (Anthropic)
Base de Datos: JSON (futuro: PostgreSQL)
Storage: Local + Cloud (futuro)
```

### Stack Tecnológico (Roadmap)
- **Frontend**: React + Tailwind CSS
- **Backend**: Python (Flask/FastAPI)
- **Base de Datos**: PostgreSQL + MongoDB
- **IA**: Claude API (Anthropic)
- **Deploy**: Vercel (frontend) + Railway (backend)

## 📁 Estructura del Proyecto

```
jobpilot/
├── jobpilot_data/
│   ├── knowledge_base.json        # Base de conocimiento (salarios, empresas, tips)
│   ├── system_prompt_v2.txt       # System Prompt para Coach IA
│   └── README.md
├── job_pilot_mvp.html             # MVP v1.0 (personal)
├── job_pilot_v2_public.html       # MVP v2.0 (público)
├── backend/                        # (Próximamente)
│   ├── app.py
│   ├── models.py
│   └── requirements.txt
└── README.md
```

## 🚀 Cómo Usar

### Opción 1: Online (Más Fácil)
1. Abre `job_pilot_v2_public.html` en tu navegador
2. Chatea con el Coach IA
3. Explora salarios, empresas, portales

### Opción 2: Local Development
```bash
# Clonar repositorio
git clone https://github.com/tuuser/jobpilot-ai.git
cd jobpilot-ai

# Instalar dependencias (futuro)
pip install -r requirements.txt

# Ejecutar servidor local
python app.py
```

## 🤖 Cómo Funciona el Coach IA

1. **Recibe tu pregunta** sobre empleo
2. **Consulta la base de conocimiento** con datos de Chile 2026
3. **Usa Claude API** para respuestas inteligentes y personalizadas
4. **Devuelve respuestas accionables** con ejemplos concretos

El Coach IA está blindado para:
- ✅ **Responder solo sobre temas laborales**
- ✅ **Mantener datos actualizados** del mercado chileno
- ✅ **Rechazar amigablemente** temas no relevantes
- ✅ **Ser específico y práctico** en cada respuesta

## 📊 Base de Conocimiento

Incluye información actualizada de:
- 💰 **Salarios**: Todos los roles tech (junior/mid/senior)
- 🏢 **Empresas**: Top 50 en Chile que contratan tech
- 🌐 **Portales**: Los 8 mejores para buscar empleo
- 🎤 **Entrevistas**: Tipos y tips de preparación
- 📝 **CV Best Practices**: Estructura y redacción
- 💼 **Negociación**: Estrategias salariales
- 🔗 **Networking**: Cómo construir red profesional

## 🔮 Roadmap

### Fase 1: MVP Público ✅
- [x] Chat con Coach IA
- [x] Base de conocimiento JSON
- [x] Info de salarios/empresas/portales
- [ ] Traducción a inglés

### Fase 2: Multi-usuario (2 semanas)
- [ ] Sistema de login/registro
- [ ] Subir CV y analizar
- [ ] Perfil personal por usuario
- [ ] Historial de conversaciones

### Fase 3: Auto-postulación (1 mes)
- [ ] Web scraping de portales reales
- [ ] Auto-postulación con confirmación
- [ ] Notificaciones por email/WhatsApp
- [ ] Análisis de oportunidades

### Fase 4: Monetización (Mes 2)
- [ ] Plan Free: Limitado
- [ ] Plan Pro: $9.990/mes
- [ ] Plan Premium: $19.990/mes + coaching

## 💡 Diferenciales

Vs otros chatbots:
- ✅ **Especializado**: Solo temas de empleo
- ✅ **Chileno**: Datos actualizados de Chile 2026
- ✅ **Accionable**: Respuestas que puedes usar YA
- ✅ **Público**: Para cualquiera, no solo devs
- ✅ **Open Source**: Código disponible

## 🤝 Contribuir

¿Quieres mejorar JobPilot?

1. Fork el repositorio
2. Crea una rama: `git checkout -b feature/mejora`
3. Commit: `git commit -am 'Agrego X'`
4. Push: `git push origin feature/mejora`
5. Pull Request

### Áreas donde necesitamos ayuda
- Traducción a inglés/portugués
- Más datos de empresas y salarios
- Mejoras en el design
- Backend development (Python/Flask)
- Data validation y testing

## 📄 Licencia

MIT License - Úsalo libremente

## 👨‍💻 Autores

Creado por José Esteban Asencio (Santiago, CL) como proyecto open source.

## 📧 Contacto

- GitHub: [@tuuser](https://github.com/tuuser)
- Email: hello@jobpilot.ai
- LinkedIn: [José Asencio]

## 🙏 Agradecimientos

- Claude AI (Anthropic) por la inteligencia
- Comunidad tech chilena por inspiración
- Todos los que contribuyen con ideas

---

**JobPilot AI**: Busca empleo más inteligentemente 🚀

*Last updated: May 18, 2026*
