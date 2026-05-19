"""Notification and digest service"""
import logging
from datetime import datetime, timezone, timedelta
from app import db
from app.models import User, NotificationPreference, Job, JobMatch, CV
from app.routes.job_matching import calculate_match_score
from app.services.email_service import send_opportunity_digest

logger = logging.getLogger(__name__)

def send_daily_digests():
    """Send daily digest emails to users who have enabled notifications"""
    logger.info("Starting daily digest job")

    # Find users with daily notification preference enabled
    prefs = NotificationPreference.query.filter(
        NotificationPreference.enabled == True,
        NotificationPreference.frequency == 'daily'
    ).all()

    for pref in prefs:
        try:
            user = User.query.get(pref.user_id)
            if not user:
                continue

            # Get user's latest CV
            cv = CV.query.filter_by(user_id=user.id).order_by(CV.uploaded_at.desc()).first()
            if not cv:
                logger.debug(f"No CV found for user {user.id}")
                continue

            # Find new jobs since last digest (or last 24 hours if first time)
            if pref.last_sent:
                since = pref.last_sent
            else:
                since = datetime.now(timezone.utc) - timedelta(days=1)

            new_jobs = Job.query.filter(Job.posted_at >= since).all()
            logger.info(f"Found {len(new_jobs)} new jobs for user {user.id}")

            if not new_jobs:
                logger.debug(f"No new jobs for user {user.id}")
                continue

            # Calculate matches for new jobs
            opportunities = []
            for job in new_jobs:
                try:
                    score, matched, missing, reason = calculate_match_score(cv, job)

                    # Only include if score >= minimum threshold
                    if score >= pref.min_match_score:
                        opportunities.append({
                            'job_title': job.title,
                            'company': job.company,
                            'location': job.location,
                            'match_score': int(score),
                            'skills_matched': matched,
                            'skills_missing': missing,
                            'job_url': job.url or f"https://jobpilot.ai/jobs/{job.id}"
                        })

                        # Save match to DB
                        existing_match = JobMatch.query.filter_by(
                            user_id=user.id,
                            job_id=job.id
                        ).first()

                        if not existing_match:
                            match = JobMatch(
                                user_id=user.id,
                                job_id=job.id,
                                cv_id=cv.id,
                                match_score=score,
                                skills_matched=matched,
                                skills_missing=missing,
                                match_reason=reason
                            )
                            db.session.add(match)

                except Exception as e:
                    logger.error(f"Error matching job {job.id}: {e}")
                    continue

            db.session.commit()

            # Send digest if there are opportunities
            if opportunities:
                # Sort by score descending
                opportunities.sort(key=lambda x: x['match_score'], reverse=True)

                success = send_opportunity_digest(
                    user_email=pref.email,
                    opportunities=opportunities,
                    frequency=pref.frequency
                )

                if success:
                    pref.last_sent = datetime.now(timezone.utc)
                    db.session.commit()
                    logger.info(f"Digest sent to {user.id} with {len(opportunities)} opportunities")
                else:
                    logger.warning(f"Failed to send digest to {user.id}")

        except Exception as e:
            logger.error(f"Error processing digest for user {pref.user_id}: {e}")
            db.session.rollback()
            continue

    logger.info("Daily digest job completed")

def send_weekly_digests():
    """Send weekly digest emails to users who have enabled notifications"""
    logger.info("Starting weekly digest job")

    # Find users with weekly notification preference enabled
    prefs = NotificationPreference.query.filter(
        NotificationPreference.enabled == True,
        NotificationPreference.frequency == 'weekly'
    ).all()

    for pref in prefs:
        try:
            user = User.query.get(pref.user_id)
            if not user:
                continue

            # Get user's latest CV
            cv = CV.query.filter_by(user_id=user.id).order_by(CV.uploaded_at.desc()).first()
            if not cv:
                logger.debug(f"No CV found for user {user.id}")
                continue

            # Find new jobs since last digest (or last 7 days if first time)
            if pref.last_sent:
                since = pref.last_sent
            else:
                since = datetime.now(timezone.utc) - timedelta(days=7)

            new_jobs = Job.query.filter(Job.posted_at >= since).all()
            logger.info(f"Found {len(new_jobs)} new jobs for user {user.id} (weekly)")

            if not new_jobs:
                logger.debug(f"No new jobs for user {user.id} (weekly)")
                continue

            # Calculate matches for new jobs
            opportunities = []
            for job in new_jobs:
                try:
                    score, matched, missing, reason = calculate_match_score(cv, job)

                    # Only include if score >= minimum threshold
                    if score >= pref.min_match_score:
                        opportunities.append({
                            'job_title': job.title,
                            'company': job.company,
                            'location': job.location,
                            'match_score': int(score),
                            'skills_matched': matched,
                            'skills_missing': missing,
                            'job_url': job.url or f"https://jobpilot.ai/jobs/{job.id}"
                        })

                        # Save match to DB
                        existing_match = JobMatch.query.filter_by(
                            user_id=user.id,
                            job_id=job.id
                        ).first()

                        if not existing_match:
                            match = JobMatch(
                                user_id=user.id,
                                job_id=job.id,
                                cv_id=cv.id,
                                match_score=score,
                                skills_matched=matched,
                                skills_missing=missing,
                                match_reason=reason
                            )
                            db.session.add(match)

                except Exception as e:
                    logger.error(f"Error matching job {job.id}: {e}")
                    continue

            db.session.commit()

            # Send digest if there are opportunities
            if opportunities:
                # Sort by score descending
                opportunities.sort(key=lambda x: x['match_score'], reverse=True)

                success = send_opportunity_digest(
                    user_email=pref.email,
                    opportunities=opportunities,
                    frequency=pref.frequency
                )

                if success:
                    pref.last_sent = datetime.now(timezone.utc)
                    db.session.commit()
                    logger.info(f"Weekly digest sent to {user.id} with {len(opportunities)} opportunities")
                else:
                    logger.warning(f"Failed to send weekly digest to {user.id}")

        except Exception as e:
            logger.error(f"Error processing weekly digest for user {pref.user_id}: {e}")
            db.session.rollback()
            continue

    logger.info("Weekly digest job completed")
