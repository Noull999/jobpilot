import anthropic
import os
import logging
from app.models import ChatHistory, UsageLimit
from app import db
from datetime import datetime

logger = logging.getLogger(__name__)

_client = None

def get_client():
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.getenv('CLAUDE_API_KEY'))
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

def chat_with_coach(user_id: int, message: str, tier: str) -> dict:
    """
    Envía un mensaje al Coach IA y retorna respuesta + costos
    
    Args:
        user_id: ID del usuario
        message: Mensaje del usuario
        tier: Tier del usuario (free, pro, premium)
    
    Returns:
        dict con: response, tokens, cost
    """
    
    try:
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
        
        # Agregar mensaje actual
        messages.append({
            "role": "user",
            "content": message
        })
        
        # Llamar a Claude API
        response = get_client().messages.create(
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
        
        # Calcular costo: $0.003 por 1K input, $0.015 por 1K output
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
        
        # Actualizar usage limit para free tier
        if tier == 'free':
            usage = UsageLimit.query.filter_by(user_id=user_id).first()
            if not usage:
                usage = UsageLimit(user_id=user_id, chats_this_month=0)
                db.session.add(usage)
            usage.chats_this_month += 1
            usage.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return {
            "response": ai_response,
            "tokens": total_tokens,
            "cost": float(cost)
        }
        
    except anthropic.APIError as e:
        logger.error(f"Claude API error: {str(e)}")
        raise Exception(f"AI service error: {str(e)}")
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
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
