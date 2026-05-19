#!/usr/bin/env python3
"""Script para testear los endpoints de CV y Chat"""

import requests
import json
import time

BASE_URL = "http://localhost:5000"

# Crear usuario test
email = f"test{int(time.time())}@example.com"
password = "Test123456!"

print(f"Creating test user: {email}")
signup_res = requests.post(f"{BASE_URL}/api/auth/signup", json={
    "email": email,
    "password": password,
    "name": "Test User"
})

if signup_res.status_code != 201:
    print(f"Signup failed: {signup_res.status_code}")
    print(signup_res.json())
    exit(1)

token = signup_res.json()['access_token']
print(f"Token: {token[:50]}...")

# Test CV upload
print("\n--- Testing CV Upload ---")
# Crear un archivo de prueba
cv_content = """
John Doe
Senior Python Developer

EXPERIENCE:
- 5 years Python development
- React and JavaScript
- Django and Flask
- PostgreSQL and MongoDB
- AWS and Docker

SKILLS:
Python, JavaScript, React, Django, Flask, SQL, Git, Docker
"""

import tempfile
import os as os_module

temp_dir = tempfile.gettempdir()
cv_path = os_module.path.join(temp_dir, 'test_cv.txt')

with open(cv_path, 'w') as f:
    f.write(cv_content)

headers = {"Authorization": f"Bearer {token}"}
with open(cv_path, 'rb') as f:
    files = {'file': f}
    cv_res = requests.post(
        f"{BASE_URL}/api/cv/upload",
        headers=headers,
        files=files
    )

print(f"CV Upload Status: {cv_res.status_code}")
if cv_res.status_code != 201:
    print(f"Error: {cv_res.json()}")
else:
    cv_data = cv_res.json()['cv']
    print(f"CV Analysis:")
    print(f"  - ATS Score: {cv_data.get('ats_score')}")
    print(f"  - Skills: {cv_data.get('skills')}")
    print(f"  - Experience: {cv_data.get('experience_years')} años")

# Test Chat
print("\n--- Testing Chat ---")
chat_res = requests.post(
    f"{BASE_URL}/api/chat/send",
    headers=headers,
    json={"message": "Hola, necesito ayuda con mi búsqueda de empleo"}
)

print(f"Chat Status: {chat_res.status_code}")
if chat_res.status_code != 200:
    print(f"Error: {chat_res.json()}")
else:
    chat_data = chat_res.json()
    print(f"Coach Response:")
    print(f"  {chat_data['response'][:200]}...")
    print(f"  Tokens: {chat_data['tokens']}")
    print(f"  Cost: ${chat_data['cost']:.4f}")

# Test Job Matches
print("\n--- Testing Job Matches ---")
matches_res = requests.get(
    f"{BASE_URL}/api/jobs/matches?limit=5",
    headers=headers
)

print(f"Matches Status: {matches_res.status_code}")
if matches_res.status_code != 200:
    print(f"Error: {matches_res.json()}")
else:
    matches = matches_res.json()['matches']
    print(f"Found {len(matches)} job matches:")
    for match in matches[:3]:
        print(f"  - {match['job']['company']} - {match['job']['title']}")
        print(f"    Compatibility: {match['match_score']}%")
