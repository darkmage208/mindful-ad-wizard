# Production Deployment Guide

This guide provides step-by-step instructions for deploying Mindful Ad Wizard to production on your Hostinger VPS with domain `autonomiapro.com.br`.

## Prerequisites

1. **VPS Requirements:**
   - Ubuntu/Debian server
   - Docker and Docker Compose installed
   - Root or sudo access

2. **Domain Setup:**
   - `autonomiapro.com.br` pointing to your VPS IP address
   - Both `autonomiapro.com.br` and `www.autonomiapro.com.br` DNS records

3. **Firewall Configuration:**
   - Ports 22 (SSH), 80 (HTTP), 443 (HTTPS) open
   - Configure both server firewall and Hostinger VPS panel firewall

## File Structure

After refactoring, you have these essential files:

```
mindful-ad-wizard/
├── docker-compose.yml          # Development environment
├── docker-compose.prod.yml     # Production environment
├── .env.prod                   # Production environment template
├── deploy.sh                   # Production deployment script
├── setup-ssl.sh               # SSL certificate setup
├── nginx/
│   ├── nginx.conf             # Main nginx configuration
│   └── default.conf           # Server blocks (HTTP & HTTPS)
└── DEPLOYMENT.md              # This file
```

## Step-by-Step Deployment

### Step 1: Environment Configuration

1. **Copy and configure environment variables:**
   ```bash
   cp .env.prod .env
   nano .env
   ```

2. **Fill in required values in `.env`:**
   ```env
   # Database (REQUIRED)
   POSTGRES_PASSWORD=your_secure_database_password

   # JWT Security (REQUIRED - minimum 32 characters each)
   JWT_SECRET=your_super_secure_jwt_secret_key_minimum_32_chars
   JWT_REFRESH_SECRET=your_super_secure_refresh_secret_key_minimum_32_chars

   # API Keys
   OPENAI_API_KEY=sk-your_openai_key_here
   META_APP_ID=your_meta_app_id
   META_APP_SECRET=your_meta_app_secret
   META_ACCESS_TOKEN=your_meta_access_token
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_DEVELOPER_TOKEN=your_google_developer_token

   # Email Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   FROM_EMAIL=noreply@autonomiapro.com.br
   FROM_NAME=Autonomia Pro
   ```

### Step 2: Firewall Setup

1. **Configure UFW firewall:**
   ```bash
   # Enable firewall with required ports
   sudo ufw allow 22
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw --force enable
   sudo ufw status
   ```

2. **Configure Hostinger VPS firewall:**
   - Login to Hostinger control panel
   - Navigate to VPS Management → Firewall/Security
   - Ensure ports 22, 80, and 443 are open from `0.0.0.0/0`

### Step 3: Deploy to Production

1. **Run the deployment script:**
   ```bash
   ./deploy.sh
   ```

   This script will:
   - Check environment configuration
   - Stop any existing containers
   - Build and start all production services
   - Verify services are running
   - Test local connectivity
   - Display deployment status

2. **Verify deployment:**
   ```bash
   # Check container status
   docker compose -f docker-compose.prod.yml ps

   # Test local connectivity
   curl -I http://localhost/health

   # Test external connectivity (from local computer)
   curl -I http://autonomiapro.com.br/health
   ```

### Step 4: SSL Certificate Setup

1. **Ensure external connectivity works:**
   From your local computer (not the VPS), test:
   ```bash
   curl -I http://autonomiapro.com.br/health
   telnet autonomiapro.com.br 80
   ```

2. **Set up SSL certificates:**
   ```bash
   ./setup-ssl.sh
   ```

   This script will:
   - Verify production environment is running
   - Confirm external connectivity
   - Obtain Let's Encrypt SSL certificates
   - Reload nginx with SSL configuration

3. **Verify SSL setup:**
   ```bash
   # Test HTTPS
   curl -I https://autonomiapro.com.br/health
   
   # Check certificate
   openssl s_client -connect autonomiapro.com.br:443 -servername autonomiapro.com.br
   ```

## Environment Management

### Development Environment

```bash
# Start development environment with PgAdmin
docker compose --profile dev up -d

# Access points:
# Frontend: http://localhost:3000
# Backend:  http://localhost:5000
# PgAdmin:  http://localhost:8080
```

### Production Environment

```bash
# Deploy to production
./deploy.sh

# View logs
docker compose -f docker-compose.prod.yml logs

# Restart services
docker compose -f docker-compose.prod.yml restart

# Stop production
docker compose -f docker-compose.prod.yml down
```

## Monitoring and Maintenance

### Health Checks

```bash
# Check all services
docker compose -f docker-compose.prod.yml ps

# Health endpoint
curl http://localhost/health

# Service-specific logs
docker compose -f docker-compose.prod.yml logs nginx
docker compose -f docker-compose.prod.yml logs backend
```

### SSL Certificate Renewal

SSL certificates automatically renew via the certbot container. Manual renewal:

```bash
# Manual renewal
docker compose -f docker-compose.prod.yml run --rm certbot certbot renew
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

### Backup Strategy

```bash
# Database backup
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U mindful_user mindful_ad_wizard > backup_$(date +%Y%m%d).sql

# File uploads backup
docker cp $(docker compose -f docker-compose.prod.yml ps -q backend):/app/uploads ./uploads_backup_$(date +%Y%m%d)
```

## Troubleshooting

### Common Issues

1. **Services won't start:**
   ```bash
   # Check logs
   docker compose -f docker-compose.prod.yml logs
   
   # Check environment variables
   docker compose -f docker-compose.prod.yml config
   ```

2. **SSL certificate fails:**
   - Verify firewall allows port 80
   - Confirm DNS points to correct IP
   - Test external connectivity first

3. **Database connection issues:**
   ```bash
   # Check database logs
   docker compose -f docker-compose.prod.yml logs postgres
   
   # Verify database is healthy
   docker compose -f docker-compose.prod.yml ps postgres
   ```

### Recovery Commands

```bash
# Complete restart
docker compose -f docker-compose.prod.yml down
./deploy.sh

# Rebuild containers
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build

# View real-time logs
docker compose -f docker-compose.prod.yml logs -f
```

## Security Considerations

1. **Environment Variables:** Never commit `.env` files to version control
2. **Firewall:** Only allow necessary ports
3. **SSL:** Always use HTTPS in production
4. **Updates:** Regularly update Docker images and system packages
5. **Backups:** Implement regular automated backups

## Quick Reference

| Command | Purpose |
|---------|---------|
| `./deploy.sh` | Deploy to production |
| `./setup-ssl.sh` | Set up SSL certificates |
| `docker compose -f docker-compose.prod.yml ps` | Check service status |
| `docker compose -f docker-compose.prod.yml logs` | View logs |
| `docker compose -f docker-compose.prod.yml restart` | Restart services |
| `docker compose -f docker-compose.prod.yml down` | Stop production |

Your production application will be available at:
- **HTTP:** http://autonomiapro.com.br
- **HTTPS:** https://autonomiapro.com.br (after SSL setup)