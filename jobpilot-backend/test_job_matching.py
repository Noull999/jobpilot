#!/usr/bin/env python
"""Test job matching with extracted CV skills"""
import requests
import json
import sys
import os
import time

os.environ['PYTHONIOENCODING'] = 'utf-8'

BASE_URL = "http://localhost:5000/api"

def test_job_matching():
    print("[TEST] Testing Job Matching with Extracted CV Skills\n")

    # 1. Create test user and upload CV
    print("[1] Creating test user and uploading CV...")
    timestamp = int(time.time())
    user_data = {
        "name": "Job Match Test User",
        "email": f"jobmatch{timestamp}@example.com",
        "password": "TestPassword123!"
    }

    response = requests.post(f"{BASE_URL}/auth/signup", json=user_data)
    if response.status_code not in [200, 201]:
        print(f"[FAIL] Could not create user: {response.text}")
        return False

    access_token = response.json().get('access_token')
    print(f"[OK] User created")

    # Upload CV
    cv_path = "C:\\Users\\Lenovo\\Downloads\\CV_Jose_Asencio.pdf"
    with open(cv_path, 'rb') as f:
        files = {'file': f}
        headers = {'Authorization': f'Bearer {access_token}'}
        response = requests.post(f"{BASE_URL}/cv/upload", files=files, headers=headers)

    if response.status_code not in [200, 201]:
        print(f"[FAIL] CV upload failed: {response.text}")
        return False

    cv_response = response.json()
    cv_skills = cv_response.get('cv', {}).get('skills', [])
    print(f"[OK] CV uploaded with {len(cv_skills)} skills\n")

    # 2. Get job matches
    print("[2] Getting job matches...")
    headers = {'Authorization': f'Bearer {access_token}'}
    response = requests.get(f"{BASE_URL}/jobs/matches", headers=headers)

    if response.status_code != 200:
        print(f"[FAIL] Could not get matches: {response.text}")
        return False

    matches_data = response.json()
    matches = matches_data.get('matches', [])

    print(f"[OK] Got {len(matches)} job matches\n")

    if not matches:
        print("[WARN] No job matches found - check if jobs exist in database")
        return False

    # 3. Check compatibility scores
    print("[3] Checking compatibility scores (top 5):")
    has_non_zero_score = False

    for i, match in enumerate(matches[:5]):
        score = match.get('match_score', 0) or match.get('score', 0)
        reason = match.get('match_reason', match.get('reason', 'N/A'))
        job_id = match.get('job_id')

        # Get job details
        job_response = requests.get(f"{BASE_URL}/jobs/{job_id}", headers=headers)
        job_title = "Unknown"
        if job_response.status_code == 200:
            job_title = job_response.json().get('job', {}).get('title', 'Unknown')

        print(f"    {i+1}. Job #{job_id}: {job_title}")
        print(f"       Score: {score}")
        print(f"       Reason: {reason}")
        print()

        if score > 0:
            has_non_zero_score = True

    if has_non_zero_score:
        print("[SUCCESS] Job matching working - found non-zero scores!")
        return True
    else:
        print("[WARN] All compatibility scores are 0 - algorithm may need adjustment")
        return False

if __name__ == "__main__":
    try:
        success = test_job_matching()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
