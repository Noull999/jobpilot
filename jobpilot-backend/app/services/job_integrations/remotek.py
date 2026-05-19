"""RemoteOk job portal integration (API: https://remoteok.io/api)"""
import requests
from datetime import datetime, timezone
from typing import List, Dict, Any

from .base import JobPortalIntegration

class RemoteOkIntegration(JobPortalIntegration):
    """Fetch remote jobs from RemoteOk.io"""

    BASE_URL = 'https://remoteok.io/api'

    def __init__(self, api_key: str = None):
        super().__init__(api_key)
        self.source_name = 'remotek'

    def fetch_jobs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Fetch jobs from RemoteOk API"""
        try:
            # RemoteOk API returns all jobs, we'll limit on our side
            url = f'{self.BASE_URL}'
            response = requests.get(url, timeout=10)
            response.raise_for_status()

            jobs = response.json()
            if not isinstance(jobs, list):
                self.logger.error('RemoteOk API returned unexpected format')
                return []

            # Filter and normalize jobs
            normalized_jobs = []
            for idx, job in enumerate(jobs[:limit]):
                try:
                    normalized = self._normalize_remotek_job(job)
                    if normalized:
                        normalized_jobs.append(normalized)
                except Exception as e:
                    self.logger.warning(f'Error normalizing RemoteOk job {idx}: {str(e)}')
                    continue

            self.logger.info(f'Fetched {len(normalized_jobs)} jobs from RemoteOk')
            return normalized_jobs

        except Exception as e:
            self.logger.error(f'Error fetching RemoteOk jobs: {str(e)}')
            return []

    def _normalize_remotek_job(self, job: Dict) -> Dict:
        """Normalize RemoteOk job format"""
        try:
            # RemoteOk uses different field names
            title = job.get('title') or job.get('job_title', '')
            if not title:
                return None

            company = job.get('company', '')
            location = job.get('location', 'Remote')

            # Extract description from job_content or description
            description = job.get('description') or job.get('job_content', '')[:3000]

            # Extract salary info if available
            salary_text = job.get('salary', '')
            salary_min, salary_max = self._parse_salary(salary_text)

            # Extract requirements from description
            requirements = self._extract_requirements({
                'description': description,
                'requirements': job.get('tags', [])
            })

            # Get URL
            url = job.get('url', '')

            return self.normalize_job({
                'title': title,
                'company': company,
                'location': location,
                'description': description,
                'requirements': requirements,
                'salary_min': salary_min,
                'salary_max': salary_max,
                'job_type': 'Remote',
                'url': url,
                'external_id': f'remotek_{job.get("id", hash(title))}'
            })

        except Exception as e:
            self.logger.warning(f'Error normalizing RemoteOk job: {str(e)}')
            return None

    def _parse_salary(self, salary_text: str) -> tuple:
        """Parse salary range from text"""
        if not salary_text:
            return None, None

        try:
            import re
            # Look for patterns like "$50k" or "$50,000"
            matches = re.findall(r'\$?([\d,]+)(?:\s*k)?', str(salary_text).lower())
            if len(matches) >= 2:
                min_sal = int(matches[0].replace(',', '')) * (1000 if 'k' in salary_text.lower() else 1)
                max_sal = int(matches[1].replace(',', '')) * (1000 if 'k' in salary_text.lower() else 1)
                return min_sal, max_sal
        except:
            pass

        return None, None
