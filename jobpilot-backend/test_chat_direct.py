#!/usr/bin/env python3
"""Direct test of chat_with_coach function"""

import sys
sys.path.insert(0, '/root/jobpilot-backend')

from app import create_app, db
from app.services import chat_with_coach
from app.models import User, Subscription

# Create Flask app context
app = create_app()

with app.app_context():
    # Create test user with unique email
    import time
    user = User(
        email=f"testdirect{int(time.time())}@example.com",
        password_hash=b"test",
        name="Test User",
        tier="free"
    )
    db.session.add(user)
    db.session.flush()

    subscription = Subscription(
        user_id=user.id,
        tier="free",
        status="active"
    )
    db.session.add(subscription)
    db.session.commit()

    print(f"Created test user: {user.id}")

    # Try to chat
    try:
        print("\nCalling chat_with_coach...")
        result = chat_with_coach(user.id, "Hola, necesito ayuda", "free")
        print(f"Success! Response:\n{result['response'][:200]}...")
        print(f"Tokens: {result['tokens']}, Cost: ${result['cost']}")
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
