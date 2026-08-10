import anthropic
import os
import logging
from app.models import ChatHistory, UsageLimit
from app import db
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

_client = None

def get_client():
    """Inicializa cliente de Anthropic con versión 0.103.1"""
    global _client
    if _client is None:
        api_key = os.getenv('CLAUDE_API_KEY')
        if not api_key:
            raise ValueError("CLAUDE_API_KEY not configured in environment")

        _client = anthropic.Anthropic(api_key=api_key)
        logger.info(f"✅ Anthropic client initialized (v{anthropic.__version__})")
    return _client

# System prompt especializado
SYSTEM_PROMPT = """Eres un Coach de Carrera IA especializado en búsqueda de empleo en Chile y América Latina.

RESTRICCIONES:
✅ Hablas SOLO sobre: empleos, CV, entrevistas, salarios, carrera, networking
❌ Rechazas amigablemente otros temas (education no laboral, política, deporte, etc)

TONO: Profesional, directo, accionable, con datos reales de Chile 2026

COMANDOS especiales que reconoces:
/salario [puesto] → Rango salarial Chile 2026
/empresas [zona] → Empresas que contratan en esa zona
/cv-tips [puesto] → Tips específicos de CV
/entrevista [tipo] → Prepara para entrevista
/portales [zona] → Dónde buscar empleo
/negociar-salario → Estrategia de negociación

DATOS IMPORTANTES (Chile 2026):
SALARIOS:
- Dev Junior: $800k-$1.2M
- Dev Mid: $1.3M-$2M  
- Dev Senior: $2.1M-$3.5M
- Analista Junior: $750k-$1.1M
- IT Support L2: $900k-$1.3M
- Ing. Automatización: $900k-$1.3M (junior)

TOP EMPRESAS:
- Mercado Libre (e-commerce)
- Banco de Chile / Falabella (finance)
- Cornershop (logistics)
- Salmones Multiexport, AquaChile, Cermaq (Puerto Montt)

PORTALES TOP:
1. Computrabajo (general)
2. Trabajando.com (profesionales)
3. LinkedIn Jobs (networking)
4. Getonboard (startups)
5. Laborum (especializado)

CONSEJOS CORE:
1. Ser específico: CV y cartas personalizadas, no genéricas
2. Datos first: 75% de CVs rechazados por ATS
3. Acción = Resultados: cuantifica logros
4. Networking: 70% empleos por contactos
5. Largo plazo: es conversación, no interrogatorio

Si alguien pregunta de temas no laborales:
"Jaja, me encantaría ayudarte con eso, pero soy solo un coach de carrera 😄 
¿Qué tal si nos enfocamos en tu búsqueda laboral? Puedo ayudarte con salarios, empresas, CV, entrevistas..."

Responde siempre en español a menos que el usuario hable otro idioma.
Sé conciso pero útil. Máximo 2-3 párrafos antes de listar puntos.
Proporciona ejemplos concretos y accionables."""

def chat_with_coach(user_id: int, message: str, tier: str, context: dict = None) -> dict:
    """
    Envía un mensaje al Coach IA y retorna respuesta + costos

    Args:
        user_id: ID del usuario
        message: Mensaje del usuario
        tier: Tier del usuario (free, pro, premium)
        context: Contexto adicional (CV data, current page, etc)

    Returns:
        dict con: response, tokens, cost
    """
    try:
        logger.info(f"💬 Chat request from user {user_id} (tier: {tier})")

        # Construir contexto del usuario si fue proporcionado
        user_context = ""
        if context:
            if context.get('cv_skills'):
                user_context += f"\n\nUSUARIO CV DATA:\n- Skills: {', '.join(context['cv_skills'][:10])}{'...' if len(context['cv_skills']) > 10 else ''}\n- Experience: {context.get('cv_experience', 0)} years\n- Job titles: {', '.join(context.get('cv_jobs', [])[:3])}"
            if context.get('current_page'):
                user_context += f"\n- Currently viewing: {context['current_page']}"
            if context.get('uploaded_file_content'):
                file_content = context['uploaded_file_content'][:2000]  # Limit to 2000 chars
                user_context += f"\n\nUPLOADED FILE CONTENT:\n{file_content}"

        # Obtener historial previo (últimos 10 chats para contexto)
        history = ChatHistory.query.filter_by(user_id=user_id)\
            .order_by(ChatHistory.created_at.desc())\
            .limit(10).all()

        # Construir messages array para Claude (en orden cronológico)
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

        # Agregar contexto y mensaje actual
        full_message = message
        if user_context:
            full_message = f"{user_context}\n\nUSUARIO PREGUNTA: {message}"

        messages.append({
            "role": "user",
            "content": full_message
        })

        logger.debug(f"Calling Claude API with {len(messages)} messages")

        # Llamar a Claude API con modelo actualizado
        # Usando claude-sonnet-4-6 (modelo actual disponible)
        response = get_client().messages.create(
            model="claude-sonnet-4-6",
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

        # Calcular costo: claude-3-5-sonnet pricing
        # Input: $0.003 per 1K, Output: $0.015 per 1K
        cost = (input_tokens * 0.003 + output_tokens * 0.015) / 1000

        logger.info(f"✅ Claude response: {total_tokens} tokens, ${cost:.4f}")

        # Guardar en DB
        chat_record = ChatHistory(
            user_id=user_id,
            message_user=message,
            message_ai=ai_response,
            tokens_used=total_tokens,
            cost_usd=cost
        )
        db.session.add(chat_record)

        # Actualizar usage limit para free tier
        if tier == 'free':
            usage = UsageLimit.query.filter_by(user_id=user_id).first()
            if not usage:
                usage = UsageLimit(user_id=user_id, chats_this_month=0)
                db.session.add(usage)
            usage.chats_this_month += 1
            usage.updated_at = datetime.now(timezone.utc)

        db.session.commit()

        return {
            "response": ai_response,
            "tokens": total_tokens,
            "cost": float(cost)
        }

    except anthropic.AuthenticationError as e:
        logger.error(f"❌ Auth error - Invalid API key: {str(e)}")
        raise Exception("Invalid API key. Check CLAUDE_API_KEY environment variable.")
    except anthropic.RateLimitError as e:
        logger.error(f"⏱️ Rate limit error: {str(e)}")
        raise Exception("Too many requests. Please try again in a moment.")
    except anthropic.APIError as e:
        logger.error(f"❌ Claude API error: {str(e)}")
        raise Exception(f"AI service error: {str(e)}")
    except Exception as e:
        logger.error(f"❌ Chat error: {type(e).__name__}: {str(e)}", exc_info=True)
        db.session.rollback()
        raise

def get_chat_history(user_id: int, limit: int = 20) -> list:
    """Obtiene historial de chats del usuario"""
    chats = ChatHistory.query.filter_by(user_id=user_id)\
        .order_by(ChatHistory.created_at.desc())\
        .limit(limit).all()
    
    return [chat.to_dict() for chat in reversed(chats)]

def get_monthly_usage(user_id: int) -> dict:
    """Obtiene uso mensual del usuario"""
    usage = UsageLimit.query.filter_by(user_id=user_id).first()

    if not usage:
        return {'chats_used': 0, 'chats_limit': 5}

    return {
        'chats_used': usage.chats_this_month,
        'chats_limit': 5 if user_id else float('inf'),  # Free tier: 5/mes
        'reset_date': usage.reset_date.isoformat()
    }

def calculate_job_match(cv, job) -> dict:
    """
    Calcula qué tan bien coincide un CV con un empleo

    Args:
        cv: Objeto CV con skills analizados
        job: Objeto Job con requirements

    Returns:
        dict con: score (0-100), skills_matched, skills_missing, reason
    """
    cv_skills = set([s.lower() for s in (cv.skills or [])])
    job_requirements = set([r.lower() for r in (job.requirements or [])])

    if not job_requirements:
        # Si no hay requirements, devolver score moderado
        return {
            'score': 50,
            'skills_matched': list(cv_skills),
            'skills_missing': [],
            'reason': f'CV muestra {len(cv_skills)} skills. Empleo no especifica requirements.'
        }

    # Calcular matches
    matched_skills = list(cv_skills & job_requirements)
    missing_skills = list(job_requirements - cv_skills)

    # Score basado en % de skills matched
    if not job_requirements:
        score = 50
    else:
        score = int((len(matched_skills) / len(job_requirements)) * 100)

    # Ajustar score según experience
    if cv.experience_years:
        if cv.experience_years >= 3:
            score = min(100, score + 10)
        elif cv.experience_years >= 1:
            score = min(100, score + 5)

    # Generar razón
    if score >= 80:
        reason = 'Excelente coincidencia - tienes la mayoría de skills requeridos'
    elif score >= 60:
        reason = f'Buena coincidencia - tienes {len(matched_skills)} de {len(job_requirements)} skills'
    elif score >= 40:
        reason = f'Potencial - faltan algunos skills pero tu experiencia podría ser relevante'
    else:
        reason = 'Empleo requiere skills especializados que podrías aprender'

    return {
        'score': score,
        'skills_matched': matched_skills,
        'skills_missing': missing_skills,
        'reason': reason
    }

def extract_text_from_pdf(file_path: str) -> str:
    """Extrae texto de un archivo PDF"""
    try:
        import pdfplumber
        text = ""
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""
        return text.strip()
    except Exception as e:
        logger.warning(f"Error extracting PDF text: {str(e)}")
        return ""

def extract_text_from_docx(file_path: str) -> str:
    """Extrae texto de un archivo DOCX"""
    try:
        from docx import Document
        doc = Document(file_path)
        text = "\n".join([para.text for para in doc.paragraphs])
        return text.strip()
    except Exception as e:
        logger.warning(f"Error extracting DOCX text: {str(e)}")
        return ""

def extract_cv_text(file_path: str) -> str:
    """Extrae texto de un CV en formato PDF o DOCX"""
    if not os.path.exists(file_path):
        logger.warning(f"CV file not found: {file_path}")
        return ""

    file_lower = file_path.lower()

    if file_lower.endswith('.pdf'):
        return extract_text_from_pdf(file_path)
    elif file_lower.endswith('.docx'):
        return extract_text_from_docx(file_path)
    elif file_lower.endswith('.txt'):
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read().strip()
        except Exception as e:
            logger.warning(f"Error reading text file: {str(e)}")
            return ""
    else:
        logger.warning(f"Unsupported file format: {file_path}")
        return ""

def analyze_cv_with_claude(file_path: str) -> dict:
    """
    Analiza un CV usando Claude para extraer información

    Args:
        file_path: Ruta al archivo del CV

    Returns:
        dict con: analysis, skills, experience_years, job_titles, ats_score
    """
    try:
        # Extraer texto del CV
        cv_content = extract_cv_text(file_path)

        if not cv_content:
            logger.warning(f"Could not extract text from CV: {file_path}")
            return {
                'analysis': 'No se pudo extraer texto del CV. Por favor verifica el formato.',
                'skills': [],
                'experience_years': 0,
                'job_titles': [],
                'ats_score': 0
            }

        # Prompt para analizar CV
        analysis_prompt = """Analiza este CV en profundidad. Extrae y devuelve SOLO un JSON válido con esta estructura exacta:
{
    "analysis": "Análisis detallado del CV en 2-3 párrafos",
    "skills": ["skill1", "skill2", ...],
    "experience_years": número,
    "job_titles": ["título1", "título2", ...],
    "ats_score": número entre 0-100,
    "summary": "Resumen ejecutivo de 1 línea"
}

No incluyas markdown, explicaciones ni nada más. Solo el JSON."""

        response = get_client().messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1000,
            messages=[{
                "role": "user",
                "content": f"{analysis_prompt}\n\nCV Content:\n{cv_content}"
            }]
        )

        response_text = response.content[0].text

        # Parsear JSON
        import json
        import re

        # Intentar extraer JSON del response (primero desde código blocks, luego directo)
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', response_text, re.DOTALL)
        if not json_match:
            json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response_text, re.DOTALL)

        if json_match:
            try:
                json_text = json_match.group(1) if json_match.lastindex else json_match.group()
                result = json.loads(json_text)
                logger.info(f"✅ CV analyzed successfully: {result.get('skills', [])} skills found")
                return result
            except json.JSONDecodeError as e:
                logger.warning(f"JSON parse error: {str(e)}")
                result = {
                    'analysis': 'CV analizado',
                    'skills': [],
                    'experience_years': 0,
                    'job_titles': [],
                    'ats_score': 50
                }
        else:
            logger.warning(f"No JSON found in response: {response_text[:200]}")
            result = {
                'analysis': 'CV analizado',
                'skills': [],
                'experience_years': 0,
                'job_titles': [],
                'ats_score': 50
            }

        return result

    except Exception as e:
        logger.error(f"CV analysis error: {str(e)}", exc_info=True)
        return {
            'analysis': 'Error al analizar el CV',
            'skills': [],
            'experience_years': 0,
            'job_titles': [],
            'ats_score': 0
        }


def sync_portal_jobs(portal_name: str, limit: int = 500):
    """
    Fetch jobs from portal and store in database.
    Handles deduplication and updates.
    """
    from app.models import Job
    try:
        from app.services.job_integrations import get_portal_integration

        integration = get_portal_integration(portal_name)
        raw_jobs = integration.fetch_jobs(limit=limit)

        if not raw_jobs:
            logger.warning(f'No jobs fetched from {portal_name}')
            return {'status': 'success', 'synced': 0, 'message': 'No jobs fetched'}

        synced_count = 0
        updated_count = 0

        for raw_job in raw_jobs:
            try:
                normalized = integration.normalize_job(raw_job)

                # Check if job already exists (by external_id + source)
                existing = Job.query.filter_by(
                    external_id=normalized['external_id'],
                    source=portal_name
                ).first()

                if existing:
                    # Update existing job
                    for key, value in normalized.items():
                        if key != 'external_id' and key != 'source':
                            setattr(existing, key, value)
                    updated_count += 1
                else:
                    # Create new job
                    job = Job(**normalized)
                    db.session.add(job)
                    synced_count += 1

            except Exception as e:
                logger.warning(f'Error processing job from {portal_name}: {str(e)}')
                continue

        db.session.commit()
        total = synced_count + updated_count
        logger.info(f'Synced {synced_count} new, updated {updated_count} jobs from {portal_name}')

        return {
            'status': 'success',
            'synced': synced_count,
            'updated': updated_count,
            'total': total
        }

    except Exception as e:
        logger.error(f'Error syncing {portal_name}: {str(e)}')
        db.session.rollback()
        return {
            'status': 'error',
            'message': str(e)
        }
