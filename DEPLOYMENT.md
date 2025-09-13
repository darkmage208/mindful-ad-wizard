# Deployment Guide for Mindful Ad Wizard

This guide covers deploying the Mindful Ad Wizard application to your Hostinger VPS with the domain `autonomiapro.com.br`.

## Prerequisites

1. VPS with Docker and Docker Compose installed
2. Domain `autonomiapro.com.br` pointing to your VPS IP
3. All required environment variables configured

## Files Overview

- `docker-compose.yml` - Local development environment
- `docker-compose.dev.yml` - Development environment (copy of docker-compose.yml)
- `docker-compose.prod.yml` - Production environment with SSL
- `.env.prod` - Production environment variables
- `setup-ssl.sh` - SSL certificate setup script

## Production Deployment Steps

### 1. Prepare Environment Variables

Copy `.env.prod` and fill in all required values:

```bash
cp .env.prod .env
```

Edit `.env` with your production values:
- Database passwords
- JWT secrets (minimum 32 characters)
- API keys (OpenAI, Meta, Google)
- Email configuration
- Domain settings

### 2. Set Up SSL Certificates

Before starting the application, set up SSL certificates:

```bash
# Make sure the setup script is executable
chmod +x setup-ssl.sh

# Run the SSL setup
./setup-ssl.sh
```

This will:
- Create necessary certificate directories
- Start a temporary nginx container
- Obtain Let's Encrypt certificates for autonomiapro.com.br
- Create a renewal script

### 3. Deploy to Production

Once SSL is set up, deploy the application:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

This single command will:
- Build and start all services
- Configure nginx with SSL
- Set up automatic certificate renewal
- Start the application on https://autonomiapro.com.br

### 4. Verify Deployment

Check that all services are running:

```bash
docker-compose -f docker-compose.prod.yml ps
```

Test the application:
- Visit https://autonomiapro.com.br
- Check API health: https://autonomiapro.com.br/api/health
- Verify SSL certificate is valid

## Local Development

For local development, use the standard docker-compose:

```bash
# Start development environment
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
# Database Admin: http://localhost:8080
```

The development environment includes:
- Hot reload for frontend and backend
- PgAdmin for database management
- No SSL (HTTP only)

## Environment Variables

### Required Production Variables

```env
# Database
POSTGRES_PASSWORD=your_secure_password

# Security
JWT_SECRET=your_32_char_minimum_secret
JWT_REFRESH_SECRET=your_32_char_minimum_refresh_secret

# APIs
OPENAI_API_KEY=sk-...
META_APP_ID=...
META_APP_SECRET=...
META_ACCESS_TOKEN=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_DEVELOPER_TOKEN=...

# Email
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Domain
DOMAIN=autonomiapro.com.br
```

## SSL Certificate Renewal

SSL certificates are automatically renewed by the certbot service. You can also manually renew:

```bash
# Run the renewal script
./renew-ssl.sh

# Or manually with docker
docker-compose -f docker-compose.prod.yml exec certbot certbot renew
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

## Troubleshooting

### Common Issues

1. **SSL Certificate Issues**
   - Ensure domain points to your VPS
   - Check firewall allows ports 80 and 443
   - Run `./setup-ssl.sh` again

2. **Application Not Starting**
   - Check logs: `docker-compose -f docker-compose.prod.yml logs`
   - Verify environment variables in `.env`
   - Ensure all services are healthy

3. **Database Connection Issues**
   - Check PostgreSQL is running: `docker-compose -f docker-compose.prod.yml ps postgres`
   - Verify DATABASE_URL format
   - Check database initialization logs

### Useful Commands

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs [service_name]

# Restart a service
docker-compose -f docker-compose.prod.yml restart [service_name]

# Update and rebuild
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# Access container shell
docker-compose -f docker-compose.prod.yml exec [service_name] sh
```

## Security Considerations

1. **Environment Variables**: Never commit `.env` files to version control
2. **Firewall**: Only allow necessary ports (22, 80, 443)
3. **Updates**: Regularly update Docker images and system packages
4. **Backups**: Set up regular database backups
5. **Monitoring**: Monitor application logs and resource usage

## Backup Strategy

Set up regular backups of:
- PostgreSQL database
- User uploads
- SSL certificates
- Environment configuration

Example backup script:

```bash
# Database backup
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U mindful_user mindful_ad_wizard > backup_$(date +%Y%m%d).sql

# File uploads backup
docker cp $(docker-compose -f docker-compose.prod.yml ps -q backend):/app/uploads ./uploads_backup_$(date +%Y%m%d)
```