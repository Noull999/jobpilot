# Phase 3: Email Notifications + Scheduler - COMPLETE ✅

## Summary

Professional email notification system is fully implemented. Users can subscribe to daily or weekly digest emails that alert them to new job opportunities matching their CV profile with configurable match score threshold.

---

## What Was Built

### 1. Database Model
- **NotificationPreference** table to store user subscription preferences
- Fields: `user_id`, `email`, `enabled`, `frequency` (daily/weekly), `min_match_score`, `last_sent`
- Tracks when the last digest was sent to avoid duplicates

### 2. Email Service
**File**: `app/services/email_service.py`
- Flask-Mail integration with SMTP configuration
- Professional HTML email template with:
  - Color-coded match scores (green ≥85%, orange ≥70%, default blue)
  - Job title, company, location
  - Matched skills highlighted
  - CTA button to view job
  - Unsubscribe/preferences links
  - Average match score summary

### 3. Notification Service
**File**: `app/services/notification_service.py`
- `send_daily_digests()` - Sends emails every day
  - Finds new jobs posted since last_sent
  - Calculates match scores against user's CV
  - Filters by min_match_score threshold (default 70%)
  - Saves JobMatch records for tracking
  - Only sends if there are opportunities

- `send_weekly_digests()` - Sends emails every week (Monday)
  - Same logic as daily but for 7-day window
  - Helps users who prefer less frequent notifications

### 4. REST Endpoints
**File**: `app/routes/notifications.py`

```
POST /api/notifications/subscribe
  - Subscribe to email digests
  - Params: frequency (daily/weekly), min_match_score (0-100)
  - Returns: subscription details

POST /api/notifications/unsubscribe
  - Disable notifications for user
  - Returns: confirmation

GET /api/notifications/preferences
  - Get current notification settings
  - Returns: current frequency, min_score, enabled status, last_sent

PUT /api/notifications/preferences
  - Update frequency, min_score, or enabled status
  - Returns: updated preferences

POST /api/notifications/test-email
  - Send test email to verify configuration
  - Returns: confirmation with recipient email
```

### 5. Automatic Scheduler
**File**: `app/services/job_scheduler.py` (updated)
- Daily digest: **8:00 AM UTC every day**
- Weekly digest: **8:00 AM UTC every Monday**
- Runs alongside existing job portal sync scheduler (every 6 hours)
- Graceful error handling - failures don't affect other jobs

### 6. Email Configuration
**File**: `.env` (updated with email config section)
- MAIL_SERVER: SMTP server (Gmail, SendGrid, AWS SES, etc.)
- MAIL_PORT: Usually 587 for TLS
- MAIL_USERNAME/PASSWORD: SMTP credentials
- MAIL_DEFAULT_SENDER: From address
- APP_URL: Used for unsubscribe/preferences links

### 7. Documentation
**File**: `SETUP_PRODUCTION.md` (updated)
- Step-by-step email provider setup (Gmail, SendGrid, AWS SES)
- Configuration examples for each provider
- How to test email configuration
- Notification endpoints documentation
- Scheduler timing explanation

### 8. Testing
**File**: `test_email_notifications.py` (new)
- Validates email configuration completeness
- Tests Flask app initialization
- Checks notification models
- Verifies scheduler jobs are registered
- Provides usage instructions

---

## Files Modified/Created

| File | Status | Purpose |
|------|--------|---------|
| app/models.py | Modified | Added NotificationPreference model |
| app/services/email_service.py | Created | Flask-Mail setup + email sending |
| app/services/notification_service.py | Created | Digest scheduling logic |
| app/routes/notifications.py | Created | REST endpoints for preferences |
| app/services/job_scheduler.py | Modified | Added digest job scheduling |
| app/__init__.py | Modified | Initialized email service + registered routes |
| requirements.txt | Modified | Added Flask-Mail, Jinja2 |
| .env | Modified | Added email configuration |
| SETUP_PRODUCTION.md | Modified | Added email setup section |
| test_email_notifications.py | Created | Configuration validation script |

---

## How It Works (Flow)

1. **User subscribes** → POST `/api/notifications/subscribe`
   - Stores preference with frequency + min_match_score

2. **Scheduler runs** → Every day at 8 AM UTC
   - Finds all users with daily preference enabled
   - Gets their latest CV
   - Finds new jobs since last_sent
   - Calculates match score for each job
   - Filters jobs by min_match_score
   - Sends professional HTML email
   - Saves JobMatch records
   - Updates last_sent timestamp

3. **User receives email** with:
   - List of matching jobs (sorted by match score)
   - Summary: "Found 5 jobs matching your profile"
   - Color-coded scores + matched skills
   - One-click links to apply

4. **User can** at any time:
   - Update preferences (frequency, min_score)
   - Unsubscribe completely
   - Test email configuration
   - Click unsubscribe link in email

---

## Email Template Features

```html
Header: "🚀 JobPilot Daily/Weekly Digest"
        "5 new opportunities matching your profile"

Summary: "Weekly update: We found 5 jobs that match your skills with 78% average match."

Per Job:
  - Title: "Python Developer"
  - Company: "@ TechCorp · San Francisco"
  - Score: "87% Match" [green badge]
  - Skills: "Matched: Python, FastAPI, PostgreSQL"
  - CTA: "View Job →" [button]

Footer: Unsubscribe + Manage Preferences links
```

---

## Configuration Examples

### Gmail (Recommended for MVP)
```env
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password-16-chars
MAIL_DEFAULT_SENDER=your-email@gmail.com
```

### SendGrid (Production)
```env
MAIL_SERVER=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=apikey
MAIL_PASSWORD=SG.your_api_key_here
MAIL_DEFAULT_SENDER=noreply@yourdomain.com
```

### AWS SES
```env
MAIL_SERVER=email-smtp.region.amazonaws.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your_smtp_username
MAIL_PASSWORD=your_smtp_password
MAIL_DEFAULT_SENDER=noreply@yourdomain.com
```

---

## Testing Instructions

### Quick Validation
```bash
# Check configuration is complete
python test_email_notifications.py
```

### Full End-to-End Test
1. Start server: `python run.py`
2. Create test account: `POST /api/auth/signup`
3. Upload CV: `POST /api/cv/upload`
4. Subscribe: `POST /api/notifications/subscribe`
5. Send test email: `POST /api/notifications/test-email`
6. Check inbox for test email

### Verify Scheduler is Running
```bash
# In logs you should see:
# "Scheduled daily digest job (08:00 UTC)"
# "Scheduled weekly digest job (Monday 08:00 UTC)"
```

---

## Production Readiness

✅ **Ready for production**
- All error handling in place
- Email failures don't crash system
- Database transactions are atomic
- Scheduler gracefully handles failures
- Configuration is environment-based

⚠️ **Recommendations**:
- Use SendGrid or AWS SES in production (more reliable than Gmail)
- Monitor email bounce rates
- Set up rate limiting on notification endpoints if needed
- Consider email queue system for high volume

---

## Maintenance

### Monitor Email Delivery
```bash
# Check NotificationPreference table
SELECT COUNT(*), enabled, frequency FROM notification_preferences GROUP BY enabled, frequency;
```

### Update Email Template
**File**: `app/services/email_service.py` (lines 30-98)
- Change colors, layout, or content there
- Template uses Jinja2, so you can add variables easily

### Change Scheduler Times
**File**: `app/services/job_scheduler.py` (lines 54-65)
- Daily: `CronTrigger(hour=8, minute=0)` → change hour/minute
- Weekly: `CronTrigger(day_of_week=0, hour=8, minute=0)` → 0=Monday

---

## Integration with Existing Features

✅ **Works with**:
- CV upload and analysis
- Job portal integrations (14 portals)
- Job matching algorithm
- User authentication

✅ **Automated flow**:
1. User uploads CV → extracted skills stored
2. New jobs arrive (every 6 hours from 14 portals)
3. Scheduler runs (8 AM UTC daily)
4. Matches calculated + saved to JobMatch table
5. Emails sent to subscribed users with opportunities

---

## Dependencies Added

```
Flask-Mail==0.9.1       # Email sending
Jinja2==3.1.2           # Email templates
```

These are in requirements.txt. Install with:
```bash
pip install -r requirements.txt
```

---

## Status Summary

| Component | Status | Last Updated |
|-----------|--------|--------------|
| Database model | ✅ Complete | 2026-05-18 |
| Email service | ✅ Complete | 2026-05-18 |
| Notification service | ✅ Complete | 2026-05-18 |
| REST endpoints | ✅ Complete | 2026-05-18 |
| Scheduler integration | ✅ Complete | 2026-05-18 |
| Configuration | ✅ Complete | 2026-05-18 |
| Testing | ✅ Complete | 2026-05-18 |
| Documentation | ✅ Complete | 2026-05-18 |

---

## Next Steps (Optional Enhancements)

1. **Email preferences UI** - Frontend interface to manage subscriptions
2. **Email templates variations** - Different templates for daily vs weekly
3. **Digest preview** - Let users see what they'd receive before subscribing
4. **Unsubscribe tracking** - Monitor why users opt-out
5. **A/B testing emails** - Test subject lines, colors, layouts
6. **Notification history** - Show users past digests they received
