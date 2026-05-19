"""Getonboard job portal integration (LATAM startups)"""
import logging
from typing import List, Dict, Any
from .base import JobPortalIntegration

logger = logging.getLogger(__name__)

class GetonboardIntegration(JobPortalIntegration):
    """Fetch jobs from Getonboard.com"""

    def __init__(self, api_key: str = None):
        super().__init__(api_key)
        self.source_name = 'getonboard'

    def fetch_jobs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Getonboard integration - web scraping implementation pending"""
        logger.info('Getonboard integration placeholder - implementation pending')
        return []
