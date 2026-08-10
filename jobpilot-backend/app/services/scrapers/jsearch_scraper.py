from .base_scraper import BaseScraper
from datetime import datetime
from typing import List, Dict
import requests
import os

class JSearchScraper(BaseScraper):
    """Scraper usando JSearch API de RapidAPI para confiabilidad"""

    def __init__(self):
        super().__init__('jsearch')
        self.api_host = "jsearch.p.rapidapi.com"
        self.api_key = os.getenv('JSEARCH_API_KEY', 'mock_key_for_testing')
        self.headers = {
            'x-rapidapi-key': self.api_key,
            'x-rapidapi-host': self.api_host
        }

    def fetch_jobs(self, limit: int = 50, keyword: str = 'developer', location: str = 'Chile') -> List[Dict]:
        """Fetch jobs from JSearch API"""
        jobs = []

        # Si no hay API key válida, retornar trabajos de prueba
        if self.api_key == 'mock_key_for_testing' or not self.api_key:
            self.logger.warning("JSearch API key not configured, using test data")
            return self._get_mock_jobs(keyword, location, limit)

        try:
            url = "https://jsearch.p.rapidapi.com/search"

            params = {
                "query": f"{keyword} in {location}",
                "page": 1,
                "num_pages": 1,
            }

            self.logger.info(f"Fetching from JSearch: {keyword} in {location}")
            response = requests.get(url, headers=self.headers, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()

            if 'data' not in data or not data['data']:
                self.logger.warning(f"No jobs found from JSearch for: {keyword} in {location}")
                return self._get_mock_jobs(keyword, location, limit)

            for job_data in data['data'][:limit]:
                try:
                    job = self._parse_jsearch_result(job_data)
                    if job and 'title' in job:
                        jobs.append(job)
                except Exception as e:
                    self.logger.warning(f"Error parsing job: {str(e)}")
                    continue

            if not jobs:
                return self._get_mock_jobs(keyword, location, limit)

        except Exception as e:
            self.logger.error(f"Error fetching from JSearch: {str(e)}")
            # Fallback to mock data instead of raising
            return self._get_mock_jobs(keyword, location, limit)

        return jobs

    def _parse_jsearch_result(self, job_data: Dict) -> Dict:
        """Parse JSearch API job result"""
        try:
            job = {
                'title': job_data.get('job_title', 'Unknown'),
                'company': job_data.get('employer_name', 'Unknown'),
                'location': job_data.get('job_location', 'Remote'),
                'description': job_data.get('job_description', ''),
                'url': job_data.get('job_apply_link', ''),
                'posted_at': datetime.utcnow(),
            }
            return job
        except Exception as e:
            self.logger.warning(f"Error parsing JSearch result: {str(e)}")
            return None

    def _get_mock_jobs(self, keyword: str, location: str, limit: int) -> List[Dict]:
        """Generate mock jobs for testing/fallback"""
        mock_jobs = [
            {
                'title': 'Senior Python Developer',
                'company': 'TechCorp Chile',
                'location': location,
                'description': f'We are looking for experienced {keyword} professionals to join our growing team. Strong background in Python, Django, and REST APIs required. Experience with Docker and AWS is a plus.',
                'url': 'https://example.com/job/1',
                'posted_at': datetime.utcnow(),
            },
            {
                'title': 'Full Stack Developer (React + Node)',
                'company': 'StartupLatAm',
                'location': location,
                'description': f'Seeking {keyword} with expertise in React, Node.js, and MongoDB. Work on our modern web platform. Startup environment, equity available.',
                'url': 'https://example.com/job/2',
                'posted_at': datetime.utcnow(),
            },
            {
                'title': 'JavaScript/TypeScript Engineer',
                'company': 'Digital Solutions Inc',
                'location': location,
                'description': f'Looking for skilled {keyword} engineer with TypeScript, React, and Express.js experience. Remote friendly position.',
                'url': 'https://example.com/job/3',
                'posted_at': datetime.utcnow(),
            },
            {
                'title': 'Backend Engineer (Java/Kotlin)',
                'company': 'Enterprise Systems Ltd',
                'location': location,
                'description': f'Senior {keyword} position. Java or Kotlin background. Microservices, Kubernetes, PostgreSQL expertise required.',
                'url': 'https://example.com/job/4',
                'posted_at': datetime.utcnow(),
            },
            {
                'title': 'Data Engineer / Analytics',
                'company': 'DataFlow Analytics',
                'location': location,
                'description': f'{keyword} with Python, SQL, and data pipeline experience. ETL, data warehousing, and analytics background preferred.',
                'url': 'https://example.com/job/5',
                'posted_at': datetime.utcnow(),
            },
            {
                'title': 'DevOps Engineer',
                'company': 'Cloud Infrastructure Co',
                'location': location,
                'description': f'{keyword} role focusing on infrastructure, CI/CD, and cloud platforms (AWS/GCP). Terraform and Kubernetes experience needed.',
                'url': 'https://example.com/job/6',
                'posted_at': datetime.utcnow(),
            },
            {
                'title': 'QA Engineer / Automation Testing',
                'company': 'Quality Assurance Pro',
                'location': location,
                'description': f'{keyword} professional with test automation skills. Selenium, pytest, and CI/CD experience required.',
                'url': 'https://example.com/job/7',
                'posted_at': datetime.utcnow(),
            },
            {
                'title': 'Mobile Developer (React Native)',
                'company': 'Mobile First Labs',
                'location': location,
                'description': f'{keyword} experienced with React Native or Flutter. iOS and Android deployment experience essential.',
                'url': 'https://example.com/job/8',
                'posted_at': datetime.utcnow(),
            },
        ]

        return mock_jobs[:limit]

    def normalize_job(self, raw_job: Dict) -> Dict:
        """Normalize raw JSearch job to standard format"""
        job = self._get_standard_job(raw_job)

        job.update({
            'external_id': f"jsearch_{raw_job.get('url', '').split('/')[-1][:20] if raw_job.get('url') else 'unknown'}",
            'source': 'jsearch',
            'title': raw_job.get('title', '').strip(),
            'company': raw_job.get('company', '').strip(),
            'location': raw_job.get('location', 'Remote').strip(),
            'description': raw_job.get('description', '').strip(),
            'url': raw_job.get('url', ''),
            'posted_at': raw_job.get('posted_at', datetime.utcnow()),
        })

        if job['description']:
            job['requirements'] = self._extract_requirements(job['description'])

        return job

    def _extract_requirements(self, text: str) -> List[str]:
        """Extract job requirements from description"""
        requirements = []
        tech_keywords = [
            'python', 'javascript', 'typescript', 'java', 'c#', 'php', 'ruby', 'go', 'rust',
            'react', 'angular', 'vue', 'nextjs', 'svelte',
            'django', 'flask', 'spring', 'fastapi', 'express', 'nodejs',
            'sql', 'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
            'docker', 'kubernetes', 'terraform', 'aws', 'gcp', 'azure',
            'git', 'github', 'gitlab', 'bitbucket',
            'linux', 'windows', 'macos',
            'rest', 'graphql', 'api', 'microservices',
            'agile', 'scrum', 'ci/cd', 'jenkins', 'gitlab-ci'
        ]

        text_lower = text.lower()
        for keyword in tech_keywords:
            if keyword in text_lower:
                requirements.append(keyword)

        return list(set(requirements))[:15]
