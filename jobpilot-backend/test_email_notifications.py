#!/usr/bin/env python
"""Test email notification system"""
import os
import sys
from datetime import datetime, timezone, timedelta

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_email_setup():
    """Test email configuration"""
    print("=" * 60)
    print("🔧 Testing Email Notification System")
    print("=" * 60)

    # Check environment variables
    print("\n1. Checking email configuration...")
    config = {
        'MAIL_SERVER': os.getenv('MAIL_SERVER'),
        'MAIL_PORT': os.getenv('MAIL_PORT'),
        'MAIL_USE_TLS': os.getenv('MAIL_USE_TLS'),
        'MAIL_USERNAME': os.getenv('MAIL_USERNAME'),
        'MAIL_PASSWORD': '***' if os.getenv('MAIL_PASSWORD') else None,
        'MAIL_DEFAULT_SENDER': os.getenv('MAIL_DEFAULT_SENDER'),
        'APP_URL': os.getenv('APP_URL', 'http://localhost:3000')
    }

    for key, value in config.items():
        status = "✅" if value else "❌"
        print(f"  {status} {key}: {value}")

    # Check required fields
    required = ['MAIL_SERVER', 'MAIL_PORT', 'MAIL_USERNAME', 'MAIL_PASSWORD']
    missing = [k for k in required if not config[k]]

    if missing:
        print(f"\n⚠️  Missing config: {', '.join(missing)}")
        print("   Please set these in .env file")
        return False

    print("\n2. Creating Flask app and initializing email service...")
    try:
        from app import create_app
        app = create_app()
        print("  ✅ Flask app created successfully")
    except Exception as e:
        print(f"  ❌ Error creating Flask app: {e}")
        return False

    print("\n3. Testing email service initialization...")
    try:
        from app.services.email_service import mail
        with app.app_context():
            print("  ✅ Email service initialized in app context")
    except Exception as e:
        print(f"  ❌ Error initializing email service: {e}")
        return False

    print("\n4. Checking notification models...")
    try:
        from app.models import NotificationPreference
        with app.app_context():
            count = NotificationPreference.query.count()
            print(f"  ✅ NotificationPreference model accessible")
            print(f"     Current subscriptions: {count}")
    except Exception as e:
        print(f"  ❌ Error accessing NotificationPreference: {e}")
        return False

    print("\n5. Checking scheduler configuration...")
    try:
        from app.services.job_scheduler import get_scheduler
        scheduler = get_scheduler()
        print(f"  ✅ Scheduler instance created")
        print(f"     Jobs scheduled: {scheduler.scheduler.get_jobs()}")

        # Check for digest jobs
        job_ids = [job.id for job in scheduler.scheduler.get_jobs()]
        if 'send_daily_digests' in job_ids:
            print("  ✅ Daily digest job scheduled")
        else:
            print("  ⚠️  Daily digest job not found")

        if 'send_weekly_digests' in job_ids:
            print("  ✅ Weekly digest job scheduled")
        else:
            print("  ⚠️  Weekly digest job not found")
    except Exception as e:
        print(f"  ⚠️  Error checking scheduler: {e}")

    print("\n6. Testing notification service functions...")
    try:
        from app.services.notification_service import send_daily_digests, send_weekly_digests
        print("  ✅ Notification service functions imported successfully")
    except Exception as e:
        print(f"  ❌ Error importing notification service: {e}")
        return False

    print("\n" + "=" * 60)
    print("✅ Email notification system is properly configured!")
    print("=" * 60)

    print("\n📧 How to use email notifications:")
    print("  1. Users call POST /api/notifications/subscribe with:")
    print("     - frequency: 'daily' or 'weekly'")
    print("     - min_match_score: 0-100 (default: 70)")
    print("")
    print("  2. Send test email: POST /api/notifications/test-email")
    print("")
    print("  3. Scheduler runs automatically:")
    print("     - Daily digest: 08:00 UTC every day")
    print("     - Weekly digest: 08:00 UTC every Monday")
    print("")
    print("  4. Users receive email when new jobs match their CV")
    print("     with score >= min_match_score")

    return True

def test_email_send_test():
    """Test sending a test email (requires JWT token)"""
    print("\n" + "=" * 60)
    print("📤 To test sending an email:")
    print("=" * 60)
    print("""
1. Start the Flask server:
   python run.py

2. Get a JWT token by signing up/logging in:
   curl -X POST http://localhost:5000/api/auth/signup \\
     -H "Content-Type: application/json" \\
     -d '{"email": "test@example.com", "password": "password"}'

3. Copy the access_token from response

4. Send test email:
   curl -X POST http://localhost:5000/api/notifications/test-email \\
     -H "Authorization: Bearer <your_jwt_token>"

5. Check your email inbox!
    """)

if __name__ == '__main__':
    success = test_email_setup()
    if success:
        test_email_send_test()
        sys.exit(0)
    else:
        print("\n❌ Email notification system configuration failed!")
        print("Please check your .env file and try again.")
        sys.exit(1)
