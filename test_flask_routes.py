#!/usr/bin/env python3

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'jobpilot-backend'))

from app import create_app

app = create_app()

print("=== REGISTERED ROUTES ===\n")

for rule in sorted(app.url_map.iter_rules(), key=str):
    if '/api/cv' in str(rule):
        print(f"Route: {rule}")
        print(f"  Methods: {', '.join(rule.methods - {'OPTIONS', 'HEAD'})}")
        print()
