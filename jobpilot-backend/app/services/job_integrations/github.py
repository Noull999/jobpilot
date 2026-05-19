"""GitHub/Tech Jobs portal integration (using Stack Overflow as alternative)"""
import requests
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
import xml.etree.ElementTree as ET

from .base import JobPortalIntegration

class GitHubJobsIntegration(JobPortalIntegration):
    """Fetch tech jobs - using Stack Overflow Jobs as GitHub Jobs was deprecated"""

    STACKOVERFLOW_URL = 'https://stackoverflow.com/jobs/feed'

    def __init__(self, api_key: str = None):
        super().__init__(api_key)
        self.source_name = 'github'  # Keep name for consistency

    def fetch_jobs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Fetch tech jobs from Stack Overflow"""
        try:
            # Stack Overflow provides RSS feed for jobs
            response = requests.get(
                self.STACKOVERFLOW_URL,
                timeout=10,
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
            )
            response.raise_for_status()

            jobs = self._parse_stackoverflow_rss(response.text, limit)

            self.logger.info(f'Fetched {len(jobs)} jobs from Stack Overflow')
            return jobs

        except Exception as e:
            self.logger.error(f'Error fetching Stack Overflow jobs: {str(e)}')
            return []

    def _parse_stackoverflow_rss(self, rss_content: str, limit: int) -> List[Dict[str, Any]]:
        """Parse Stack Overflow Jobs RSS feed"""
        jobs = []

        try:
            root = ET.fromstring(rss_content)

            # Stack Overflow uses standard RSS format
            for idx, item in enumerate(root.findall('.//item')):
                if idx >= limit:
                    break

                try:
                    job = self._extract_job_from_rss_item(item)
                    if job:
                        jobs.append(job)
                except Exception as e:
                    self.logger.warning(f'Error parsing RSS item: {str(e)}')
                    continue

        except Exception as e:
            self.logger.error(f'Error parsing RSS feed: {str(e)}')

        return jobs

    def _extract_job_from_rss_item(self, item) -> Dict:
        """Extract job details from RSS item"""
        try:
            title = item.findtext('title', '')
            if not title:
                return None

            # Stack Overflow includes company in link or description
            link = item.findtext('link', '')
            description = item.findtext('description', '')[:3000]
            company = self._extract_company_from_description(description)

            # Try to extract location
            location = self._extract_location_from_description(description)

            # Extract skills/requirements from description
            requirements = self._extract_requirements({
                'description': description,
                'requirements': self._extract_tech_skills(description)
            })

            published = item.findtext('pubDate', '')
            posted_at = self._parse_date(published)

            return self.normalize_job({
                'title': title,
                'company': company or 'Not Specified',
                'location': location or 'Remote',
                'description': description,
                'requirements': requirements,
                'salary_min': None,
                'salary_max': None,
                'job_type': 'Full-time',
                'url': link,
                'external_id': f'github_{link.split("/")[-1]}'
            })

        except Exception as e:
            self.logger.warning(f'Error extracting job from RSS: {str(e)}')
            return None

    def _extract_company_from_description(self, description: str) -> str:
        """Extract company name from description"""
        if not description:
            return ''

        # Common patterns: "Company Name is hiring" or "at Company Name"
        import re
        matches = re.search(r'(?:at|for)\s+([A-Z][A-Za-z0-9\s&-]+)', description)
        if matches:
            return matches.group(1).strip()

        return ''

    def _extract_location_from_description(self, description: str) -> str:
        """Extract location from description"""
        if not description:
            return ''

        # Look for common location patterns
        import re
        patterns = [
            r'(?:in|based in|located in)\s+([A-Za-z\s,]+)',
            r'([A-Z][a-z]+,\s*[A-Z]{2})',  # City, State pattern
        ]

        for pattern in patterns:
            match = re.search(pattern, description)
            if match:
                location = match.group(1).strip()
                if len(location) < 100:
                    return location

        return 'Remote'

    def _extract_tech_skills(self, text: str) -> List[str]:
        """Extract common tech skill keywords from text"""
        if not text:
            return []

        text_lower = text.lower()
        tech_skills = [
            'python', 'javascript', 'typescript', 'java', 'c#', 'c++', 'go', 'rust',
            'react', 'vue', 'angular', 'nodejs', 'django', 'flask', 'rails',
            'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
            'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'git',
            'html', 'css', 'sql', 'rest api', 'graphql', 'microservices'
        ]

        found_skills = []
        for skill in tech_skills:
            if skill in text_lower:
                found_skills.append(skill)

        return found_skills

    def _parse_date(self, date_str: str) -> datetime:
        """Parse publication date"""
        try:
            from dateutil import parser
            return parser.parse(date_str)
        except:
            return datetime.now(timezone.utc)
