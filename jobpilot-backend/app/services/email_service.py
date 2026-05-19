"""Email notification service"""
import logging
import os
from flask_mail import Mail, Message
from jinja2 import Template

logger = logging.getLogger(__name__)

mail = Mail()

def init_email(app):
    """Initialize Flask-Mail with app configuration"""
    # Load email config from environment
    mail_server = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    mail_port = int(os.getenv('MAIL_PORT', 587))
    mail_use_tls = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
    mail_username = os.getenv('MAIL_USERNAME', '')
    mail_password = os.getenv('MAIL_PASSWORD', '')
    mail_sender = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@jobpilot.ai')

    # Debug logs
    print("[EMAIL CONFIG DEBUG]")
    print(f"  MAIL_SERVER: {mail_server}")
    print(f"  MAIL_PORT: {mail_port}")
    print(f"  MAIL_USE_TLS: {mail_use_tls} (type: {type(mail_use_tls).__name__})")
    print(f"  MAIL_USERNAME: {mail_username if mail_username else '[NOT SET]'}")
    print(f"  MAIL_PASSWORD: {'[SET]' if mail_password else '[NOT SET]'} (length: {len(mail_password)})")
    print(f"  MAIL_DEFAULT_SENDER: {mail_sender}")
    print("[END EMAIL CONFIG]")

    app.config['MAIL_SERVER'] = mail_server
    app.config['MAIL_PORT'] = mail_port
    app.config['MAIL_USE_TLS'] = mail_use_tls
    app.config['MAIL_USERNAME'] = mail_username
    app.config['MAIL_PASSWORD'] = mail_password
    app.config['MAIL_DEFAULT_SENDER'] = mail_sender
    app.config['MAIL_SUPPRESS_SEND'] = False  # Ensure emails are actually sent

    mail.init_app(app)

def send_opportunity_digest(user_email: str, opportunities: list, frequency: str = 'daily'):
    """Send daily/weekly digest of job opportunities"""

    if not opportunities:
        logger.info(f"No opportunities to send to {user_email}")
        return False

    # Email HTML template
    html_template = """
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .header p { margin: 10px 0 0 0; opacity: 0.9; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .opportunity { background: white; padding: 20px; margin-bottom: 15px; border-left: 4px solid #667eea; border-radius: 4px; }
            .job-title { font-size: 18px; font-weight: bold; color: #333; margin: 0 0 8px 0; }
            .company { color: #666; font-size: 14px; margin: 0; }
            .score { display: inline-block; background: #667eea; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-top: 10px; }
            .score.high { background: #10b981; }
            .score.medium { background: #f59e0b; }
            .location { color: #999; font-size: 13px; margin-top: 8px; }
            .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 10px; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
            .summary { background: white; padding: 15px; border-radius: 4px; margin-bottom: 20px; border-left: 4px solid #10b981; }
            .summary p { margin: 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚀 JobPilot Daily Digest</h1>
                <p>{{ opportunities_count }} new opportunities matching your profile</p>
            </div>

            <div class="content">
                <div class="summary">
                    <p><strong>{{ frequency|capitalize }} update:</strong> We found {{ opportunities_count }} jobs that match your skills with {{ avg_score }}% average match.</p>
                </div>

                {% for opp in opportunities %}
                <div class="opportunity">
                    <p class="job-title">{{ opp.job_title }}</p>
                    <p class="company">@ {{ opp.company }} · {{ opp.location }}</p>

                    <div class="score {% if opp.match_score >= 85 %}high{% elif opp.match_score >= 70 %}medium{% endif %}">
                        {{ opp.match_score }}% Match
                    </div>

                    {% if opp.skills_matched %}
                    <div style="margin-top: 12px; font-size: 13px;">
                        <strong>Matched skills:</strong> {{ opp.skills_matched|join(', ') }}
                    </div>
                    {% endif %}

                    <a href="{{ opp.job_url }}" class="cta-button">View Job →</a>
                </div>
                {% endfor %}

                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <a href="{{ app_url }}/dashboard" style="color: #667eea; text-decoration: none; font-weight: bold;">View all opportunities →</a>
                </div>
            </div>

            <div class="footer">
                <p>You're receiving this because you subscribed to job opportunity notifications.</p>
                <p><a href="{{ app_url }}/settings/notifications" style="color: #667eea; text-decoration: none;">Manage preferences</a> ·
                   <a href="{{ app_url }}/settings/notifications/unsubscribe" style="color: #667eea; text-decoration: none;">Unsubscribe</a></p>
            </div>
        </div>
    </body>
    </html>
    """

    # Calculate average score
    avg_score = int(sum(opp['match_score'] for opp in opportunities) / len(opportunities)) if opportunities else 0

    # Prepare template context
    context = {
        'opportunities_count': len(opportunities),
        'avg_score': avg_score,
        'frequency': frequency,
        'opportunities': opportunities,
        'app_url': os.getenv('APP_URL', 'http://localhost:3000')
    }

    # Render HTML
    template = Template(html_template)
    html_body = template.render(**context)

    # Create and send email
    try:
        subject = f"🚀 JobPilot {frequency.capitalize()} Digest - {len(opportunities)} New Opportunities"

        msg = Message(
            subject=subject,
            recipients=[user_email],
            html=html_body
        )

        mail.send(msg)
        logger.info(f"Digest email sent to {user_email} with {len(opportunities)} opportunities")
        return True

    except Exception as e:
        logger.error(f"Failed to send email to {user_email}: {str(e)}")
        return False

def send_test_email(user_email: str) -> dict:
    """Send a test email to verify configuration"""
    try:
        print(f"[DEBUG] Intentando enviar email a: {user_email}")
        print(f"[DEBUG] MAIL_SERVER: {os.getenv('MAIL_SERVER')}")
        print(f"[DEBUG] MAIL_PORT: {os.getenv('MAIL_PORT')}")
        print(f"[DEBUG] MAIL_USERNAME: {os.getenv('MAIL_USERNAME')}")
        print(f"[DEBUG] MAIL_USE_TLS: {os.getenv('MAIL_USE_TLS')}")

        msg = Message(
            subject="JobPilot Test Email",
            recipients=[user_email],
            html="<p>This is a test email from JobPilot. Your email configuration is working correctly!</p>"
        )
        mail.send(msg)
        logger.info(f"Test email sent to {user_email}")
        print(f"[SUCCESS] Email enviado a {user_email}")
        return {'success': True, 'message': 'Test email sent successfully'}
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Failed to send test email: {error_msg}")
        print(f"[ERROR] {error_msg}")
        return {'success': False, 'error': error_msg}
