from abc import ABC, abstractmethod
import logging
from datetime import datetime
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class BaseScraper(ABC):
    """Base class for all job portal scrapers"""

    def __init__(self, source_name: str, max_retries: int = 3):
        self.source_name = source_name
        self.max_retries = max_retries
        self.logger = logging.getLogger(f"{__name__}.{source_name}")

    @abstractmethod
    def fetch_jobs(self, limit: int = 100, **kwargs) -> List[Dict]:
        """Fetch jobs from portal. Returns list of raw job dicts."""
        pass

    @abstractmethod
    def normalize_job(self, raw_job: Dict) -> Dict:
        """Convert raw job data to standard format."""
        pass

    def normalize_jobs(self, raw_jobs: List[Dict]) -> List[Dict]:
        """Normalize multiple jobs."""
        return [self.normalize_job(job) for job in raw_jobs]

    def _ensure_required_fields(self, job: Dict, required: List[str]) -> bool:
        """Check if job has all required fields."""
        return all(field in job and job[field] for field in required)

    def _get_standard_job(self, raw_job: Dict) -> Dict:
        """Template for standard job format."""
        return {
            'external_id': None,
            'source': self.source_name,
            'title': None,
            'company': None,
            'location': None,
            'description': None,
            'requirements': [],
            'salary_min': None,
            'salary_max': None,
            'salary_currency': 'CLP',
            'job_type': 'fulltime',
            'posted_at': datetime.utcnow(),
            'url': None,
            'raw_data': raw_job,
        }

    def scrape_with_retry(self, **kwargs) -> List[Dict]:
        """Fetch and normalize jobs with retry logic."""
        for attempt in range(self.max_retries):
            try:
                self.logger.info(f"🔄 Scraping {self.source_name} (attempt {attempt + 1}/{self.max_retries})")
                raw_jobs = self.fetch_jobs(**kwargs)

                if not raw_jobs:
                    self.logger.warning(f"⚠️ No jobs found from {self.source_name}")
                    return []

                normalized = self.normalize_jobs(raw_jobs)
                self.logger.info(f"✅ Successfully scraped {len(normalized)} jobs from {self.source_name}")
                return normalized

            except Exception as e:
                self.logger.error(f"❌ Error scraping {self.source_name}: {str(e)}")
                if attempt == self.max_retries - 1:
                    self.logger.error(f"💥 Failed after {self.max_retries} attempts")
                    raise

        return []
