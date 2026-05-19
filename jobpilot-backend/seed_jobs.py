#!/usr/bin/env python3
"""Script para popular la BD con empleos de ejemplo"""

from app import create_app, db
from app.models import Job
from datetime import datetime, timezone

def seed_jobs():
    app = create_app()
    with app.app_context():
        # Limpiar jobs previos
        Job.query.delete()

        jobs_data = [
            {
                'title': 'Python Developer Junior',
                'company': 'Mercado Libre',
                'location': 'Santiago',
                'description': 'Buscamos un Python Developer Junior con experiencia en Django o FastAPI para unirse a nuestro equipo de backend.',
                'requirements': ['python', 'django', 'sql', 'git', 'rest api'],
                'salary_min': 800000,
                'salary_max': 1200000,
                'job_type': 'Full-time',
                'source': 'computrabajo',
                'url': 'https://example.com/job/1'
            },
            {
                'title': 'React Developer',
                'company': 'Cornershop',
                'location': 'Santiago',
                'description': 'Se busca React Developer con experiencia en e-commerce para mejorar nuestra plataforma.',
                'requirements': ['react', 'javascript', 'typescript', 'css', 'git', 'testing'],
                'salary_min': 1300000,
                'salary_max': 1800000,
                'job_type': 'Full-time',
                'source': 'linkedin',
                'url': 'https://example.com/job/2'
            },
            {
                'title': 'Full Stack Developer',
                'company': 'Banco de Chile',
                'location': 'Santiago',
                'description': 'Desarrollador Full Stack para proyectos de transformación digital en fintech.',
                'requirements': ['python', 'react', 'sql', 'docker', 'kubernetes', 'aws'],
                'salary_min': 1500000,
                'salary_max': 2200000,
                'job_type': 'Full-time',
                'source': 'linkedin',
                'url': 'https://example.com/job/3'
            },
            {
                'title': 'Data Analyst',
                'company': 'Falabella',
                'location': 'Santiago',
                'description': 'Analista de datos para reportes y análisis de negocio.',
                'requirements': ['sql', 'python', 'excel', 'power bi', 'statistics'],
                'salary_min': 900000,
                'salary_max': 1400000,
                'job_type': 'Full-time',
                'source': 'computrabajo',
                'url': 'https://example.com/job/4'
            },
            {
                'title': 'DevOps Engineer',
                'company': 'Salmones Multiexport',
                'location': 'Puerto Montt',
                'description': 'Engineer especializado en infraestructura cloud y CI/CD.',
                'requirements': ['docker', 'kubernetes', 'jenkins', 'terraform', 'aws', 'linux'],
                'salary_min': 1200000,
                'salary_max': 1800000,
                'job_type': 'Full-time',
                'source': 'getonboard',
                'url': 'https://example.com/job/5'
            },
            {
                'title': 'QA Automation',
                'company': 'AquaChile',
                'location': 'Valparaíso',
                'description': 'QA Engineer para automatización de tests.',
                'requirements': ['python', 'selenium', 'testing', 'git', 'jenkins'],
                'salary_min': 800000,
                'salary_max': 1200000,
                'job_type': 'Full-time',
                'source': 'computrabajo',
                'url': 'https://example.com/job/6'
            },
            {
                'title': 'Senior Python Developer',
                'company': 'Cermaq',
                'location': 'Santiago',
                'description': 'Developer Senior con expertise en arquitectura de sistemas.',
                'requirements': ['python', 'sql', 'aws', 'microservices', 'architecture', 'leadership'],
                'salary_min': 2100000,
                'salary_max': 3500000,
                'job_type': 'Full-time',
                'source': 'linkedin',
                'url': 'https://example.com/job/7'
            },
            {
                'title': 'Mobile Developer Flutter',
                'company': 'Getonboard',
                'location': 'Santiago',
                'description': 'Developer Flutter para aplicaciones móviles.',
                'requirements': ['flutter', 'dart', 'mobile', 'firebase', 'git'],
                'salary_min': 950000,
                'salary_max': 1500000,
                'job_type': 'Full-time',
                'source': 'getonboard',
                'url': 'https://example.com/job/8'
            }
        ]

        for job_data in jobs_data:
            job = Job(
                title=job_data['title'],
                company=job_data['company'],
                location=job_data['location'],
                description=job_data['description'],
                requirements=job_data['requirements'],
                salary_min=job_data['salary_min'],
                salary_max=job_data['salary_max'],
                job_type=job_data['job_type'],
                source=job_data['source'],
                url=job_data['url'],
                posted_at=datetime.now(timezone.utc)
            )
            db.session.add(job)

        db.session.commit()
        print(f'Jobs added: {len(jobs_data)}')

if __name__ == '__main__':
    seed_jobs()
