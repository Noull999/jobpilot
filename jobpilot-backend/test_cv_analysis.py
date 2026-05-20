#!/usr/bin/env python
"""Test CV upload and analysis with PDF extraction"""
import requests
import json
import sys
import os
import time

# Set encoding for Windows console
os.environ['PYTHONIOENCODING'] = 'utf-8'

BASE_URL = "http://localhost:5000/api"

def test_cv_analysis():
    print("[TEST] Testing CV Analysis with PDF Extraction\n")

    # 1. Create test user
    print("[1] Creating test user...")
    timestamp = int(time.time())
    user_data = {
        "name": "Test CV User",
        "email": f"testcv{timestamp}@example.com",
        "password": "TestPassword123!"
    }

    response = requests.post(f"{BASE_URL}/auth/signup", json=user_data)
    if response.status_code not in [200, 201]:
        print(f"[FAIL] User creation failed: {response.text}")
        return False

    user_result = response.json()
    user_id = user_result.get('id') or user_result.get('user_id')
    access_token = user_result.get('access_token')

    if not access_token:
        print(f"[FAIL] No access token returned: {user_result}")
        return False

    print(f"[OK] User created: {user_id}")
    print(f"   Token: {access_token[:20]}...\n")

    # 2. Upload CV file
    print("[2] Uploading CV file...")
    cv_path = "C:\\Users\\Lenovo\\Downloads\\CV_Jose_Asencio.pdf"

    with open(cv_path, 'rb') as f:
        files = {'file': f}
        headers = {'Authorization': f'Bearer {access_token}'}
        response = requests.post(
            f"{BASE_URL}/cv/upload",
            files=files,
            headers=headers
        )

    if response.status_code not in [200, 201]:
        print(f"[FAIL] CV upload failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return False

    cv_result = response.json()
    print(f"[OK] CV uploaded successfully")
    print(f"   Response: {json.dumps(cv_result, indent=2)}\n")

    # 3. Check CV analysis results from the CV endpoint
    print("[3] Checking CV analysis results...")

    # Get CV data from the CV endpoint
    headers = {'Authorization': f'Bearer {access_token}'}
    response = requests.get(f"{BASE_URL}/cv/current", headers=headers)

    if response.status_code == 200:
        cv_response = response.json()
        cv_data = cv_response.get('cv', {})

        if cv_data:
            skills = cv_data.get('skills', [])
            experience = cv_data.get('experience_years', 0)
            job_titles = cv_data.get('job_titles', [])
            ats_score = cv_data.get('ats_score', 0)

            print(f"[OK] CV Analysis Results:")
            print(f"   Skills Count: {len(skills)}")
            print(f"   Skills: {skills[:5]}{'...' if len(skills) > 5 else ''}")
            print(f"   Experience Years: {experience}")
            print(f"   Job Titles: {job_titles}")
            print(f"   ATS Score: {ats_score}\n")

            # Check if skills were extracted
            if skills:
                print("[SUCCESS] Skills were extracted from the PDF!")
                return True
            else:
                print("[WARN] No skills were extracted from the CV")
                return False
        else:
            print("[FAIL] No CV data found")
            return False
    else:
        print(f"[FAIL] Failed to get CV data: {response.text}")
        return False

if __name__ == "__main__":
    success = test_cv_analysis()
    sys.exit(0 if success else 1)
