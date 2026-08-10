from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.apply_service import ApplyPilotService
import logging

bp = Blueprint('apply', __name__, url_prefix='/api/apply')
logger = logging.getLogger(__name__)
apply_service = ApplyPilotService()

@bp.route('/status', methods=['GET'])
@jwt_required()
def get_status():
    """Get ApplyPilot status and configuration"""
    try:
        status = apply_service.check_applypilot_status()
        return jsonify({
            'success': True,
            'status': status
        }), 200
    except Exception as e:
        logger.error(f"Status check error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@bp.route('/apply-to-matches', methods=['POST'])
@jwt_required()
def apply_to_matches():
    """Apply to selected job matches using ApplyPilot"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()

        match_ids = data.get('match_ids', [])

        if not match_ids:
            return jsonify({'error': 'match_ids is required'}), 400

        if not isinstance(match_ids, list):
            return jsonify({'error': 'match_ids must be a list'}), 400

        if len(match_ids) > 50:
            return jsonify({'error': 'Maximum 50 matches per request'}), 400

        # Run apply process
        results = apply_service.apply_to_matches(user_id, match_ids)

        if not results['success'] and 'message' in results:
            return jsonify(results), 400

        return jsonify({
            'success': True,
            'results': results
        }), 200

    except Exception as e:
        logger.error(f"Apply error: {str(e)}")
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

@bp.route('/preview', methods=['POST'])
@jwt_required()
def preview_application():
    """Preview resume tailoring and cover letter for a job without applying"""
    try:
        from app.models import Job, CV, User

        user_id = int(get_jwt_identity())
        data = request.get_json()
        job_id = data.get('job_id')

        if not job_id:
            return jsonify({'error': 'job_id is required'}), 400

        user = User.query.get(user_id)
        job = Job.query.get(job_id)
        cv = CV.query.filter_by(user_id=user_id).order_by(CV.uploaded_at.desc()).first()

        if not user or not job or not cv:
            return jsonify({'error': 'User, job or CV not found'}), 404

        # Generate preview
        tailored_resume = apply_service.tailor_resume(cv, job)
        cover_letter = apply_service.generate_cover_letter(cv, job, user)

        return jsonify({
            'success': True,
            'job': {
                'id': job.id,
                'title': job.title,
                'company': job.company
            },
            'preview': {
                'tailored_resume': tailored_resume,
                'cover_letter': cover_letter
            }
        }), 200

    except Exception as e:
        logger.error(f"Preview error: {str(e)}")
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

@bp.route('/batch-apply', methods=['POST'])
@jwt_required()
def batch_apply():
    """Batch apply to multiple matches with progress tracking"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()

        # Get matches with score above threshold
        from app.models import JobMatch

        min_score = data.get('min_score', 80)
        limit = data.get('limit', 20)

        matches = JobMatch.query.filter(
            JobMatch.user_id == user_id,
            JobMatch.match_score >= min_score
        ).limit(limit).all()

        match_ids = [m.id for m in matches]

        results = apply_service.apply_to_matches(user_id, match_ids)

        return jsonify({
            'success': True,
            'results': results
        }), 200

    except Exception as e:
        logger.error(f"Batch apply error: {str(e)}")
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500
