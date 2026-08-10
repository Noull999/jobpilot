"""JSearch job portal integration with reliable mock fallback"""
import requests
from datetime import datetime, timezone
from typing import List, Dict, Any
import logging

from .base import JobPortalIntegration

logger = logging.getLogger(__name__)

class JsearchIntegration(JobPortalIntegration):
    """Fetch jobs from JSearch API with reliable mock fallback"""

    BASE_URL = 'https://jsearch.p.rapidapi.com'

    def __init__(self, api_key: str = None):
        super().__init__(api_key)
        self.source_name = 'jsearch'
        self.api_host = 'jsearch.p.rapidapi.com'

    def fetch_jobs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Fetch jobs from JSearch API or return mock data"""
        jobs = []

        # If API key is not available, use mock data
        if not self.api_key or self.api_key == 'mock_key_for_testing':
            logger.warning('JSearch API key not configured, using mock data')
            return self._get_mock_jobs(limit)

        try:
            headers = {
                'x-rapidapi-key': self.api_key,
                'x-rapidapi-host': self.api_host
            }

            params = {
                'query': 'developer in Chile',
                'page': 1,
                'num_pages': 1,
            }

            response = requests.get(
                f'{self.BASE_URL}/search',
                headers=headers,
                params=params,
                timeout=10
            )
            response.raise_for_status()

            data = response.json()

            if 'data' not in data or not data['data']:
                logger.warning('No jobs found from JSearch, using mock data')
                return self._get_mock_jobs(limit)

            for job_data in data['data'][:limit]:
                try:
                    job = self._normalize_jsearch_job(job_data)
                    if job:
                        jobs.append(job)
                except Exception as e:
                    logger.warning(f'Error normalizing JSearch job: {str(e)}')
                    continue

            logger.info(f'Fetched {len(jobs)} jobs from JSearch')
            return jobs if jobs else self._get_mock_jobs(limit)

        except Exception as e:
            logger.error(f'Error fetching JSearch jobs: {str(e)}. Using mock data.')
            return self._get_mock_jobs(limit)

    def _normalize_jsearch_job(self, job: Dict) -> Dict:
        """Normalize JSearch job format"""
        try:
            title = job.get('job_title', '')
            if not title:
                return None

            return self.normalize_job({
                'title': title,
                'company': job.get('employer_name', 'Unknown'),
                'location': job.get('job_location', 'Remote'),
                'description': job.get('job_description', '')[:3000],
                'requirements': job.get('job_required_skills', []),
                'salary_min': job.get('job_salary_min'),
                'salary_max': job.get('job_salary_max'),
                'job_type': job.get('job_employment_type', 'Full-time'),
                'url': job.get('job_apply_link', ''),
                'external_id': f'jsearch_{job.get("job_id", hash(title))}'
            })

        except Exception as e:
            logger.warning(f'Error normalizing JSearch job: {str(e)}')
            return None

    def _get_mock_jobs(self, limit: int) -> List[Dict]:
        """Generate mock jobs for testing/fallback"""
        mock_jobs_data = [
            {
                'title': 'Senior Python Developer',
                'company': 'TechCorp Chile',
                'location': 'Santiago, Chile',
                'description': 'We are looking for experienced Python developers to join our growing team. Strong background in Python, Django, and REST APIs required. Experience with Docker and AWS is a plus. Work on modern web applications serving millions of users.',
                'requirements': ['python', 'django', 'rest-api', 'docker', 'aws', 'postgresql'],
                'salary_min': 2500000,
                'salary_max': 3500000,
                'job_type': 'Full-time',
                'url': 'https://remoteok.io/remote-jobs/python-developer-techcorp',
            },
            {
                'title': 'Full Stack Developer (React + Node)',
                'company': 'StartupLatAm',
                'location': 'Remote',
                'description': 'Seeking Full Stack developer with expertise in React, Node.js, and MongoDB. Work on our modern web platform. Startup environment with equity options available. Flexible working hours, fully remote.',
                'requirements': ['react', 'nodejs', 'javascript', 'mongodb', 'rest-api', 'git'],
                'salary_min': 2000000,
                'salary_max': 2800000,
                'job_type': 'Full-time',
                'url': 'https://remoteok.io/remote-jobs/fullstack-startupLatAm',
            },
            {
                'title': 'TypeScript/React Engineer',
                'company': 'Digital Solutions Inc',
                'location': 'Valparaíso, Chile',
                'description': 'Looking for skilled engineer with TypeScript, React, and Express.js experience. Build responsive web applications for enterprise clients. Remote friendly with occasional onsite meetings. Competitive salary and benefits.',
                'requirements': ['typescript', 'react', 'expressjs', 'javascript', 'html-css'],
                'salary_min': 1800000,
                'salary_max': 2600000,
                'job_type': 'Full-time',
                'url': 'https://remoteok.io/remote-jobs/react-digitalsolutions',
            },
            {
                'title': 'Backend Engineer (Java/Kotlin)',
                'company': 'Enterprise Systems Ltd',
                'location': 'Santiago, Chile',
                'description': 'Senior position for Backend Engineer. Java or Kotlin background required. Microservices architecture, Kubernetes, PostgreSQL expertise essential. We work with AWS and modern DevOps practices.',
                'requirements': ['java', 'kotlin', 'microservices', 'kubernetes', 'postgresql', 'aws', 'docker'],
                'salary_min': 2800000,
                'salary_max': 3800000,
                'job_type': 'Full-time',
                'url': 'https://remoteok.io/remote-jobs/java-backend-enterprise',
            },
            {
                'title': 'Data Engineer / Analytics',
                'company': 'DataFlow Analytics',
                'location': 'Remote',
                'description': 'Data Engineer role with focus on Python, SQL, and data pipeline experience. ETL development, data warehousing, and analytics. Work with Big Data tools and modern cloud platforms.',
                'requirements': ['python', 'sql', 'apache-spark', 'data-warehousing', 'aws', 'docker'],
                'salary_min': 2200000,
                'salary_max': 3200000,
                'job_type': 'Full-time',
                'url': 'https://remoteok.io/remote-jobs/dataeng-dataflow',
            },
            {
                'title': 'DevOps Engineer',
                'company': 'Cloud Infrastructure Co',
                'location': 'Remote',
                'description': 'DevOps Engineer focused on infrastructure, CI/CD pipelines, and cloud platforms (AWS/GCP). Terraform and Kubernetes experience needed. Monitor and optimize cloud infrastructure.',
                'requirements': ['kubernetes', 'terraform', 'ci-cd', 'aws', 'gcp', 'docker', 'linux'],
                'salary_min': 2400000,
                'salary_max': 3400000,
                'job_type': 'Full-time',
                'url': 'https://remoteok.io/remote-jobs/devops-cloud-infra',
            },
            {
                'title': 'QA Engineer / Test Automation',
                'company': 'Quality Assurance Pro',
                'location': 'Santiago, Chile',
                'description': 'QA professional with expertise in test automation. Selenium, pytest, and CI/CD experience required. Ensure quality of web and mobile applications.',
                'requirements': ['selenium', 'pytest', 'python', 'ci-cd', 'javascript', 'testing'],
                'salary_min': 1600000,
                'salary_max': 2400000,
                'job_type': 'Full-time',
                'url': 'https://remoteok.io/remote-jobs/qa-automation-pro',
            },
            {
                'title': 'Mobile Developer (React Native)',
                'company': 'Mobile First Labs',
                'location': 'Remote',
                'description': 'Mobile Developer experienced with React Native or Flutter. iOS and Android deployment experience essential. Create cross-platform mobile applications.',
                'requirements': ['react-native', 'javascript', 'typescript', 'ios', 'android'],
                'salary_min': 1900000,
                'salary_max': 2800000,
                'job_type': 'Full-time',
                'url': 'https://remoteok.io/remote-jobs/mobile-reactnative',
            },
            {
                'title': 'Frontend Developer (Vue.js)',
                'company': 'WebDevelopment Studio',
                'location': 'Concepción, Chile',
                'description': 'Frontend specialist with Vue.js expertise. Create beautiful and responsive user interfaces. Work with modern frontend tools and frameworks.',
                'requirements': ['vue.js', 'javascript', 'html-css', 'webpack', 'git'],
                'salary_min': 1700000,
                'salary_max': 2500000,
                'job_type': 'Full-time',
                'url': 'https://remoteok.io/remote-jobs/vue-webdev',
            },
            {
                'title': 'Cloud Architect',
                'company': 'Cloud Consulting Group',
                'location': 'Santiago, Chile',
                'description': 'Design and implement cloud solutions for enterprise clients. AWS and GCP expertise. Lead technical teams and mentor junior engineers.',
                'requirements': ['aws', 'gcp', 'kubernetes', 'terraform', 'architecture', 'devops'],
                'salary_min': 3500000,
                'salary_max': 4500000,
                'job_type': 'Full-time',
                'url': 'https://remoteok.io/remote-jobs/architect-cloud-consulting',
            },
        ]

        normalized_jobs = []
        for idx, job_data in enumerate(mock_jobs_data[:limit]):
            try:
                normalized = self.normalize_job({
                    **job_data,
                    'external_id': f'jsearch_mock_{idx}',
                    'posted_at': datetime.now(timezone.utc)
                })
                if normalized:
                    normalized_jobs.append(normalized)
            except Exception as e:
                logger.warning(f'Error normalizing mock job {idx}: {str(e)}')
                continue

        return normalized_jobs
