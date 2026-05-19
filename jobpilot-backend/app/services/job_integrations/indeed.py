"""Indeed job portal integration"""
import requests
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
import logging

from .base import JobPortalIntegration

logger = logging.getLogger(__name__)

class IndeedIntegration(JobPortalIntegration):
    """Fetch jobs from Indeed via public search"""

    BASE_URL = 'https://www.indeed.com'

    def __init__(self, api_key: str = None):
        super().__init__(api_key)
        self.source_name = 'indeed'

    def fetch_jobs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Fetch jobs from Indeed via web scraping.
        Note: Indeed has IP-based rate limiting and anti-bot measures.
        For production, use Indeed's official API or job feed.
        """
        try:
            import time
            from bs4 import BeautifulSoup

            jobs = []
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }

            # Search for developer jobs in Chile
            search_keywords = ['python', 'developer', 'engineer']

            for keyword in search_keywords:
                if len(jobs) >= limit:
                    break

                try:
                    # Note: Indeed has strong anti-scraping measures
                    # This is a best-effort implementation
                    url = f'{self.BASE_URL}/jobs?q={keyword}&l=Chile&sort=date'

                    response = requests.get(url, headers=headers, timeout=10)
                    if response.status_code != 200:
                        logger.warning(f'Indeed returned {response.status_code}')
                        continue

                    soup = BeautifulSoup(response.text, 'html.parser')

                    # Extract job listings (structure may change)
                    job_cards = soup.find_all('div', class_='job_seen_beacon')

                    for card in job_cards:
                        if len(jobs) >= limit:
                            break

                        try:
                            job_data = self._extract_job_from_card(card)
                            if job_data:
                                jobs.append(job_data)
                        except Exception as e:
                            logger.debug(f'Error extracting Indeed job: {str(e)}')
                            continue

                    # Rate limiting: wait between requests
                    time.sleep(2)

                except Exception as e:
                    logger.warning(f'Error scraping Indeed for "{keyword}": {str(e)}')
                    continue

            logger.info(f'Fetched {len(jobs)} jobs from Indeed')
            return jobs

        except Exception as e:
            logger.error(f'Error fetching Indeed jobs: {str(e)}')
            return []

    def _extract_job_from_card(self, card) -> Dict:
        """Extract job details from Indeed job card"""
        try:
            # Title
            title_elem = card.find('h2', class_='jobTitle')
            if not title_elem:
                return None

            title = title_elem.get_text(strip=True)
            if not title:
                return None

            # Company
            company_elem = card.find('span', class_='companyName')
            company = company_elem.get_text(strip=True) if company_elem else 'Not Specified'

            # Location
            location_elem = card.find('div', class_='companyLocation')
            location = location_elem.get_text(strip=True) if location_elem else 'Chile'

            # Description/Summary
            summary_elem = card.find('div', class_='job-snippet')
            description = summary_elem.get_text(strip=True) if summary_elem else ''

            # Link
            link_elem = card.find('a', class_='jcs-JobTitle')
            url = ''
            if link_elem:
                url = link_elem.get('href', '')
                if not url.startswith('http'):
                    url = f'{self.BASE_URL}{url}'

            # Salary (if available)
            salary_text = ''
            salary_elem = card.find('span', class_='salary-snippet')
            if salary_elem:
                salary_text = salary_elem.get_text(strip=True)

            salary_min, salary_max = self._parse_salary(salary_text)

            return self.normalize_job({
                'title': title,
                'company': company,
                'location': location,
                'description': description,
                'requirements': self._extract_tech_skills(description),
                'salary_min': salary_min,
                'salary_max': salary_max,
                'job_type': 'Full-time',
                'url': url,
                'external_id': f'indeed_{hash(title + company) % 1000000}'
            })

        except Exception as e:
            logger.debug(f'Error extracting job from card: {str(e)}')
            return None

    def _extract_tech_skills(self, text: str) -> List[str]:
        """Extract tech skills from job description"""
        if not text:
            return []

        text_lower = text.lower()
        tech_skills = [
            'python', 'javascript', 'typescript', 'java', 'c#', 'php', 'ruby', 'go', 'rust',
            'react', 'vue', 'angular', 'nodejs', 'django', 'flask', 'spring',
            'postgresql', 'mysql', 'mongodb', 'redis', 'oracle',
            'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'git',
            'html', 'css', 'sql', 'api', 'rest', 'graphql'
        ]

        found = []
        seen = set()
        for skill in tech_skills:
            if skill in text_lower and skill not in seen:
                found.append(skill)
                seen.add(skill)

        return found[:15]

    def _parse_salary(self, salary_text: str) -> tuple:
        """Parse salary from text"""
        if not salary_text:
            return None, None

        try:
            import re
            matches = re.findall(r'\$?([\d,]+)', salary_text)
            if len(matches) >= 2:
                min_sal = int(matches[0].replace(',', ''))
                max_sal = int(matches[1].replace(',', ''))
                return min_sal, max_sal
        except:
            pass

        return None, None
