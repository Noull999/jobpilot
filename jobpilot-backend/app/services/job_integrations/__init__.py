"""Job portal integration module"""
import os
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Import all portal integrations
from .base import JobPortalIntegration
from .jsearch import JsearchIntegration
from .remotek import RemoteOkIntegration
from .github import GitHubJobsIntegration
from .indeed import IndeedIntegration
from .computrabajo import ComputrabajoIntegration
from .trabajando import TrabajandoIntegration
from .linkedin import LinkedinIntegration
from .getonboard import GetonboardIntegration
from .other_portals import (
    LabormIntegration,
    OlxIntegration,
    GlassdoorIntegration,
    StackOverflowIntegration,
    WeWorkRemotelyIntegration,
    VivanuncioIntegration,
    BolsaTrabajoIntegration
)

# Dictionary of all available integrations
AVAILABLE_INTEGRATIONS = {
    'jsearch': JsearchIntegration,
    'remotek': RemoteOkIntegration,
    'github': GitHubJobsIntegration,
    'indeed': IndeedIntegration,
    'computrabajo': ComputrabajoIntegration,
    'trabajando': TrabajandoIntegration,
    'linkedin': LinkedinIntegration,
    'getonboard': GetonboardIntegration,
    'laborum': LabormIntegration,
    'olx': OlxIntegration,
    'glassdoor': GlassdoorIntegration,
    'stackoverflow': StackOverflowIntegration,
    'weworkremotely': WeWorkRemotelyIntegration,
    'vivanuncio': VivanuncioIntegration,
    'bolsa_trabajo': BolsaTrabajoIntegration,
}

def get_portal_integration(portal_name: str) -> JobPortalIntegration:
    """Get integration instance for a specific portal"""
    portal_name_lower = portal_name.lower()

    if portal_name_lower not in AVAILABLE_INTEGRATIONS:
        raise ValueError(f"Unknown portal: {portal_name}. Available: {list(AVAILABLE_INTEGRATIONS.keys())}")

    integration_class = AVAILABLE_INTEGRATIONS[portal_name_lower]
    api_key = os.getenv(f'{portal_name.upper()}_API_KEY')

    return integration_class(api_key=api_key)

def get_all_portal_integrations() -> List[JobPortalIntegration]:
    """Get instances of all available integrations"""
    integrations = []
    for portal_name, integration_class in AVAILABLE_INTEGRATIONS.items():
        api_key = os.getenv(f'{portal_name.upper()}_API_KEY')
        integrations.append(integration_class(api_key=api_key))
    return integrations

__all__ = [
    'JobPortalIntegration',
    'get_portal_integration',
    'get_all_portal_integrations',
    'AVAILABLE_INTEGRATIONS'
]
