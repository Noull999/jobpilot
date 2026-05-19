"""LinkedIn job portal integration"""
import logging
import requests
import time
import json
from typing import List, Dict, Any
from bs4 import BeautifulSoup
from .base import JobPortalIntegration

logger = logging.getLogger(__name__)

class LinkedinIntegration(JobPortalIntegration):
    """Fetch jobs from LinkedIn Jobs"""

    def __init__(self, api_key: str = None):
        super().__init__(api_key)
        self.source_name = 'linkedin'
        self.api_token = api_key

    def fetch_jobs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Fetch jobs from LinkedIn Jobs API or public search"""
        jobs = []

        # Method 1: Try LinkedIn Jobs API if API key provided
        if self.api_token:
            jobs = self._fetch_via_api(limit)

        # Method 2: Fallback to public job listings scraping
        if not jobs or len(jobs) == 0:
            jobs = self._fetch_via_public_search(limit)

        logger.info(f"LinkedIn: fetched {len(jobs)} jobs")
        return jobs

    def _fetch_via_api(self, limit: int) -> List[Dict[str, Any]]:
        """Fetch using LinkedIn API (requires OAuth2 token)"""
        try:
            # LinkedIn API v2 endpoint (requires proper scopes)
            url = 'https://api.linkedin.com/v2/jobs'
            headers = {
                'Authorization': f'Bearer {self.api_token}',
                'Content-Type': 'application/json'
            }
            params = {
                'keywords': 'python developer',
                'count': limit
            }

            response = requests.get(url, headers=headers, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                jobs = data.get('elements', [])

                normalized_jobs = []
                for job in jobs:
                    normalized = {
                        'title': job.get('title', 'N/A'),
                        'company': job.get('companyName', 'N/A'),
                        'location': job.get('location', {}).get('country', 'N/A'),
                        'description': job.get('description', '')[:2000],
                        'requirements': self._extract_skills(job.get('description', '')),
                        'url': job.get('jobUrl', ''),
                        'external_id': f"linkedin_{job.get('id', '')}"
                    }
                    normalized_jobs.append(normalized)

                return normalized_jobs
        except Exception as e:
            logger.debug(f"LinkedIn API fetch failed: {e}")

        return []

    def _fetch_via_public_search(self, limit: int) -> List[Dict[str, Any]]:
        """Fetch from LinkedIn public job search page"""
        try:
            jobs = []
            # LinkedIn Jobs public search URL
            url = 'https://www.linkedin.com/jobs/search/?keywords=python%20developer'

            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }

            response = requests.get(url, headers=headers, timeout=10)
            soup = BeautifulSoup(response.content, 'html.parser')

            # LinkedIn renders jobs dynamically - look for job listing elements
            job_listings = soup.find_all('div', class_='job-search-card') or \
                          soup.find_all('div', {'data-job-id': True})

            for item in job_listings[:limit]:
                try:
                    title_elem = item.find('h3', class_='base-search-card__title') or item.find('a')
                    company_elem = item.find('h4', class_='base-search-card__subtitle') or \
                                  item.find('div', class_='company-name')

                    job = {
                        'title': title_elem.get_text(strip=True) if title_elem else 'N/A',
                        'company': company_elem.get_text(strip=True) if company_elem else 'N/A',
                        'location': 'International',
                        'description': item.get_text(strip=True)[:2000],
                        'requirements': ['linkedin', 'professional'],
                        'url': title_elem.get('href') if title_elem and title_elem.get('href') else '',
                        'external_id': f"linkedin_{len(jobs)}"
                    }
                    jobs.append(job)
                    time.sleep(1)
                except Exception as e:
                    logger.debug(f"Error parsing LinkedIn job: {e}")
                    continue

            return jobs
        except Exception as e:
            logger.error(f"LinkedIn public search failed: {e}")
            return []

    def _extract_skills(self, text: str) -> List[str]:
        """Extract tech skills from job description"""
        skills = ['python', 'javascript', 'java', 'c#', 'react', 'nodejs', 'django',
                 'fastapi', 'postgresql', 'mongodb', 'docker', 'aws', 'git', 'kubernetes']
        found = [s for s in skills if s.lower() in text.lower()]
        return list(set(found))
