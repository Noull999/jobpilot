"""
Basic Monitoring and Alerting Service
Tracks security events and suspicious activities
"""

import logging
from datetime import datetime, timezone
from collections import defaultdict, deque
import json

logger = logging.getLogger(__name__)

class SecurityMonitor:
    """Monitor suspicious activities and security events"""

    def __init__(self, window_size=3600):
        self.window_size = window_size  # 1 hour
        self.failed_logins = defaultdict(deque)  # ip -> deque of timestamps
        self.rate_limit_hits = defaultdict(deque)
        self.suspicious_queries = deque(maxlen=100)
        self.alerts = deque(maxlen=50)

    def log_failed_login(self, ip_address):
        """Track failed login attempts"""
        now = datetime.now(timezone.utc).timestamp()
        self.failed_logins[ip_address].append(now)

        # Clean old entries
        while self.failed_logins[ip_address] and self.failed_logins[ip_address][0] < now - self.window_size:
            self.failed_logins[ip_address].popleft()

        failed_count = len(self.failed_logins[ip_address])

        if failed_count >= 5:
            alert = {
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'type': 'BRUTE_FORCE_ALERT',
                'severity': 'HIGH',
                'ip': ip_address,
                'failed_attempts': failed_count,
                'message': f"Brute force attempt detected: {failed_count} failed logins from {ip_address}"
            }
            self.alerts.append(alert)
            logger.warning(f"ALERT: {alert['message']}")
            return True

        return False

    def log_rate_limit_hit(self, ip_address, endpoint):
        """Track rate limit violations"""
        now = datetime.now(timezone.utc).timestamp()
        key = f"{ip_address}:{endpoint}"
        self.rate_limit_hits[key].append(now)

        # Clean old entries
        while self.rate_limit_hits[key] and self.rate_limit_hits[key][0] < now - self.window_size:
            self.rate_limit_hits[key].popleft()

        hit_count = len(self.rate_limit_hits[key])

        if hit_count >= 3:
            alert = {
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'type': 'RATE_LIMIT_ALERT',
                'severity': 'MEDIUM',
                'ip': ip_address,
                'endpoint': endpoint,
                'hits': hit_count,
                'message': f"Rate limit violations: {hit_count} hits from {ip_address} on {endpoint}"
            }
            self.alerts.append(alert)
            logger.warning(f"ALERT: {alert['message']}")

    def log_suspicious_query(self, query, ip_address, endpoint):
        """Log potentially malicious queries"""
        suspicious_patterns = ['union', 'select', 'drop', 'delete', 'insert', 'update', '--', '/*', '*/']

        query_lower = query.lower() if query else ''
        is_suspicious = any(pattern in query_lower for pattern in suspicious_patterns)

        if is_suspicious:
            entry = {
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'query': query[:100],  # Truncate long queries
                'ip': ip_address,
                'endpoint': endpoint
            }
            self.suspicious_queries.append(entry)

            alert = {
                'timestamp': entry['timestamp'],
                'type': 'SUSPICIOUS_QUERY',
                'severity': 'MEDIUM',
                'ip': ip_address,
                'endpoint': endpoint,
                'query_preview': query[:50],
                'message': f"Suspicious query detected from {ip_address}: {query[:50]}"
            }
            self.alerts.append(alert)
            logger.warning(f"ALERT: {alert['message']}")

    def log_unauthorized_access(self, user_id, endpoint, reason):
        """Log unauthorized access attempts"""
        alert = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'type': 'UNAUTHORIZED_ACCESS',
            'severity': 'MEDIUM',
            'user_id': user_id,
            'endpoint': endpoint,
            'reason': reason,
            'message': f"Unauthorized access attempt: {reason}"
        }
        self.alerts.append(alert)
        logger.warning(f"ALERT: {alert['message']}")

    def get_alerts(self, limit=10, severity_filter=None):
        """Get recent alerts"""
        alerts_list = list(self.alerts)

        if severity_filter:
            alerts_list = [a for a in alerts_list if a.get('severity') == severity_filter]

        return alerts_list[-limit:]

    def get_status(self):
        """Get monitoring status summary"""
        return {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'failed_logins_tracked': len(self.failed_logins),
            'rate_limit_entries': len(self.rate_limit_hits),
            'suspicious_queries_count': len(self.suspicious_queries),
            'total_alerts': len(self.alerts),
            'recent_alerts': self.get_alerts(limit=5)
        }

# Global instance
monitor = SecurityMonitor()

def get_monitor():
    """Get the global monitor instance"""
    return monitor

def log_security_event(event_type, severity, ip_address, user_id=None, details=None):
    """Log a generic security event"""
    event = {
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'type': event_type,
        'severity': severity,
        'ip': ip_address,
        'user_id': user_id,
        'details': details
    }

    if severity == 'HIGH':
        logger.error(f"SECURITY EVENT: {json.dumps(event)}")
    elif severity == 'MEDIUM':
        logger.warning(f"SECURITY EVENT: {json.dumps(event)}")
    else:
        logger.info(f"SECURITY EVENT: {json.dumps(event)}")

    return event
