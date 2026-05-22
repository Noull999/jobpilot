# SSL/TLS Setup Guide for JobPilot

## Overview

This guide covers SSL/TLS certificate installation and HTTPS configuration for JobPilot deployment in production.

## Current Status

✅ **Backend is ready for HTTPS:**
- HTTPS enforcement enabled (`enforce_https()` redirects HTTP → HTTPS)
- Secure cookie flags configured (secure=True, httponly=True, samesite='Lax')
- HSTS headers configured (max-age=31536000)
- All endpoints require HTTPS in production

❌ **Still needed for production:**
- Valid SSL/TLS certificate (self-signed not suitable for production)
- Web server configuration (nginx/Apache)
- Certificate renewal automation
- Mixed content prevention

---

## Option 1: Let's Encrypt (FREE - Recommended)

Best for: Production deployment on any server

### Prerequisites
- Domain name pointing to your server
- Port 80 and 443 open
- Server running Ubuntu/Debian or similar

### Installation Steps

#### Step 1: Install Certbot
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx  # or certbot-apache
```

#### Step 2: Obtain Certificate
```bash
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

Or with nginx (automatic configuration):
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

#### Step 3: Configure Certificate Path in nginx

Edit `/etc/nginx/sites-available/default`:

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Proxy to Flask
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Frontend static files
    location / {
        root /var/www/jobpilot-frontend/dist;
        try_files $uri /index.html;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

#### Step 4: Auto-renewal
```bash
sudo certbot renew --dry-run  # Test renewal
sudo systemctl enable certbot.timer  # Auto-renew every 12 hours
```

---

## Option 2: Vercel Deployment (Easiest)

Best for: No-hassle deployment with automatic HTTPS

### Steps

1. **Deploy to Vercel:**
   ```bash
   vercel deploy
   ```

2. **Features included:**
   - ✅ Automatic HTTPS
   - ✅ Auto-renewing SSL certificates
   - ✅ Global CDN with edge locations
   - ✅ Automatic HSTS headers
   - ✅ DDoS protection

3. **Connect custom domain:**
   - Add domain in Vercel dashboard
   - Update DNS records (see Vercel instructions)
   - Certificate auto-provisioned

---

## Option 3: AWS/Heroku/DigitalOcean

### AWS (Using Application Load Balancer + ACM)

```yaml
# ACM Certificate (Free in AWS)
certificate:
  domain: yourdomain.com
  validation_method: DNS  # or EMAIL

# ALB Listener on 443
listener:
  port: 443
  protocol: HTTPS
  certificate_arn: arn:aws:acm:...
  
# Target Group → Flask App on 5000
target_group:
  port: 5000
  protocol: HTTP
```

### Heroku
```bash
# Heroku provides free HTTPS for *.herokuapp.com
heroku apps:create jobpilot
heroku domains:add yourdomain.com

# For custom domain, upgrade to a paid dyno
heroku dyos:upgrade standard-1x
```

### DigitalOcean
```bash
# Create Load Balancer with HTTPS
doctl compute load-balancer create \
  --name jobpilot \
  --enable-proxy-protocol \
  --enable-backend-keepalive \
  --certificate-id certificate_id \
  --region nyc1
```

---

## Verification

### Check SSL Certificate
```bash
# View certificate info
openssl s_client -connect yourdomain.com:443

# Check certificate validity
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -text -noout

# Verify HSTS header
curl -I https://yourdomain.com
# Should show: Strict-Transport-Security: max-age=31536000
```

### Test HTTPS Enforcement
```bash
# This should redirect to HTTPS
curl -I http://yourdomain.com
# Should see: HTTP/1.1 301 Moved Permanently
# Location: https://yourdomain.com
```

### SSL/TLS Test Tools
- [SSL Labs](https://www.ssllabs.com/ssltest/)
- [SSL Checker](https://www.sslshopper.com/ssl-checker.html)
- [Mozilla Observatory](https://observatory.mozilla.org/)

---

## Environment Configuration

### Production .env
```bash
# HTTPS must be enabled
FLASK_ENV=production

# These are already in code, but verify:
JWT_COOKIE_SECURE=True        # Only send over HTTPS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Email configuration
MAIL_USE_TLS=True
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
```

### Backend Configuration Check

The following is **already implemented** in `app/__init__.py`:

```python
# HTTPS Enforcement
@app.before_request
def enforce_https():
    if not request.is_secure and not app.debug:
        return redirect(request.url.replace('http://', 'https://'))

# Security headers
@app.after_request
def set_security_headers(response):
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    # ... more headers
    return response
```

---

## Security Checklist

Before deploying to production:

- [ ] SSL/TLS certificate installed and valid
- [ ] HTTPS enforcement active (HTTP → HTTPS redirect)
- [ ] HSTS header configured
- [ ] All cookies have `secure` flag
- [ ] All external resources loaded over HTTPS
- [ ] Mixed content warnings resolved
- [ ] Certificate renewal automated
- [ ] OCSP stapling configured (optional, improves performance)
- [ ] TLS 1.2+ only (TLS 1.0/1.1 disabled)
- [ ] Strong cipher suites only
- [ ] Certificate monitoring (renewal alerts)

---

## Common Issues & Solutions

### "Mixed Content" Errors
**Problem:** Frontend loads over HTTPS but API over HTTP

**Solution:** Ensure API URL in frontend uses HTTPS:
```javascript
// jobpilot-frontend/.env
VITE_API_URL=https://api.yourdomain.com
```

### Certificate Renewal Fails
**Problem:** Certbot renewal fails

**Solutions:**
```bash
# Check renewal status
sudo certbot renew --dry-run --verbose

# Manual renewal
sudo certbot renew --force-renewal

# View logs
sudo journalctl -u certbot.service
```

### Self-Signed Certificate Warnings
**Problem:** Browser warning with self-signed certificate

**Note:** Self-signed certificates should ONLY be used for development/testing. Production must use a trusted CA.

### Port 80/443 Already in Use
```bash
# Check what's using the ports
sudo lsof -i :80
sudo lsof -i :443

# Kill the process if needed
sudo kill -9 <PID>
```

---

## Cost Summary

| Option | Cost | Ease | Recommended |
|--------|------|------|-------------|
| Let's Encrypt | FREE | Medium | ✅ Yes |
| Vercel | $20/month | Very Easy | ✅ Yes |
| AWS | Pay-as-you-go | Hard | For enterprise |
| Heroku | $7+/month | Easy | Budget option |
| DigitalOcean | $6+/month | Medium | Good balance |

---

## Next Steps

1. **Choose deployment option** (Let's Encrypt + nginx recommended)
2. **Obtain certificate** (see steps above)
3. **Update FRONTEND_URL** in backend `.env`
4. **Test HTTPS** with curl and browser
5. **Monitor certificate expiry** (set calendar reminder for renewal)
6. **Run security tests** to verify everything works

---

## Support Resources

- [Let's Encrypt Docs](https://letsencrypt.org/docs/)
- [Certbot Documentation](https://certbot.eff.org/)
- [OWASP HTTPS Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)

---

**Last Updated:** 2026-05-22  
**Status:** Ready for deployment with HTTPS
