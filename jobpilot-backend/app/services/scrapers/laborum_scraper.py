from .base_scraper import BaseScraper
from datetime import datetime
from typing import List, Dict
import requests
from bs4 import BeautifulSoup
import re

class LaborumScraper(BaseScraper):
    """Scraper para Laborum.com (Chile y Latinoamérica)"""

    def __init__(self):
        super().__init__('laborum')
        self.base_url = 'https://www.laborum.com.ar'
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }

    def fetch_jobs(self, limit: int = 100, keyword: str = 'developer', location: str = None) -> List[Dict]:
        """Fetch jobs from Laborum"""
        jobs = []

        try:
            # URL de búsqueda
            search_url = f"{self.base_url}/empleos-busqueda-{keyword}"
            if location:
                search_url += f"-en-{location}"

            self.logger.info(f"Fetching from: {search_url}")
            response = requests.get(search_url, headers=self.headers, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Buscar job listings
            job_listings = soup.find_all('div', class_='jobOfferContainer')
            if not job_listings:
                job_listings = soup.find_all('article', class_='job')

            for listing in job_listings[:limit]:
                try:
                    job = self._parse_job_listing(listing)
                    if job and 'title' in job:
                        jobs.append(job)
                except Exception as e:
                    self.logger.warning(f"Error parsing job: {str(e)}")
                    continue

        except Exception as e:
            self.logger.error(f"Error fetching from Laborum: {str(e)}")
            raise

        return jobs

    def _parse_job_listing(self, listing) -> Dict:
        """Parse individual job listing"""
        try:
            # Extraer información del listing
            title_elem = listing.find('h2', class_='offerTitle') or listing.find('a', class_='title')
            company_elem = listing.find('span', class_='companyName') or listing.find('span', class_='company')
            location_elem = listing.find('span', class_='location')
            description_elem = listing.find('p', class_='description') or listing.find('span', class_='summary')
            url_elem = listing.find('a', class_='offerLink') or listing.find('a')

            job = {
                'title': title_elem.get_text(strip=True) if title_elem else 'Unknown',
                'company': company_elem.get_text(strip=True) if company_elem else 'Unknown',
                'location': location_elem.get_text(strip=True) if location_elem else 'Latinoamérica',
                'description': description_elem.get_text(strip=True) if description_elem else '',
                'url': url_elem.get('href') if url_elem else '',
                'posted_at': datetime.utcnow(),
            }

            return job
        except Exception as e:
            self.logger.warning(f"Error parsing job listing: {str(e)}")
            return None

    def normalize_job(self, raw_job: Dict) -> Dict:
        """Normalize raw Laborum job to standard format"""
        job = self._get_standard_job(raw_job)

        job.update({
            'external_id': f"laborum_{raw_job.get('url', '').split('/')[-1][:20]}",
            'source': 'laborum',
            'title': raw_job.get('title', '').strip(),
            'company': raw_job.get('company', '').strip(),
            'location': raw_job.get('location', 'Latinoamérica').strip(),
            'description': raw_job.get('description', '').strip(),
            'url': raw_job.get('url', ''),
            'posted_at': raw_job.get('posted_at', datetime.utcnow()),
        })

        if job['description']:
            job['requirements'] = self._extract_requirements(job['description'])

        salary_info = self._extract_salary(job['description'])
        if salary_info:
            job['salary_min'] = salary_info.get('min')
            job['salary_max'] = salary_info.get('max')

        return job

    def _extract_requirements(self, text: str) -> List[str]:
        """Extract job requirements from description"""
        requirements = []
        tech_keywords = [
            'python', 'javascript', 'java', 'c#', 'php', 'ruby', 'go', 'rust',
            'react', 'angular', 'vue', 'django', 'flask', 'spring', 'fastapi',
            'sql', 'mongodb', 'postgresql', 'mysql', 'docker', 'kubernetes',
            'aws', 'azure', 'gcp', 'git', 'linux', 'windows', 'mac',
        ]

        text_lower = text.lower()
        for keyword in tech_keywords:
            if keyword in text_lower:
                requirements.append(keyword)

        return list(set(requirements))[:10]

    def _extract_salary(self, text: str) -> Dict:
        """Extract salary range from description"""
        pattern = r'\$[\d.,]+(?:\s*-\s*\$[\d.,]+)?'
        matches = re.findall(pattern, text)

        if len(matches) >= 2:
            try:
                min_sal = int(matches[0].replace('$', '').replace('.', '').replace(',', ''))
                max_sal = int(matches[1].replace('$', '').replace('.', '').replace(',', ''))
                return {'min': min_sal, 'max': max_sal}
            except ValueError:
                pass

        return None
