#!/usr/bin/env python3
"""Check configuration"""

import os

print("Environment Check:")
print(f"CLAUDE_API_KEY set: {'CLAUDE_API_KEY' in os.environ}")
print(f"FLASK_ENV: {os.getenv('FLASK_ENV', 'not set')}")

if 'CLAUDE_API_KEY' not in os.environ:
    print("\n[ERROR] CLAUDE_API_KEY environment variable is not set!")
    print("This is why Chat endpoint fails with 500 error.")
    print("\nYou need to set it like this:")
    print("  export CLAUDE_API_KEY='sk-...'")
    exit(1)
