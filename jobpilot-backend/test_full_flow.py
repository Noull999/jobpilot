#!/usr/bin/env python3
"""Full flow testing: signup, CV upload, chat, job matches"""

import requests
import json
import time

BASE_URL = "http://localhost:5000"

# Test user
email = f"fulltest{int(time.time())}@example.com"
password = "Test123456!"

print("=" * 60)
print("FULL FLOW TEST - JobPilot Backend")
print("=" * 60)

# 1. SIGNUP
print("\n1. SIGNUP")
print("-" * 60)
signup_res = requests.post(f"{BASE_URL}/api/auth/signup", json={
    "email": email,
    "password": password,
    "name": "Test User"
})
print(f"Status: {signup_res.status_code}")
if signup_res.status_code == 201:
    token = signup_res.json()['access_token']
    user = signup_res.json()['user']
    print(f"[OK] User created: {user['id']} ({user['email']})")
else:
    print(f"[ERROR] Error: {signup_res.json()}")
    exit(1)

headers = {"Authorization": f"Bearer {token}"}

# 2. CV UPLOAD
print("\n2. CV UPLOAD")
print("-" * 60)
cv_content = """
John Doe
Senior Python Developer

EXPERIENCE:
- 5 años en Python
- React y JavaScript
- Django y Flask
- PostgreSQL y MongoDB
- AWS y Docker

SKILLS:
Python, JavaScript, React, Django, Flask, SQL, Git, Docker, AWS
"""

import tempfile
import os

temp_dir = tempfile.gettempdir()
cv_path = os.path.join(temp_dir, 'test_cv_full.txt')

with open(cv_path, 'w') as f:
    f.write(cv_content)

with open(cv_path, 'rb') as f:
    files = {'file': f}
    cv_res = requests.post(
        f"{BASE_URL}/api/cv/upload",
        headers=headers,
        files=files
    )

print(f"Status: {cv_res.status_code}")
if cv_res.status_code == 201:
    cv_data = cv_res.json()['cv']
    print(f"[OK] CV uploaded and analyzed")
    print(f"  - ATS Score: {cv_data.get('ats_score')}")
    print(f"  - Skills: {cv_data.get('skills')}")
    print(f"  - Experience: {cv_data.get('experience_years')} years")
    print(f"  - Job Titles: {cv_data.get('job_titles')}")
else:
    print(f"[ERROR] Error: {cv_res.json()}")

# 3. JOB MATCHES
print("\n3. JOB MATCHES")
print("-" * 60)
matches_res = requests.get(
    f"{BASE_URL}/api/jobs/matches?limit=3",
    headers=headers
)

print(f"Status: {matches_res.status_code}")
if matches_res.status_code == 200:
    matches = matches_res.json()['matches']
    print(f"[OK] Found {len(matches)} matches:")
    for match in matches:
        print(f"  - {match['job']['company']} - {match['job']['title']}")
        print(f"    Compatibility: {match['match_score']}%")
        print(f"    Reason: {match['match_reason']}")
else:
    print(f"[ERROR] Error: {matches_res.json()}")

# 4. CHAT (will fail without API credits, but test error handling)
print("\n4. CHAT SEND")
print("-" * 60)
chat_res = requests.post(
    f"{BASE_URL}/api/chat/send",
    headers=headers,
    json={"message": "Hola, necesito ayuda con mi búsqueda"}
)

print(f"Status: {chat_res.status_code}")
if chat_res.status_code == 200:
    print(f"[OK] Message sent successfully")
    print(f"  Response: {chat_res.json()['response'][:100]}...")
elif chat_res.status_code == 402:
    print(f"[WARN] API Credits Exhausted (expected without credits)")
    print(f"  Error: {chat_res.json()['message']}")
else:
    print(f"[ERROR] Error ({chat_res.status_code}): {chat_res.json()}")

# 5. CHAT HISTORY
print("\n5. CHAT HISTORY")
print("-" * 60)
history_res = requests.get(
    f"{BASE_URL}/api/chat/history?limit=5",
    headers=headers
)

print(f"Status: {history_res.status_code}")
if history_res.status_code == 200:
    history = history_res.json()['history']
    print(f"[OK] Retrieved {len(history)} messages")
else:
    print(f"[ERROR] Error: {history_res.json()}")

# 6. USER PROFILE
print("\n6. USER PROFILE")
print("-" * 60)
profile_res = requests.get(
    f"{BASE_URL}/api/user/profile",
    headers=headers
)

print(f"Status: {profile_res.status_code}")
if profile_res.status_code == 200:
    user = profile_res.json()['user']
    print(f"[OK] Profile retrieved")
    print(f"  - Email: {user['email']}")
    print(f"  - Tier: {user['tier']}")
else:
    print(f"[ERROR] Error: {profile_res.json()}")

print("\n" + "=" * 60)
print("TEST COMPLETE")
print("=" * 60)
