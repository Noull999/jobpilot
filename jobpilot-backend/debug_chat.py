#!/usr/bin/env python3
"""Debug script para el endpoint de Chat"""

import requests
import json
import time

BASE_URL = "http://localhost:5000"

# Crear usuario test
email = f"debug{int(time.time())}@example.com"
password = "Test123456!"

print(f"Creating test user: {email}")
signup_res = requests.post(f"{BASE_URL}/api/auth/signup", json={
    "email": email,
    "password": password,
    "name": "Debug User"
})

if signup_res.status_code != 201:
    print(f"Signup failed: {signup_res.status_code}")
    print(signup_res.json())
    exit(1)

token = signup_res.json()['access_token']
user_id = signup_res.json()['user']['id']
print(f"User created: {user_id}")

# Test Chat con debugging
print("\n--- Testing Chat with Debug ---")
headers = {"Authorization": f"Bearer {token}"}

print(f"Token: {token[:50]}...")
print(f"User ID: {user_id}")

try:
    chat_res = requests.post(
        f"{BASE_URL}/api/chat/send",
        headers=headers,
        json={"message": "Hola, necesito ayuda"},
        timeout=10
    )

    print(f"Status Code: {chat_res.status_code}")
    print(f"Response Headers: {dict(chat_res.headers)}")
    print(f"Response Text: {chat_res.text}")

    if chat_res.status_code == 200:
        print("Success!")
        print(json.dumps(chat_res.json(), indent=2))
    else:
        print(f"Error: {chat_res.json()}")

except Exception as e:
    print(f"Exception: {str(e)}")
    import traceback
    traceback.print_exc()
