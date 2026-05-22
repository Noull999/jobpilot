import secrets
import logging
from datetime import datetime, timedelta, timezone
from app.models import EmailVerificationToken
from app import db
from app.services.email_service import mail
from flask_mail import Message

logger = logging.getLogger(__name__)

def generate_verification_token(user_id):
    """Generate a secure verification token for email confirmation"""
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

    # Invalidate any existing tokens for this user
    EmailVerificationToken.query.filter_by(user_id=user_id).delete()

    verification_token = EmailVerificationToken(
        user_id=user_id,
        token=token,
        expires_at=expires_at
    )
    db.session.add(verification_token)
    db.session.commit()

    return token

def send_verification_email(user_email, user_name, verification_token, frontend_url='http://localhost:3000'):
    """Send email verification link to user"""
    try:
        verify_url = f"{frontend_url}/verify-email?token={verification_token}"

        msg = Message(
            subject='Verifica tu email - JobPilot',
            recipients=[user_email],
            html=f"""
            <html>
                <body style="font-family: Arial, sans-serif; background-color: #f5f5f5;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 5px;">
                        <h2>Hola {user_name},</h2>
                        <p>Gracias por registrarte en JobPilot. Para completar tu registro, verifica tu email haciendo clic en el siguiente enlace:</p>
                        <p style="text-align: center; margin: 30px 0;">
                            <a href="{verify_url}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                                Verificar Email
                            </a>
                        </p>
                        <p>O copia y pega este link en tu navegador:</p>
                        <p style="word-break: break-all; background-color: #f9f9f9; padding: 10px; border-radius: 3px;">
                            {verify_url}
                        </p>
                        <p><strong>Este enlace expira en 24 horas.</strong></p>
                        <p>Si no solicitaste este correo, ignóralo.</p>
                        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                        <p style="font-size: 12px; color: #666;">
                            JobPilot Security - Tu privacidad es importante para nosotros
                        </p>
                    </div>
                </body>
            </html>
            """
        )

        mail.send(msg)
        logger.info(f"Verification email sent to {user_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send verification email: {str(e)}")
        return False

def verify_token(token):
    """Verify email verification token and return user_id if valid"""
    try:
        verification = EmailVerificationToken.query.filter_by(token=token).first()

        if not verification:
            return None, "Token inválido"

        if datetime.now(timezone.utc) > verification.expires_at:
            db.session.delete(verification)
            db.session.commit()
            return None, "Token expirado"

        user_id = verification.user_id

        # Delete the used token
        db.session.delete(verification)
        db.session.commit()

        return user_id, None
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        return None, "Error al verificar token"
