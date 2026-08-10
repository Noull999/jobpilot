#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'jobpilot-backend'))

from app import create_app
from app.models import User, CV

app = create_app()

with app.test_client() as client:
    with app.app_context():
        user = User.query.first()
        if not user:
            print("No test user found")
            sys.exit(1)
        
        cv = CV.query.filter_by(user_id=user.id).first()
        if not cv:
            print("No test CV found")
            sys.exit(1)
        
        cv_id = cv.id
        initial_years = cv.experience_years or 0
        
        print(f"Testing CV Update Feature")
        print(f"{'='*60}")
        print(f"CV ID: {cv_id}")
        print(f"Initial experience_years: {initial_years}")
        
        # Create a token - identity should be string
        from flask_jwt_extended import create_access_token
        token = create_access_token(identity=str(user.id))
        headers = {'Authorization': f'Bearer {token}'}
        
        new_years = 5
        print(f"Sending PUT request to update experience_years to {new_years}")
        put_response = client.put(
            f'/api/cv/update/{cv_id}',
            json={'experience_years': new_years},
            headers=headers
        )
        
        print(f"Status: {put_response.status_code}")
        data = put_response.get_json()
        print(f"Response: {data}")
        
        if put_response.status_code == 200:
            print("OK - PUT request successful!")
            from app import db
            db.session.expire_all()
            updated_cv = CV.query.get(cv_id)
            print(f"OK - Database: experience_years is now {updated_cv.experience_years}")
            if updated_cv.experience_years == new_years:
                print("OK - FEATURE WORKS: experience_years is editable and persists!")
            else:
                print(f"ERROR - Expected {new_years}, got {updated_cv.experience_years}")
        else:
            print(f"ERROR - PUT request failed with status {put_response.status_code}")
