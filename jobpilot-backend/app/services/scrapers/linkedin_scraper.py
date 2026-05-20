from .base_scraper import BaseScraper
from datetime import datetime
from typing import List, Dict
import re

class LinkedInScraper(BaseScraper):
    """Scraper para LinkedIn Jobs usando JobSpy"""

    def __init__(self):
        super().__init__('linkedin')
        self.base_url = 'https://www.linkedin.com/jobs'
        try:
            from jobspy import scrape_jobs
            self.scrape_jobs = scrape_jobs
        except ImportError:
            self.logger.warning("JobSpy library not installed. Install with: pip install jobspy")
            self.scrape_jobs = None

    def fetch_jobs(self, limit: int = 100, keyword: str = 'developer', location: str = None) -> List[Dict]:
        """Fetch jobs from LinkedIn using JobSpy"""
        jobs = []

        if not self.scrape_jobs:
            self.logger.error("JobSpy library not available")
            return jobs

        try:
            search_location = location if location else 'Chile'

            self.logger.info(f"Fetching from LinkedIn: {keyword} in {search_location}")

            # Usar JobSpy para scrapear LinkedIn
            job_list = self.scrape_jobs(
                site_name=['linkedin'],
                search_term=keyword,
                location=search_location,
                results_wanted=limit,
                hours_old=72,
            )

            for job_data in job_list:
                try:
                    job = self._parse_jobspy_result(job_data)
                    if job and 'title' in job:
                        jobs.append(job)
                except Exception as e:
                    self.logger.warning(f"Error parsing job: {str(e)}")
                    continue

        except Exception as e:
            self.logger.error(f"Error fetching from LinkedIn: {str(e)}")
            raise

        return jobs

    def _parse_jobspy_result(self, job_data) -> Dict:
        """Parse JobSpy job result"""
        try:
            job = {
                'title': job_data.get('title') or job_data.get('job_title', 'Unknown'),
                'company': job_data.get('company') or job_data.get('company_name', 'Unknown'),
                'location': job_data.get('location', 'Chile'),
                'description': job_data.get('description', ''),
                'url': job_data.get('job_url', ''),
                'posted_at': datetime.utcnow(),
            }

            return job
        except Exception as e:
            self.logger.warning(f"Error parsing JobSpy result: {str(e)}")
            return None

    def normalize_job(self, raw_job: Dict) -> Dict:
        """Normalize raw LinkedIn job to standard format"""
        job = self._get_standard_job(raw_job)

        job.update({
            'external_id': f"linkedin_{raw_job.get('url', '').split('/')[-2][:20] if raw_job.get('url') else 'unknown'}",
            'source': 'linkedin',
            'title': raw_job.get('title', '').strip(),
            'company': raw_job.get('company', '').strip(),
            'location': raw_job.get('location', 'Chile').strip(),
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
            'nodejs', 'typescript', 'nextjs', 'express', 'firebase',
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
