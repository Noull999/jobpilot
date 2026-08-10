import os
import logging
import requests
from typing import List, Dict, Optional
from app.models import User, CV, Job, JobMatch, Application
from app import db
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class ApplyPilotService:
    """Service to manage automated job applications via ApplyPilot + LiteLLM"""

    def __init__(self):
        self.litellm_url = os.getenv('LITELLM_PROXY_URL', 'http://localhost:4000')
        self.primary_llm = os.getenv('APPLYPILOT_PRIMARY_LLM', 'claude-opus')
        self.fallback_llm = os.getenv('APPLYPILOT_FALLBACK_LLM', 'gemini')
        self.enabled = os.getenv('APPLYPILOT_ENABLED', 'true').lower() == 'true'

    def tailor_resume(self, cv: CV, job: Job, use_fallback: bool = False) -> Optional[str]:
        """Tailor resume to match job requirements using LLM"""
        if not self.enabled:
            return None

        try:
            model = self.fallback_llm if use_fallback else self.primary_llm

            prompt = f"""You are an expert resume writer. Tailor this resume for the following job:

Job Title: {job.title}
Company: {job.company}
Job Description: {job.description}
Requirements: {', '.join(job.requirements or [])}

Base Resume: {cv.analysis}

Task: Rewrite the resume to:
1. Reorganize sections to match job requirements
2. Emphasize relevant experience and skills
3. Add relevant keywords from job description
4. Keep it honest - don't fabricate experience

Return only the tailored resume text."""

            response = self._call_llm(model, prompt)
            return response

        except Exception as e:
            logger.error(f"Error tailoring resume: {str(e)}")
            if not use_fallback:
                return self.tailor_resume(cv, job, use_fallback=True)
            return None

    def generate_cover_letter(self, cv: CV, job: Job, user: User, use_fallback: bool = False) -> Optional[str]:
        """Generate personalized cover letter for job"""
        if not self.enabled:
            return None

        try:
            model = self.fallback_llm if use_fallback else self.primary_llm

            prompt = f"""Write a professional cover letter for this job application.

Candidate: {user.name}
Job Title: {job.title}
Company: {job.company}
Job Description: {job.description}
Requirements: {', '.join(job.requirements or [])}

Candidate Experience: {', '.join(cv.job_titles or [])}
Candidate Skills: {', '.join(cv.skills or [])}
Years Experience: {cv.experience_years}

Task: Write a compelling 3-4 paragraph cover letter that:
1. Shows genuine interest in the role
2. Connects candidate experience to job requirements
3. Highlights relevant skills
4. Is professional and personable
5. Stays under 250 words

Return only the cover letter text."""

            response = self._call_llm(model, prompt)
            return response

        except Exception as e:
            logger.error(f"Error generating cover letter: {str(e)}")
            if not use_fallback:
                return self.generate_cover_letter(cv, job, user, use_fallback=True)
            return None

    def _call_llm(self, model: str, prompt: str) -> Optional[str]:
        """Call LiteLLM proxy to invoke Claude or Gemini"""
        try:
            response = requests.post(
                f"{self.litellm_url}/chat/completions",
                json={
                    "model": model,
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "max_tokens": 2000,
                    "temperature": 0.7
                },
                headers={
                    "Authorization": f"Bearer {os.getenv('LITELLM_MASTER_KEY', 'sk-applypilot-default-master-key')}"
                },
                timeout=60
            )

            if response.status_code == 200:
                data = response.json()
                return data.get('choices', [{}])[0].get('message', {}).get('content')
            else:
                logger.error(f"LiteLLM error: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            logger.error(f"LiteLLM call failed: {str(e)}")
            return None

    def apply_to_matches(self, user_id: int, match_ids: List[int]) -> Dict:
        """Apply to selected job matches"""
        if not self.enabled:
            return {"success": False, "message": "ApplyPilot is disabled"}

        user = User.query.get(user_id)
        if not user:
            return {"success": False, "message": "User not found"}

        cv = CV.query.filter_by(user_id=user_id).order_by(CV.uploaded_at.desc()).first()
        if not cv:
            return {"success": False, "message": "No CV uploaded"}

        results = {
            "total": len(match_ids),
            "successful": 0,
            "failed": 0,
            "applications": []
        }

        for match_id in match_ids:
            match = JobMatch.query.get(match_id)
            if not match:
                results["failed"] += 1
                results["applications"].append({
                    "match_id": match_id,
                    "status": "failed",
                    "reason": "Match not found"
                })
                continue

            job = match.job

            # Check if already applied
            existing = Application.query.filter_by(
                user_id=user_id,
                job_id=job.id
            ).first()

            if existing:
                results["failed"] += 1
                results["applications"].append({
                    "match_id": match_id,
                    "job_id": job.id,
                    "status": "failed",
                    "reason": "Already applied"
                })
                continue

            try:
                # Generate tailored resume
                tailored_resume = self.tailor_resume(cv, job)
                if not tailored_resume:
                    raise Exception("Failed to tailor resume")

                # Generate cover letter
                cover_letter = self.generate_cover_letter(cv, job, user)
                if not cover_letter:
                    logger.warning(f"Failed to generate cover letter for job {job.id}, continuing anyway")

                # Create application record
                app = Application(
                    user_id=user_id,
                    job_id=job.id,
                    cv_id=cv.id,
                    status='applied',
                    cover_letter=cover_letter,
                    applied_at=datetime.now(timezone.utc)
                )

                db.session.add(app)
                db.session.commit()

                results["successful"] += 1
                results["applications"].append({
                    "match_id": match_id,
                    "job_id": job.id,
                    "job_title": job.title,
                    "company": job.company,
                    "status": "applied"
                })

                logger.info(f"Successfully applied to job {job.id} for user {user_id}")

            except Exception as e:
                results["failed"] += 1
                results["applications"].append({
                    "match_id": match_id,
                    "job_id": job.id,
                    "status": "failed",
                    "reason": str(e)
                })
                logger.error(f"Error applying to job {job.id}: {str(e)}")

        return results

    def check_applypilot_status(self) -> Dict:
        """Check if ApplyPilot and LiteLLM are properly configured"""
        status = {
            "enabled": self.enabled,
            "litellm_url": self.litellm_url,
            "primary_llm": self.primary_llm,
            "fallback_llm": self.fallback_llm,
            "litellm_available": False,
            "anthropic_api_key": bool(os.getenv('ANTHROPIC_API_KEY')),
            "gemini_api_key": bool(os.getenv('GEMINI_API_KEY'))
        }

        # Check LiteLLM proxy availability
        try:
            response = requests.get(f"{self.litellm_url}/health", timeout=5)
            status["litellm_available"] = response.status_code == 200
        except:
            status["litellm_available"] = False

        return status
