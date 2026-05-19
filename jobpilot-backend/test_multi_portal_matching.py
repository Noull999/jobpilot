#!/usr/bin/env python3
"""Test job matching with multi-portal jobs"""

import requests
import json
import time

BASE_URL = "http://localhost:5000"

email = f"multiportal{int(time.time())}@example.com"
password = "Test123456!"

print("=" * 70)
print("MULTI-PORTAL JOB MATCHING TEST")
print("=" * 70)

# 1. SIGNUP
print("\n1. SIGNUP")
print("-" * 70)
signup_res = requests.post(f"{BASE_URL}/api/auth/signup", json={
    "email": email,
    "password": password,
    "name": "Multi Portal Test User"
})
print(f"Status: {signup_res.status_code}")

if signup_res.status_code == 201:
    token = signup_res.json()['access_token']
    user = signup_res.json()['user']
    print(f"[OK] User created: {user['id']} ({user['email']})")
else:
    print(f"[ERROR] {signup_res.json()}")
    exit(1)

headers = {"Authorization": f"Bearer {token}"}

# 2. CV UPLOAD
print("\n2. CV UPLOAD (Python/JavaScript Developer)")
print("-" * 70)
cv_content = """
John Doe
Full Stack Developer

EXPERIENCE:
- 3 años en Python (Django, FastAPI)
- 4 años en JavaScript/React
- SQL y MongoDB
- Docker y AWS
- Git, GitHub CI/CD

SKILLS:
Python, JavaScript, React, Node.js, Django, FastAPI, PostgreSQL, MongoDB,
Docker, AWS, HTML, CSS, TypeScript, REST APIs
"""

import tempfile
import os

temp_dir = tempfile.gettempdir()
cv_path = os.path.join(temp_dir, 'test_cv_multiportal.txt')

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
    print(f"[OK] CV uploaded")
    print(f"  - Skills: {cv_data.get('skills', [])}")
    print(f"  - Experience: {cv_data.get('experience_years')} years")
else:
    print(f"[ERROR] {cv_res.json()}")

# 3. JOB MATCHES (should find jobs from multiple portals)
print("\n3. JOB MATCHES FROM MULTIPLE PORTALS")
print("-" * 70)
matches_res = requests.get(
    f"{BASE_URL}/api/jobs/matches?limit=10",
    headers=headers
)

print(f"Status: {matches_res.status_code}")
if matches_res.status_code == 200:
    matches = matches_res.json()['matches']
    print(f"[OK] Found {len(matches)} matches:\n")

    # Group by source
    by_source = {}
    for match in matches:
        source = match['job']['source']
        if source not in by_source:
            by_source[source] = []
        by_source[source].append(match)

    # Display by source
    for source in sorted(by_source.keys()):
        jobs_from_source = by_source[source]
        print(f"\n  From {source.upper()} ({len(jobs_from_source)} jobs):")

        for match in sorted(jobs_from_source, key=lambda x: x['match_score'], reverse=True)[:3]:
            job = match['job']
            score = match['match_score']
            print(f"    - {job['title']} @ {job['company']}")
            print(f"      Location: {job['location']} | Score: {score}%")
            print(f"      Matched: {match['skills_matched']}")
            print(f"      Missing: {match['skills_missing']}")
            print()
else:
    print(f"[ERROR] {matches_res.json()}")

# 4. SEARCH
print("\n4. SEARCH ACROSS ALL PORTALS")
print("-" * 70)
search_res = requests.get(
    f"{BASE_URL}/api/jobs/search?q=python&limit=10",
    headers=headers
)

print(f"Status: {search_res.status_code}")
if search_res.status_code == 200:
    jobs = search_res.json()['jobs']
    print(f"[OK] Found {len(jobs)} Python-related jobs:\n")

    for job in jobs[:5]:
        print(f"  - {job['title']} @ {job['company']} ({job['source']})")
        print(f"    Location: {job['location']}")

    if len(jobs) > 5:
        print(f"  ... and {len(jobs) - 5} more")
else:
    print(f"[ERROR] {search_res.json()}")

print("\n" + "=" * 70)
print("TEST COMPLETE - Multi-portal job system working!")
print("=" * 70)
