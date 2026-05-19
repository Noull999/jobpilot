"""Web scraping integrations for job portals"""
import logging
import requests
import time
import re
from typing import List, Dict, Any
from bs4 import BeautifulSoup
from .base import JobPortalIntegration

logger = logging.getLogger(__name__)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

class LabormIntegration(JobPortalIntegration):
    """Laborum.cl integration - Chile job portal"""
    def __init__(self, api_key: str = None):
        super().__init__(api_key)
        self.source_name = 'laborum'
        self.base_url = 'https://www.laborum.cl'

    def fetch_jobs(self, limit: int = 100) -> List[Dict[str, Any]]:
        try:
            jobs = []
            url = f'{self.base_url}/trabajos-de-developer.html'
            response = requests.get(url, headers=HEADERS, timeout=10)
            response.encoding = 'utf-8'
            soup = BeautifulSoup(response.content, 'html.parser')

            job_cards = soup.find_all('article', class_='Card_mainCard__') or \
                       soup.find_all('div', class_='jobListJob') or \
                       soup.find_all('div', {'data-jobid': True})

            for card in job_cards[:limit]:
                try:
                    title = card.find('h2') or card.find('a', class_='job-title')
                    company = card.find('div', class_='company') or card.find('span', class_='empresa')
                    location = card.find('span', class_='location') or card.find('div', class_='lugar')

                    job = {
                        'title': title.get_text(strip=True) if title else 'N/A',
                        'company': company.get_text(strip=True) if company else 'N/A',
                        'location': location.get_text(strip=True) if location else 'Santiago',
                        'description': card.get_text(strip=True)[:2000],
                        'requirements': self._extract_tech_skills(card.get_text()),
                        'url': card.find('a')['href'] if card.find('a') else '',
                        'external_id': f"laborum_{len(jobs)}"
                    }
                    jobs.append(job)
                    time.sleep(0.5)
                except Exception as e:
                    logger.debug(f"Error parsing Laborum job: {e}")
                    continue

            logger.info(f"Laborum: fetched {len(jobs)} jobs")
            return jobs
        except Exception as e:
            logger.error(f"Laborum fetch error: {e}")
            return []

    def _extract_tech_skills(self, text: str) -> List[str]:
        skills = ['python', 'javascript', 'java', 'c#', 'php', 'react', 'nodejs',
                 'django', 'fastapi', 'postgresql', 'mongodb', 'docker', 'aws', 'git']
        found = [s for s in skills if s.lower() in text.lower()]
        return list(set(found))

class GetonboardIntegration(JobPortalIntegration):
    """Getonboard integration - LATAM startups"""
    def __init__(self, api_key: str = None):
        super().__init__(api_key)
        self.source_name = 'getonboard'
        self.base_url = 'https://www.getonboard.com'

    def fetch_jobs(self, limit: int = 100) -> List[Dict[str, Any]]:
        try:
            jobs = []
            url = f'{self.base_url}/jobs?region=cl&search=developer&kinds=&seniorities='
            response = requests.get(url, headers=HEADERS, timeout=10)
            soup = BeautifulSoup(response.content, 'html.parser')

            job_items = soup.find_all('a', class_='job-card') or \
                       soup.find_all('div', class_='job-item')

            for item in job_items[:limit]:
                try:
                    title_elem = item.find('h2') or item.find('h3')
                    company_elem = item.find('p', class_='company') or item.find('span', class_='company-name')

                    job = {
                        'title': title_elem.get_text(strip=True) if title_elem else 'N/A',
                        'company': company_elem.get_text(strip=True) if company_elem else 'N/A',
                        'location': 'Santiago, Chile',
                        'description': item.get_text(strip=True)[:2000],
                        'requirements': ['startup', 'developer', 'tech'],
                        'url': f"{self.base_url}{item['href']}" if item.get('href') else '',
                        'external_id': f"getonboard_{len(jobs)}"
                    }
                    jobs.append(job)
                    time.sleep(0.5)
                except Exception as e:
                    logger.debug(f"Error parsing Getonboard job: {e}")
                    continue

            logger.info(f"Getonboard: fetched {len(jobs)} jobs")
            return jobs
        except Exception as e:
            logger.error(f"Getonboard fetch error: {e}")
            return []

class TrabajandoIntegration(JobPortalIntegration):
    """Trabajando.com integration - LATAM jobs"""
    def __init__(self, api_key: str = None):
        super().__init__(api_key)
        self.source_name = 'trabajando'
        self.base_url = 'https://www.trabajando.com'

    def fetch_jobs(self, limit: int = 100) -> List[Dict[str, Any]]:
        try:
            jobs = []
            # Using search for developer jobs in Chile
            url = f'{self.base_url}/employment?q=developer&regionId=1'  # 1 = Chile
            response = requests.get(url, headers=HEADERS, timeout=10)
            response.encoding = 'utf-8'
            soup = BeautifulSoup(response.content, 'html.parser')

            job_listings = soup.find_all('article') or soup.find_all('div', class_='offering')

            for item in job_listings[:limit]:
                try:
                    title = item.find('h2') or item.find('a', class_='title')
                    company = item.find('h3') or item.find('span', class_='company')

                    job = {
                        'title': title.get_text(strip=True) if title else 'N/A',
                        'company': company.get_text(strip=True) if company else 'N/A',
                        'location': 'Chile',
                        'description': item.get_text(strip=True)[:2000],
                        'requirements': self._extract_tech_skills(item.get_text()),
                        'url': item.find('a')['href'] if item.find('a') and item.find('a').get('href') else '',
                        'external_id': f"trabajando_{len(jobs)}"
                    }
                    jobs.append(job)
                    time.sleep(0.5)
                except Exception as e:
                    logger.debug(f"Error parsing Trabajando job: {e}")
                    continue

            logger.info(f"Trabajando: fetched {len(jobs)} jobs")
            return jobs
        except Exception as e:
            logger.error(f"Trabajando fetch error: {e}")
            return []

    def _extract_tech_skills(self, text: str) -> List[str]:
        skills = ['python', 'javascript', 'java', 'c#', 'node', 'react', 'angular',
                 'django', 'spring', 'sql', 'mongodb', 'docker', 'git']
        found = [s for s in skills if s.lower() in text.lower()]
        return list(set(found))

class OlxIntegration(JobPortalIntegration):
    """OLX integration - LATAM classifieds"""
    def __init__(self, api_key: str = None):
        super().__init__(api_key)
        self.source_name = 'olx'

    def fetch_jobs(self, limit: int = 100) -> List[Dict[str, Any]]:
        try:
            jobs = []
            # OLX has jobs in Services category - search for developer
            url = 'https://www.olx.cl/items/q-developer/?category=1000'
            response = requests.get(url, headers=HEADERS, timeout=10)
            soup = BeautifulSoup(response.content, 'html.parser')

            listings = soup.find_all('a', class_='item') or soup.find_all('div', class_='listing')

            for item in listings[:limit]:
                try:
                    title = item.find('h2') or item
                    job = {
                        'title': title.get_text(strip=True)[:100] if title else 'N/A',
                        'company': 'OLX User',
                        'location': 'Chile',
                        'description': item.get_text(strip=True)[:2000],
                        'requirements': ['freelance', 'services'],
                        'url': f"https://www.olx.cl{item['href']}" if item.get('href') else '',
                        'external_id': f"olx_{len(jobs)}"
                    }
                    jobs.append(job)
                    time.sleep(0.5)
                except Exception as e:
                    logger.debug(f"Error parsing OLX job: {e}")
                    continue

            logger.info(f"OLX: fetched {len(jobs)} jobs")
            return jobs
        except Exception as e:
            logger.error(f"OLX fetch error: {e}")
            return []

class GlassdoorIntegration(JobPortalIntegration):
    """Glassdoor integration"""
    def __init__(self, api_key: str = None):
        super().__init__(api_key)
        self.source_name = 'glassdoor'

    def fetch_jobs(self, limit: int = 100) -> List[Dict[str, Any]]:
        try:
            jobs = []
            # Glassdoor requires authentication, using public job listings page
            url = 'https://www.glassdoor.com/Job/jobs.htm?suggestCount=0&suggestChosen=false&clickSource=searchBtn&typedKeyword=software+developer&sc.keyword=software+developer&locT=C&locId=1&jobType='

            response = requests.get(url, headers=HEADERS, timeout=10)
            soup = BeautifulSoup(response.content, 'html.parser')

            job_items = soup.find_all('li', class_='react-job-listing') or \
                       soup.find_all('div', class_='job-item')

            for item in job_items[:limit]:
                try:
                    title = item.find('a', class_='jobTitle')
                    company = item.find('div', class_='employerName')
                    location = item.find('div', class_='location')

                    job = {
                        'title': title.get_text(strip=True) if title else 'N/A',
                        'company': company.get_text(strip=True) if company else 'N/A',
                        'location': location.get_text(strip=True) if location else 'USA',
                        'description': item.get_text(strip=True)[:2000],
                        'requirements': ['software', 'developer'],
                        'url': title['href'] if title and title.get('href') else '',
                        'external_id': f"glassdoor_{len(jobs)}"
                    }
                    jobs.append(job)
                    time.sleep(1)
                except Exception as e:
                    logger.debug(f"Error parsing Glassdoor job: {e}")
                    continue

            logger.info(f"Glassdoor: fetched {len(jobs)} jobs")
            return jobs
        except Exception as e:
            logger.error(f"Glassdoor fetch error: {e}")
            return []

class StackOverflowIntegration(JobPortalIntegration):
    """Stack Overflow jobs integration"""
    def __init__(self, api_key: str = None):
        super().__init__(api_key)
        self.source_name = 'stackoverflow'

    def fetch_jobs(self, limit: int = 100) -> List[Dict[str, Any]]:
        try:
            jobs = []
            # Stack Overflow Jobs API endpoint
            url = 'https://stackoverflow.com/jobs?q=python&sort=newest'
            response = requests.get(url, headers=HEADERS, timeout=10)
            soup = BeautifulSoup(response.content, 'html.parser')

            job_items = soup.find_all('div', class_='s-job-card') or \
                       soup.find_all('-job-item')

            for item in job_items[:limit]:
                try:
                    title = item.find('a', class_='s-link')
                    company = item.find('a', class_='s-employer-link')

                    job = {
                        'title': title.get_text(strip=True) if title else 'N/A',
                        'company': company.get_text(strip=True) if company else 'N/A',
                        'location': 'Remote',
                        'description': item.get_text(strip=True)[:2000],
                        'requirements': self._extract_tags(item),
                        'url': title['href'] if title and title.get('href') else '',
                        'external_id': f"stackoverflow_{len(jobs)}"
                    }
                    jobs.append(job)
                    time.sleep(0.5)
                except Exception as e:
                    logger.debug(f"Error parsing Stack Overflow job: {e}")
                    continue

            logger.info(f"Stack Overflow: fetched {len(jobs)} jobs")
            return jobs
        except Exception as e:
            logger.error(f"Stack Overflow fetch error: {e}")
            return []

    def _extract_tags(self, item) -> List[str]:
        tags = item.find_all('div', class_='post-tag')
        return [tag.get_text(strip=True) for tag in tags]

class WeWorkRemotelyIntegration(JobPortalIntegration):
    """We Work Remotely integration"""
    def __init__(self, api_key: str = None):
        super().__init__(api_key)
        self.source_name = 'weworkremotely'

    def fetch_jobs(self, limit: int = 100) -> List[Dict[str, Any]]:
        try:
            jobs = []
            url = 'https://weworkremotely.com/remote-jobs/search'
            params = {'term': 'python'}
            response = requests.get(url, params=params, headers=HEADERS, timeout=10)
            soup = BeautifulSoup(response.content, 'html.parser')

            job_items = soup.find_all('section', class_='job') or \
                       soup.find_all('div', class_='job-item')

            for item in job_items[:limit]:
                try:
                    title = item.find('a', class_='job-title') or item.find('h3')
                    company = item.find('a', class_='company-name') or item.find('span', class_='company')

                    job = {
                        'title': title.get_text(strip=True) if title else 'N/A',
                        'company': company.get_text(strip=True) if company else 'N/A',
                        'location': 'Remote',
                        'description': item.get_text(strip=True)[:2000],
                        'requirements': ['remote', 'python'],
                        'url': title.get('href') if title and title.get('href') else '',
                        'external_id': f"weworkremotely_{len(jobs)}"
                    }
                    jobs.append(job)
                    time.sleep(0.5)
                except Exception as e:
                    logger.debug(f"Error parsing We Work Remotely job: {e}")
                    continue

            logger.info(f"We Work Remotely: fetched {len(jobs)} jobs")
            return jobs
        except Exception as e:
            logger.error(f"We Work Remotely fetch error: {e}")
            return []

class VivanuncioIntegration(JobPortalIntegration):
    """Vivanuncio integration - LATAM classifieds"""
    def __init__(self, api_key: str = None):
        super().__init__(api_key)
        self.source_name = 'vivanuncio'

    def fetch_jobs(self, limit: int = 100) -> List[Dict[str, Any]]:
        try:
            jobs = []
            url = 'https://www.vivanuncios.com.mx/s-tecnologia-informatica'
            response = requests.get(url, headers=HEADERS, timeout=10)
            response.encoding = 'utf-8'
            soup = BeautifulSoup(response.content, 'html.parser')

            listings = soup.find_all('div', class_='item') or \
                      soup.find_all('li', class_='listing')

            for item in listings[:limit]:
                try:
                    title = item.find('h2') or item.find('a')
                    job = {
                        'title': title.get_text(strip=True)[:100] if title else 'N/A',
                        'company': 'Vivanuncios User',
                        'location': 'Mexico',
                        'description': item.get_text(strip=True)[:2000],
                        'requirements': ['tech', 'services'],
                        'url': title.get('href') if title and title.get('href') else '',
                        'external_id': f"vivanuncio_{len(jobs)}"
                    }
                    jobs.append(job)
                    time.sleep(0.5)
                except Exception as e:
                    logger.debug(f"Error parsing Vivanuncio job: {e}")
                    continue

            logger.info(f"Vivanuncio: fetched {len(jobs)} jobs")
            return jobs
        except Exception as e:
            logger.error(f"Vivanuncio fetch error: {e}")
            return []

class BolsaTrabajoIntegration(JobPortalIntegration):
    """Bolsa de Trabajo Chile integration"""
    def __init__(self, api_key: str = None):
        super().__init__(api_key)
        self.source_name = 'bolsa_trabajo'

    def fetch_jobs(self, limit: int = 100) -> List[Dict[str, Any]]:
        try:
            jobs = []
            url = 'https://www.bolsadetrabajo.cl/busqueda/trabajos?q=developer'
            response = requests.get(url, headers=HEADERS, timeout=10)
            response.encoding = 'utf-8'
            soup = BeautifulSoup(response.content, 'html.parser')

            job_items = soup.find_all('div', class_='resultado') or \
                       soup.find_all('article', class_='job')

            for item in job_items[:limit]:
                try:
                    title = item.find('h2') or item.find('a', class_='titulo')
                    company = item.find('span', class_='empresa')

                    job = {
                        'title': title.get_text(strip=True) if title else 'N/A',
                        'company': company.get_text(strip=True) if company else 'N/A',
                        'location': 'Santiago, Chile',
                        'description': item.get_text(strip=True)[:2000],
                        'requirements': self._extract_tech_skills(item.get_text()),
                        'url': title.get('href') if title and title.get('href') else '',
                        'external_id': f"bolsa_trabajo_{len(jobs)}"
                    }
                    jobs.append(job)
                    time.sleep(0.5)
                except Exception as e:
                    logger.debug(f"Error parsing Bolsa de Trabajo job: {e}")
                    continue

            logger.info(f"Bolsa de Trabajo: fetched {len(jobs)} jobs")
            return jobs
        except Exception as e:
            logger.error(f"Bolsa de Trabajo fetch error: {e}")
            return []

    def _extract_tech_skills(self, text: str) -> List[str]:
        skills = ['python', 'javascript', 'java', 'php', 'c#', 'react', 'nodejs',
                 'django', 'mysql', 'sql', 'postgresql', 'docker', 'git', 'linux']
        found = [s for s in skills if s.lower() in text.lower()]
        return list(set(found))
