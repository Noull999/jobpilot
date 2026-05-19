#!/usr/bin/env python3
"""Seed database with jobs from multiple portals for demonstration"""

import os
import sys
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import Job

def create_sample_jobs():
    """Create sample jobs for multiple portals"""
    app = create_app()

    with app.app_context():
        # Clear existing test jobs (keep seed data)
        Job.query.filter(Job.source.in_(['remotek', 'github', 'indeed'])).delete()

        # RemoteOk sample jobs
        remotek_jobs = [
            {
                'title': 'Senior Python Developer',
                'company': 'TechCorp',
                'location': 'Remote',
                'description': 'Looking for experienced Python developer to build scalable APIs. Must have 5+ years experience with Django/FastAPI, PostgreSQL, Docker, AWS.',
                'requirements': ['python', 'django', 'fastapi', 'postgresql', 'docker', 'aws', 'rest api'],
                'salary_min': 80000,
                'salary_max': 120000,
                'job_type': 'Remote',
                'source': 'remotek',
                'external_id': 'remotek_001',
                'url': 'https://remoteok.io/remote-jobs/python'
            },
            {
                'title': 'Full Stack JavaScript Developer',
                'company': 'WebAgency',
                'location': 'Remote',
                'description': 'Remote-first company seeking full stack developer. React, Node.js, PostgreSQL. Flexible hours, competitive salary.',
                'requirements': ['javascript', 'react', 'nodejs', 'postgresql', 'mongodb', 'graphql'],
                'salary_min': 60000,
                'salary_max': 90000,
                'job_type': 'Remote',
                'source': 'remotek',
                'external_id': 'remotek_002',
                'url': 'https://remoteok.io/remote-jobs/javascript'
            },
            {
                'title': 'DevOps Engineer',
                'company': 'CloudNative Inc',
                'location': 'Remote',
                'description': 'Manage Kubernetes clusters, design CI/CD pipelines, automate infrastructure. AWS, GCP, Terraform.',
                'requirements': ['docker', 'kubernetes', 'aws', 'terraform', 'ci/cd', 'bash'],
                'salary_min': 85000,
                'salary_max': 130000,
                'job_type': 'Remote',
                'source': 'remotek',
                'external_id': 'remotek_003',
                'url': 'https://remoteok.io/remote-jobs/devops'
            }
        ]

        # GitHub/Stack Overflow sample jobs
        github_jobs = [
            {
                'title': 'Go Backend Engineer',
                'company': 'StartupX',
                'location': 'San Francisco, CA',
                'description': 'Build high-performance microservices in Go. Redis, gRPC, distributed systems.',
                'requirements': ['go', 'rust', 'grpc', 'redis', 'kubernetes', 'mongodb'],
                'salary_min': 120000,
                'salary_max': 180000,
                'job_type': 'Full-time',
                'source': 'github',
                'external_id': 'github_001',
                'url': 'https://github.com/jobs/golang'
            },
            {
                'title': 'Frontend React Specialist',
                'company': 'DesignCorp',
                'location': 'New York, NY',
                'description': 'Create beautiful, performant React apps. TypeScript, Tailwind CSS, testing.',
                'requirements': ['react', 'typescript', 'tailwind css', 'jest', 'webpack'],
                'salary_min': 90000,
                'salary_max': 140000,
                'job_type': 'Full-time',
                'source': 'github',
                'external_id': 'github_002',
                'url': 'https://github.com/jobs/react'
            }
        ]

        # Indeed sample jobs (Chile)
        indeed_jobs = [
            {
                'title': 'Ingeniero Senior Python',
                'company': 'Banco TechChile',
                'location': 'Santiago, Chile',
                'description': 'Desarrollo de sistemas financieros con Python. Django, PostgreSQL, Docker. Salario competitivo, bonos, beneficios.',
                'requirements': ['python', 'django', 'postgresql', 'docker', 'linux', 'sql'],
                'salary_min': 2000000,
                'salary_max': 3500000,
                'job_type': 'Full-time',
                'source': 'indeed',
                'external_id': 'indeed_001',
                'url': 'https://indeed.com/jobs?q=python&l=Chile'
            },
            {
                'title': 'Developer JavaScript/React',
                'company': 'eCommerce Solutions',
                'location': 'Stgo/Valparaiso',
                'description': 'Desarrollo web con React, Node.js. E-commerce platform. Trabajo flexible, home office parcial.',
                'requirements': ['javascript', 'react', 'nodejs', 'mongodb', 'html', 'css'],
                'salary_min': 1500000,
                'salary_max': 2500000,
                'job_type': 'Full-time',
                'source': 'indeed',
                'external_id': 'indeed_002',
                'url': 'https://indeed.com/jobs?q=react&l=Chile'
            },
            {
                'title': 'QA Automation Engineer',
                'company': 'Testing Lab',
                'location': 'Puerto Montt, Chile',
                'description': 'Automatización de pruebas con Selenium, Jest. Salarios competitivos, bonificación trimestral.',
                'requirements': ['selenium', 'jest', 'python', 'ci/cd', 'agile', 'sql'],
                'salary_min': 1200000,
                'salary_max': 1800000,
                'job_type': 'Full-time',
                'source': 'indeed',
                'external_id': 'indeed_003',
                'url': 'https://indeed.com/jobs?q=qa&l=Chile'
            }
        ]

        all_jobs = remotek_jobs + github_jobs + indeed_jobs

        created_count = 0
        for job_data in all_jobs:
            try:
                # Check if job already exists
                existing = Job.query.filter_by(
                    external_id=job_data['external_id'],
                    source=job_data['source']
                ).first()

                if not existing:
                    job = Job(**job_data)
                    job.posted_at = datetime.now(timezone.utc) - timedelta(days=7)  # Posted 7 days ago
                    db.session.add(job)
                    created_count += 1

            except Exception as e:
                print(f"Error creating job: {str(e)}")

        db.session.commit()

        print("=" * 60)
        print("MULTI-PORTAL JOB SEEDING")
        print("=" * 60)
        print(f"Created: {created_count} new jobs")

        # Show statistics
        sources = db.session.execute(
            db.text("SELECT source, COUNT(*) as count FROM jobs GROUP BY source")
        ).fetchall()

        print("\nJobs by source:")
        total = 0
        for source, count in sources:
            print(f"  {source}: {count} jobs")
            total += count

        print(f"\nTotal jobs: {total}")
        print("=" * 60)

if __name__ == '__main__':
    create_sample_jobs()
