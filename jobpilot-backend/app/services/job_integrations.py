"""Integration layer between job scheduler and scrapers"""
import logging
from typing import List, Dict
from app.services.scrapers import (
    ComputrabajoScraper,
    TrabajandoScraper,
    LaborumScraper,
    GetonboardScraper,
    LinkedInScraper,
)

logger = logging.getLogger(__name__)

class PortalIntegration:
    """Wrapper to provide consistent interface for portal integrations"""

    def __init__(self, scraper):
        self.scraper = scraper
        self.source_name = scraper.source_name

    def fetch_jobs(self, limit: int = 100, **kwargs) -> List[Dict]:
        """Fetch raw jobs from portal"""
        return self.scraper.fetch_jobs(limit=limit, **kwargs)

    def normalize_job(self, raw_job: Dict) -> Dict:
        """Normalize job to standard format"""
        return self.scraper.normalize_job(raw_job)


_portal_integrations = {
    'computrabajo': PortalIntegration(ComputrabajoScraper()),
    'trabajando': PortalIntegration(TrabajandoScraper()),
    'laborum': PortalIntegration(LaborumScraper()),
    'getonboard': PortalIntegration(GetonboardScraper()),
    'linkedin': PortalIntegration(LinkedInScraper()),
}


def get_portal_integration(source_name: str) -> PortalIntegration:
    """Get integration for specific portal"""
    if source_name not in _portal_integrations:
        raise ValueError(f"Unknown portal: {source_name}")
    return _portal_integrations[source_name]


def get_all_portal_integrations() -> List[PortalIntegration]:
    """Get all portal integrations"""
    return list(_portal_integrations.values())


def get_available_portals() -> List[str]:
    """Get list of available portal sources"""
    return list(_portal_integrations.keys())
