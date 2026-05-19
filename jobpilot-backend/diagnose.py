#!/usr/bin/env python
"""Complete diagnostics for JobPilot backend"""
import os
import sys
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def print_header(title):
    print("\n" + "=" * 70)
    print(f"🔍 {title}")
    print("=" * 70)

def print_success(msg):
    print(f"✅ {msg}")

def print_error(msg):
    print(f"❌ {msg}")

def print_warning(msg):
    print(f"⚠️  {msg}")

def print_info(msg):
    print(f"ℹ️  {msg}")

def check_environment():
    """Check environment variables and configuration"""
    print_header("1. ENVIRONMENT VARIABLES")

    required_vars = {
        'DATABASE_URL': 'Database connection',
        'CLAUDE_API_KEY': 'Claude API key',
        'SECRET_KEY': 'Flask secret key',
        'MAIL_SERVER': 'Email SMTP server',
        'MAIL_USERNAME': 'Email username',
        'MAIL_PASSWORD': 'Email password'
    }

    missing = []
    for var, desc in required_vars.items():
        value = os.getenv(var)
        if not value:
            print_error(f"{desc} ({var}): NOT SET")
            missing.append(var)
        else:
            # Mask sensitive values
            display_value = value[:20] + "..." if len(value) > 20 else value
            if var in ['CLAUDE_API_KEY', 'MAIL_PASSWORD']:
                display_value = "***"
            print_success(f"{desc} ({var}): {display_value}")

    return len(missing) == 0

def check_database():
    """Check database connectivity"""
    print_header("2. DATABASE")

    try:
        from app import create_app
        app = create_app()

        with app.app_context():
            from app import db
            from app.models import User, CV, Job, NotificationPreference

            # Try to query users
            user_count = User.query.count()
            cv_count = CV.query.count()
            job_count = Job.query.count()
            notif_count = NotificationPreference.query.count()

            print_success(f"Database connected: {os.getenv('DATABASE_URL')}")
            print_success(f"Users in DB: {user_count}")
            print_success(f"CVs in DB: {cv_count}")
            print_success(f"Jobs in DB: {job_count}")
            print_success(f"Notification subscriptions: {notif_count}")

            return True

    except Exception as e:
        print_error(f"Database connection failed: {str(e)}")
        return False

def check_claude_api():
    """Check Claude API connectivity"""
    print_header("3. CLAUDE API")

    try:
        from anthropic import Anthropic
        api_key = os.getenv('CLAUDE_API_KEY')

        if not api_key:
            print_error("CLAUDE_API_KEY not set in environment")
            return False

        client = Anthropic()

        # Try simple API call
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=100,
            messages=[
                {"role": "user", "content": "Say 'API working' in one word."}
            ]
        )

        response_text = message.content[0].text if message.content else "No response"
        print_success(f"Claude API working: {response_text.strip()}")
        print_success(f"Model: claude-3-5-sonnet-20241022")
        print_info(f"Usage: {message.usage.input_tokens} input tokens")

        return True

    except Exception as e:
        print_error(f"Claude API test failed: {str(e)}")
        print_info("Possible reasons:")
        print_info("  - CLAUDE_API_KEY expired or invalid")
        print_info("  - Network connectivity issue")
        print_info("  - API rate limited")
        return False

def check_email_service():
    """Check email service configuration"""
    print_header("4. EMAIL SERVICE")

    try:
        from app import create_app
        app = create_app()

        with app.app_context():
            from app.services.email_service import mail

            print_success(f"Email server: {app.config.get('MAIL_SERVER')}")
            print_success(f"Email port: {app.config.get('MAIL_PORT')}")
            print_success(f"TLS enabled: {app.config.get('MAIL_USE_TLS')}")
            print_success(f"From address: {app.config.get('MAIL_DEFAULT_SENDER')}")

            return True

    except Exception as e:
        print_error(f"Email service check failed: {str(e)}")
        return False

def check_scheduler():
    """Check job scheduler"""
    print_header("5. JOB SCHEDULER")

    try:
        from app import create_app
        from app.services.job_scheduler import get_scheduler

        app = create_app()

        scheduler = get_scheduler()

        if scheduler and scheduler.scheduler:
            jobs = scheduler.scheduler.get_jobs()
            print_success(f"Scheduler initialized")
            print_success(f"Jobs scheduled: {len(jobs)}")

            if jobs:
                print_info("\nScheduled jobs:")
                for job in jobs:
                    print_info(f"  - {job.id}: {job.name}")
            else:
                print_warning("No jobs scheduled yet")

            return True
        else:
            print_warning("Scheduler not initialized")
            return False

    except Exception as e:
        print_error(f"Scheduler check failed: {str(e)}")
        return False

def check_upload_folder():
    """Check upload folder"""
    print_header("6. FILE UPLOAD")

    try:
        upload_dir = os.path.abspath('uploads/cvs')

        if os.path.exists(upload_dir):
            file_count = len(os.listdir(upload_dir))
            print_success(f"Upload folder exists: {upload_dir}")
            print_success(f"Files in folder: {file_count}")
        else:
            print_warning(f"Upload folder doesn't exist yet: {upload_dir}")
            print_info("Folder will be created on first CV upload")

        return True

    except Exception as e:
        print_error(f"Upload folder check failed: {str(e)}")
        return False

def check_routes():
    """Check API routes"""
    print_header("7. API ROUTES")

    try:
        from app import create_app

        app = create_app()

        routes = []
        for rule in app.url_map.iter_rules():
            if rule.endpoint != 'static':
                methods = ','.join(rule.methods - {'OPTIONS', 'HEAD'})
                routes.append((rule.rule, methods))

        # Group by prefix
        auth_routes = [r for r in routes if '/api/auth' in r[0]]
        cv_routes = [r for r in routes if '/api/cv' in r[0]]
        jobs_routes = [r for r in routes if '/api/jobs' in r[0]]
        notif_routes = [r for r in routes if '/api/notifications' in r[0]]

        print_success(f"Total routes: {len(routes)}")

        print_info("\nAuth routes:")
        for route, methods in auth_routes:
            print_info(f"  {methods:15} {route}")

        print_info("\nCV routes:")
        for route, methods in cv_routes:
            print_info(f"  {methods:15} {route}")

        print_info("\nJobs routes:")
        for route, methods in jobs_routes[:5]:  # Show first 5
            print_info(f"  {methods:15} {route}")
        if len(jobs_routes) > 5:
            print_info(f"  ... and {len(jobs_routes) - 5} more")

        print_info("\nNotifications routes:")
        for route, methods in notif_routes:
            print_info(f"  {methods:15} {route}")

        return True

    except Exception as e:
        print_error(f"Routes check failed: {str(e)}")
        return False

def print_quick_test_guide():
    """Print guide for quick testing"""
    print_header("QUICK TEST GUIDE")

    print("""
1️⃣  SIGNUP (create account):
    curl -X POST http://localhost:5000/api/auth/signup \\
      -H "Content-Type: application/json" \\
      -d '{"email": "test@example.com", "password": "test123"}'

    💾 Save the access_token from response

2️⃣  TEST EMAIL (verify configuration):
    curl -X POST http://localhost:5000/api/notifications/test-email \\
      -H "Authorization: Bearer <your_token_here>"

    📧 Check your inbox for test email

3️⃣  UPLOAD CV (small PDF):
    curl -X POST http://localhost:5000/api/cv/upload \\
      -H "Authorization: Bearer <your_token_here>" \\
      -F "file=@/path/to/your/cv.pdf"

    📄 Watch logs for detailed progress

4️⃣  SUBSCRIBE TO DIGESTS:
    curl -X POST http://localhost:5000/api/notifications/subscribe \\
      -H "Authorization: Bearer <your_token_here>" \\
      -H "Content-Type: application/json" \\
      -d '{"frequency": "daily", "min_match_score": 70}'

    📬 Will receive daily digest at 8 AM UTC

💡 TIP: Watch server logs (python run.py terminal) to see detailed diagnostics
""")

def main():
    """Run all diagnostics"""
    print("\n")
    print("╔" + "═" * 68 + "╗")
    print("║" + " " * 15 + "JOBPILOT BACKEND DIAGNOSTICS" + " " * 25 + "║")
    print("║" + f" Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}" + " " * 35 + "║")
    print("╚" + "═" * 68 + "╝")

    results = {
        'Environment': check_environment(),
        'Database': check_database(),
        'Claude API': check_claude_api(),
        'Email Service': check_email_service(),
        'Scheduler': check_scheduler(),
        'Upload Folder': check_upload_folder(),
        'API Routes': check_routes()
    }

    print_header("SUMMARY")

    passed = sum(1 for v in results.values() if v)
    total = len(results)

    for component, result in results.items():
        status = "✅" if result else "❌"
        print(f"{status} {component}")

    print(f"\n{passed}/{total} checks passed")

    if passed == total:
        print_success("All systems operational! Backend is ready. 🚀")
    elif passed >= total - 1:
        print_warning("Most systems working. Check failed items above.")
    else:
        print_error("Multiple issues detected. Please fix before deployment.")

    print_quick_test_guide()

    return 0 if passed == total else 1

if __name__ == '__main__':
    sys.exit(main())
