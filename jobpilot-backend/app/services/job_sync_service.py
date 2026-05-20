import logging
from typing import List, Dict
from datetime import datetime
from app import db
from app.models import Job
from app.services.scrapers import (
    ComputrabajoScraper,
    TrabajandoScraper,
    LaborumScraper,
    GetonboardScraper,
    LinkedInScraper,
)

logger = logging.getLogger(__name__)

class JobSyncService:
    """Service to sync jobs from multiple portals"""

    def __init__(self):
        self.scrapers = {
            'computrabajo': ComputrabajoScraper(),
            'trabajando': TrabajandoScraper(),
            'laborum': LaborumScraper(),
            'getonboard': GetonboardScraper(),
            'linkedin': LinkedInScraper(),
        }

    def sync_all_jobs(self, limit: int = 50, keywords: List[str] = None) -> Dict:
        """Sync jobs from all portals"""
        if keywords is None:
            keywords = ['developer', 'data scientist', 'designer']

        results = {
            'total_synced': 0,
            'by_source': {},
            'timestamp': datetime.utcnow(),
            'errors': []
        }

        for source_name, scraper in self.scrapers.items():
            try:
                logger.info(f"Starting sync for {source_name}")
                jobs_by_source = 0

                for keyword in keywords:
                    try:
                        raw_jobs = scraper.scrape_with_retry(limit=limit, keyword=keyword)
                        jobs_by_source += self._save_jobs(raw_jobs)
                    except Exception as e:
                        error_msg = f"Error scraping {source_name} for keyword '{keyword}': {str(e)}"
                        logger.error(error_msg)
                        results['errors'].append(error_msg)

                results['by_source'][source_name] = jobs_by_source
                results['total_synced'] += jobs_by_source
                logger.info(f"✅ Synced {jobs_by_source} jobs from {source_name}")

            except Exception as e:
                error_msg = f"Critical error with {source_name}: {str(e)}"
                logger.error(error_msg)
                results['errors'].append(error_msg)

        return results

    def sync_by_source(self, source: str, limit: int = 50, keyword: str = 'developer') -> int:
        """Sync jobs from specific source"""
        if source not in self.scrapers:
            raise ValueError(f"Unknown source: {source}")

        scraper = self.scrapers[source]
        try:
            raw_jobs = scraper.scrape_with_retry(limit=limit, keyword=keyword)
            count = self._save_jobs(raw_jobs)
            logger.info(f"✅ Synced {count} jobs from {source}")
            return count
        except Exception as e:
            logger.error(f"Error syncing from {source}: {str(e)}")
            raise

    def _save_jobs(self, normalized_jobs: List[Dict]) -> int:
        """Save normalized jobs to database, avoiding duplicates"""
        saved_count = 0

        for job_data in normalized_jobs:
            try:
                # Check if job already exists by external_id
                existing = Job.query.filter_by(
                    external_id=job_data.get('external_id')
                ).first()

                if existing:
                    # Update existing job
                    existing.title = job_data.get('title')
                    existing.company = job_data.get('company')
                    existing.location = job_data.get('location')
                    existing.description = job_data.get('description')
                    existing.requirements = job_data.get('requirements', [])
                    existing.salary_min = job_data.get('salary_min')
                    existing.salary_max = job_data.get('salary_max')
                    existing.salary_currency = job_data.get('salary_currency', 'CLP')
                    existing.job_type = job_data.get('job_type', 'fulltime')
                    existing.url = job_data.get('url')
                    existing.posted_at = job_data.get('posted_at')
                    existing.updated_at = datetime.utcnow()
                else:
                    # Create new job
                    job = Job(
                        external_id=job_data.get('external_id'),
                        source=job_data.get('source'),
                        title=job_data.get('title'),
                        company=job_data.get('company'),
                        location=job_data.get('location'),
                        description=job_data.get('description'),
                        requirements=job_data.get('requirements', []),
                        salary_min=job_data.get('salary_min'),
                        salary_max=job_data.get('salary_max'),
                        salary_currency=job_data.get('salary_currency', 'CLP'),
                        job_type=job_data.get('job_type', 'fulltime'),
                        url=job_data.get('url'),
                        posted_at=job_data.get('posted_at'),
                    )
                    db.session.add(job)

                saved_count += 1

            except Exception as e:
                logger.warning(f"Error saving job: {str(e)}")
                continue

        try:
            db.session.commit()
        except Exception as e:
            logger.error(f"Error committing jobs to database: {str(e)}")
            db.session.rollback()
            raise

        return saved_count

    def cleanup_old_jobs(self, days: int = 30) -> int:
        """Remove jobs older than specified days"""
        from datetime import timedelta

        cutoff_date = datetime.utcnow() - timedelta(days=days)
        deleted = Job.query.filter(Job.posted_at < cutoff_date).delete()
        db.session.commit()

        logger.info(f"Cleaned up {deleted} old jobs")
        return deleted
