"""Trabajando.com job portal integration (Chile/LATAM)"""
import requests
import time
from typing import List, Dict, Any
import logging
from bs4 import BeautifulSoup
from .base import JobPortalIntegration

logger = logging.getLogger(__name__)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

class TrabajandoIntegration(JobPortalIntegration):
    """Fetch jobs from Trabajando.com (Chile/LATAM)"""

    def __init__(self, api_key: str = None):
        super().__init__(api_key)
        self.source_name = 'trabajando'
        self.base_url = 'https://www.trabajando.com'

    def fetch_jobs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Web scrape jobs from Trabajando.com"""
        try:
            jobs = []
            # Search for developer jobs in Chile
            url = f'{self.base_url}/employment?q=developer&regionId=1'
            response = requests.get(url, headers=HEADERS, timeout=10)
            response.encoding = 'utf-8'
            soup = BeautifulSoup(response.content, 'html.parser')

            job_listings = soup.find_all('article') or soup.find_all('div', class_='offering')

            for idx, item in enumerate(job_listings[:limit]):
                try:
                    title = item.find('h2') or item.find('a', class_='title')
                    company = item.find('h3') or item.find('span', class_='company')
                    location_elem = item.find('div', class_='location') or item.find('span', class_='city')

                    job = {
                        'title': title.get_text(strip=True) if title else 'N/A',
                        'company': company.get_text(strip=True) if company else 'N/A',
                        'location': location_elem.get_text(strip=True) if location_elem else 'Chile',
                        'description': item.get_text(strip=True)[:2000],
                        'requirements': self._extract_tech_skills(item.get_text()),
                        'url': title['href'] if title and title.get('href') else '',
                        'external_id': f"trabajando_{idx}"
                    }
                    jobs.append(job)
                    time.sleep(0.5)
                except Exception as e:
                    logger.debug(f"Error parsing Trabajando job: {e}")
                    continue

            logger.info(f"Trabajando: fetched {len(jobs)} jobs")
            return jobs
        except Exception as e:
            logger.error(f"Trabajando fetch error: {e}")
            return []

    def _extract_tech_skills(self, text: str) -> List[str]:
        skills = ['python', 'javascript', 'java', 'c#', 'node', 'react', 'angular',
                 'django', 'spring', 'sql', 'mongodb', 'docker', 'git', 'aws']
        found = [s for s in skills if s.lower() in text.lower()]
        return list(set(found))
