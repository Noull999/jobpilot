"""Computrabajo.cl job portal integration (Chile)"""
import requests
from datetime import datetime, timezone
from typing import List, Dict, Any
import logging
import time

from .base import JobPortalIntegration

logger = logging.getLogger(__name__)

class ComputrabajoIntegration(JobPortalIntegration):
    """Fetch jobs from Computrabajo.cl (Chile)"""

    BASE_URL = 'https://www.computrabajo.cl'

    def __init__(self, api_key: str = None):
        super().__init__(api_key)
        self.source_name = 'computrabajo'

    def fetch_jobs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Fetch jobs from Computrabajo"""
        try:
            from bs4 import BeautifulSoup

            jobs = []
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }

            # Search for various tech positions
            searches = ['python', 'developer', 'ingeniero']

            for search_term in searches:
                if len(jobs) >= limit:
                    break

                try:
                    url = f'{self.BASE_URL}/busqueda/?q={search_term}&l=0&jobtype='

                    response = requests.get(url, headers=headers, timeout=10)
                    if response.status_code != 200:
                        logger.warning(f'Computrabajo returned {response.status_code}')
                        continue

                    soup = BeautifulSoup(response.text, 'html.parser')

                    # Find job listings
                    job_items = soup.find_all('div', class_='boxOfferWork')

                    for item in job_items:
                        if len(jobs) >= limit:
                            break

                        try:
                            job_data = self._extract_job(item)
                            if job_data:
                                jobs.append(job_data)
                        except Exception as e:
                            logger.debug(f'Error extracting Computrabajo job: {str(e)}')
                            continue

                    time.sleep(1)

                except Exception as e:
                    logger.warning(f'Error scraping Computrabajo for "{search_term}": {str(e)}')
                    continue

            logger.info(f'Fetched {len(jobs)} jobs from Computrabajo')
            return jobs

        except Exception as e:
            logger.error(f'Error fetching Computrabajo jobs: {str(e)}')
            return []

    def _extract_job(self, item) -> Dict:
        """Extract job from Computrabajo listing"""
        try:
            # Title and link
            title_elem = item.find('h2', class_='titleOffer')
            if not title_elem:
                return None

            title = title_elem.get_text(strip=True)
            link_elem = item.find('a', class_='titleOffer')
            url = link_elem.get('href', '') if link_elem else ''

            # Company
            company_elem = item.find('a', class_='company')
            company = company_elem.get_text(strip=True) if company_elem else 'Not Specified'

            # Location
            location_elem = item.find('span', class_='location')
            location = location_elem.get_text(strip=True) if location_elem else 'Chile'

            # Description
            desc_elem = item.find('div', class_='offerDescription')
            description = desc_elem.get_text(strip=True) if desc_elem else ''

            # Salary (if available)
            salary_elem = item.find('span', class_='salary')
            salary_text = salary_elem.get_text(strip=True) if salary_elem else ''

            salary_min, salary_max = self._parse_salary(salary_text)

            return self.normalize_job({
                'title': title,
                'company': company,
                'location': location,
                'description': description[:2000],
                'requirements': self._extract_skills(description),
                'salary_min': salary_min,
                'salary_max': salary_max,
                'job_type': 'Full-time',
                'url': url,
                'external_id': f'computrabajo_{hash(title) % 1000000}'
            })

        except Exception as e:
            logger.debug(f'Error extracting Computrabajo job: {str(e)}')
            return None

    def _extract_skills(self, text: str) -> List[str]:
        """Extract skills from description"""
        if not text:
            return []

        text_lower = text.lower()
        skills = [
            'python', 'javascript', 'java', 'c#', 'php', 'sql',
            'react', 'angular', 'vue', 'nodejs', 'django', 'flask',
            'aws', 'azure', 'docker', 'kubernetes', 'git', 'scrum',
            'api rest', 'html', 'css', 'mongodb', 'postgresql'
        ]

        found = []
        for skill in skills:
            if skill in text_lower:
                found.append(skill)

        return found[:15]

    def _parse_salary(self, salary_text: str) -> tuple:
        """Parse salary range"""
        if not salary_text:
            return None, None

        try:
            import re
            # Look for patterns like "$1.200.000" (Chilean format)
            matches = re.findall(r'\$?[\s]*(\d+[\.\d]*)', salary_text)
            if len(matches) >= 2:
                # Remove dots used as thousands separator
                min_sal = int(matches[0].replace('.', ''))
                max_sal = int(matches[1].replace('.', ''))
                return min_sal, max_sal
        except:
            pass

        return None, None
