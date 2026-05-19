"""Base class for job portal integrations"""
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import List, Dict, Any
import logging
import re

logger = logging.getLogger(__name__)

class JobPortalIntegration(ABC):
    """Abstract base class for all job portal integrations"""

    def __init__(self, api_key: str = None):
        self.api_key = api_key
        self.source_name = self.__class__.__name__.replace('Integration', '').lower()
        self.logger = logger

    @abstractmethod
    def fetch_jobs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Fetch jobs from portal API/website.

        Args:
            limit: Maximum number of jobs to fetch

        Returns:
            List of job dicts with keys:
            - title, company, location, description, requirements (list)
            - salary_min, salary_max, job_type
            - url, external_id
        """
        pass

    def normalize_job(self, raw_job: Dict) -> Dict:
        """Convert portal-specific format to JobPilot Job model format"""
        return {
            'title': raw_job.get('title', '')[:200],
            'company': raw_job.get('company', '')[:150],
            'location': raw_job.get('location', '')[:150],
            'description': raw_job.get('description', '')[:5000],
            'requirements': self._extract_requirements(raw_job),
            'salary_min': raw_job.get('salary_min'),
            'salary_max': raw_job.get('salary_max'),
            'job_type': raw_job.get('job_type', 'Full-time')[:50],
            'source': self.source_name,
            'external_id': str(raw_job.get('external_id', ''))[:200],
            'url': raw_job.get('url', '')[:500],
            'posted_at': raw_job.get('posted_at', datetime.now(timezone.utc))
        }

    def _extract_requirements(self, job: Dict) -> List[str]:
        """Extract and standardize skill requirements"""
        reqs = job.get('requirements', [])

        if isinstance(reqs, str):
            # Parse from description if needed
            reqs = [r.strip() for r in reqs.split(',') if r.strip()]
        elif not isinstance(reqs, list):
            reqs = []

        # Normalize: lowercase, remove duplicates
        normalized = []
        seen = set()
        for req in reqs:
            req_lower = str(req).strip().lower()
            if req_lower and req_lower not in seen and len(req_lower) < 100:
                seen.add(req_lower)
                normalized.append(req_lower)

        return normalized[:20]  # Cap at 20 skills

    def _clean_text(self, text: str) -> str:
        """Remove extra whitespace and clean text"""
        if not text:
            return ''
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
