"""Background job scheduler for syncing jobs from multiple portals and sending digests"""
import os
import logging
from datetime import datetime, timezone
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

class JobSyncScheduler:
    """Manages scheduled job syncs from all portals"""

    def __init__(self, app=None):
        self.scheduler = BackgroundScheduler()
        self.app = app
        self.is_running = False

    def init_app(self, app):
        """Initialize with Flask app"""
        self.app = app
        self._schedule_syncs()

    def _schedule_syncs(self):
        """Schedule syncs for each portal"""
        try:
            from app.services.job_integrations import get_all_portal_integrations

            portals = get_all_portal_integrations()

            if not portals:
                logger.warning('No portal integrations available for scheduling')
                return

            # Sync each portal every 6 hours, staggered to avoid load
            for idx, portal in enumerate(portals):
                # Stagger syncs: portal 0 at minute 0, portal 1 at minute 15, etc.
                offset_minutes = (idx % 4) * 15

                self.scheduler.add_job(
                    func=self._sync_wrapper,
                    args=[portal.source_name],
                    trigger=IntervalTrigger(hours=6, minutes=offset_minutes),
                    id=f'sync_{portal.source_name}',
                    name=f'Sync {portal.source_name} jobs',
                    replace_existing=True,
                    coalesce=True,
                    max_instances=1
                )

                logger.info(f'Scheduled sync for {portal.source_name} (offset: {offset_minutes}min)')

            # Schedule daily digest at 8 AM UTC
            self.scheduler.add_job(
                func=self._send_daily_digest_wrapper,
                trigger=CronTrigger(hour=8, minute=0),
                id='send_daily_digests',
                name='Send daily digest notifications',
                replace_existing=True,
                coalesce=True,
                max_instances=1
            )
            logger.info('Scheduled daily digest job (08:00 UTC)')

            # Schedule weekly digest every Monday at 8 AM UTC
            self.scheduler.add_job(
                func=self._send_weekly_digest_wrapper,
                trigger=CronTrigger(day_of_week=0, hour=8, minute=0),
                id='send_weekly_digests',
                name='Send weekly digest notifications',
                replace_existing=True,
                coalesce=True,
                max_instances=1
            )
            logger.info('Scheduled weekly digest job (Monday 08:00 UTC)')

            if not self.is_running:
                self.scheduler.start()
                self.is_running = True
                logger.info('Job sync scheduler started')

        except Exception as e:
            logger.error(f'Error scheduling syncs: {str(e)}')

    def _sync_wrapper(self, portal_name: str):
        """Wrapper for sync function with app context"""
        try:
            from app.services import sync_portal_jobs
            sync_portal_jobs(portal_name)
        except Exception as e:
            logger.error(f'Error in sync wrapper for {portal_name}: {str(e)}')

    def _send_daily_digest_wrapper(self):
        """Wrapper for daily digest with app context"""
        try:
            from app.services.notification_service import send_daily_digests
            send_daily_digests()
        except Exception as e:
            logger.error(f'Error sending daily digests: {str(e)}')

    def _send_weekly_digest_wrapper(self):
        """Wrapper for weekly digest with app context"""
        try:
            from app.services.notification_service import send_weekly_digests
            send_weekly_digests()
        except Exception as e:
            logger.error(f'Error sending weekly digests: {str(e)}')

    def trigger_manual_refresh(self, portal_name: str = None):
        """Allow user to manually refresh jobs from specific portal(s)"""
        try:
            from app.services import sync_portal_jobs
            from app.services.job_integrations import get_all_portal_integrations

            if portal_name:
                logger.info(f'Manual refresh triggered for {portal_name}')
                return sync_portal_jobs(portal_name)
            else:
                logger.info('Manual refresh triggered for all portals')
                results = {}
                for portal in get_all_portal_integrations():
                    results[portal.source_name] = sync_portal_jobs(portal.source_name)
                return results

        except Exception as e:
            logger.error(f'Error in manual refresh: {str(e)}')
            return {'error': str(e)}

    def shutdown(self):
        """Shutdown the scheduler"""
        if self.is_running and self.scheduler.running:
            self.scheduler.shutdown(wait=False)
            self.is_running = False
            logger.info('Job sync scheduler shut down')


# Global scheduler instance
_scheduler = JobSyncScheduler()

def init_scheduler(app):
    """Initialize scheduler with Flask app"""
    _scheduler.init_app(app)
    return _scheduler

def get_scheduler() -> JobSyncScheduler:
    """Get the global scheduler instance"""
    return _scheduler
