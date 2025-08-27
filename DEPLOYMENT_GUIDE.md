# Mindful Ad Wizard - Deployment Guide

## Overview
This guide covers deploying the Mindful Ad Wizard AI-powered advertising platform for psychology professionals.

## System Requirements

### Backend Requirements
- Node.js 18+ 
- PostgreSQL 14+
- Redis (for session storage)
- 2GB+ RAM
- 10GB+ disk space

### Environment Variables
Create `.env` files for both frontend and backend:

#### Backend Environment Variables (`.env`)
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/mindful_ad_wizard"

# JWT Secrets
JWT_SECRET="your-super-secure-jwt-secret-key-here"
JWT_REFRESH_SECRET="your-super-secure-refresh-secret-key-here"

# API Keys
OPENAI_API_KEY="sk-your-openai-api-key"
META_APP_ID="your-meta-app-id"
META_APP_SECRET="your-meta-app-secret"
META_ACCESS_TOKEN="your-meta-access-token"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_DEVELOPER_TOKEN="your-google-ads-developer-token"

# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
FROM_EMAIL="noreply@mindfuladwizard.com"
FROM_NAME="Mindful Ad Wizard"

# Application
NODE_ENV="production"
PORT=5000
CLIENT_URL="https://yourdomain.com"
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Frontend Environment Variables (`.env`)
```env
VITE_API_URL="https://api.yourdomain.com/api"
```

## Database Setup

### 1. Install PostgreSQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create Database
```sql
sudo -u postgres psql

CREATE DATABASE mindful_ad_wizard;
CREATE USER mindful_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE mindful_ad_wizard TO mindful_user;
\q
```

### 3. Run Database Migrations
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed
```

## Deployment Options

### Option 1: Docker Deployment (Recommended)

#### 1. Create Docker Compose File
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    restart: always
    environment:
      POSTGRES_DB: mindful_ad_wizard
      POSTGRES_USER: mindful_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    restart: always
    ports:
      - "6379:6379"

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: always
    environment:
      - DATABASE_URL=postgresql://mindful_user:secure_password@postgres:5432/mindful_ad_wizard
      - NODE_ENV=production
    ports:
      - "5000:5000"
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend/.env:/app/.env

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: always
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

#### 2. Create Backend Dockerfile
```dockerfile
# /backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate

EXPOSE 5000

CMD ["npm", "start"]
```

#### 3. Create Frontend Dockerfile
```dockerfile
# /frontend/Dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### 4. Deploy with Docker
```bash
docker-compose up -d
```

### Option 2: Traditional Server Deployment

#### 1. Setup Backend
```bash
# Clone and setup backend
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed

# Install PM2 for process management
npm install -g pm2

# Start backend with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

#### 2. Setup Frontend
```bash
cd frontend
npm install
npm run build

# Serve with Nginx
sudo cp -r dist/* /var/www/html/
```

#### 3. Configure Nginx
```nginx
# /etc/nginx/sites-available/mindful-ad-wizard
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Frontend
    location / {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # API Backend
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 4. Enable SSL with Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Cloud Deployment

### AWS Deployment

#### 1. Using AWS Elastic Beanstalk
```bash
# Install EB CLI
pip install awsebcli

# Initialize EB application
eb init

# Create environment
eb create production

# Deploy
eb deploy
```

#### 2. Using AWS ECS (Docker)
- Push images to ECR
- Create ECS cluster
- Define task definitions
- Configure load balancer
- Setup RDS PostgreSQL

### Google Cloud Platform

#### 1. Using Cloud Run
```bash
# Build and push images
gcloud builds submit --tag gcr.io/PROJECT_ID/mindful-ad-wizard-backend ./backend
gcloud builds submit --tag gcr.io/PROJECT_ID/mindful-ad-wizard-frontend ./frontend

# Deploy services
gcloud run deploy mindful-backend --image gcr.io/PROJECT_ID/mindful-ad-wizard-backend --platform managed
gcloud run deploy mindful-frontend --image gcr.io/PROJECT_ID/mindful-ad-wizard-frontend --platform managed
```

### Digital Ocean

#### 1. Using App Platform
- Connect GitHub repository
- Configure build settings
- Add environment variables
- Deploy with automatic builds

## Database Backup

### Automated Backup Script
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="mindful_ad_wizard"

# Create backup
pg_dump $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/backup_$DATE.sql s3://your-backup-bucket/
```

### Cron Job for Daily Backups
```bash
# Add to crontab
0 2 * * * /path/to/backup.sh
```

## Monitoring

### 1. Application Monitoring
```javascript
// Add to server.js
import winston from 'winston';
import 'winston-daily-rotate-file';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});
```

### 2. Health Check Endpoint
The API includes `/api/admin/health` for monitoring services.

### 3. Performance Monitoring
Consider integrating:
- New Relic
- DataDog  
- Sentry for error tracking

## Security Considerations

### 1. Environment Security
- Use environment variables for all secrets
- Enable firewall rules
- Regular security updates
- SSL/TLS certificates

### 2. Database Security
- Use connection pooling
- Enable SSL for database connections
- Regular security patches
- Backup encryption

### 3. Application Security
- Rate limiting (already implemented)
- Input validation (already implemented)
- CORS configuration
- Security headers

## Scaling Considerations

### 1. Horizontal Scaling
- Load balancer for multiple backend instances
- Database read replicas
- Redis clustering
- CDN for static assets

### 2. Vertical Scaling
- Increase server resources
- Database optimization
- Connection pooling
- Caching strategies

## Maintenance

### 1. Regular Tasks
- Database backups
- Log rotation  
- Security updates
- Performance monitoring

### 2. Updates
- Test in staging environment
- Database migration planning
- Zero-downtime deployments
- Rollback procedures

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Check DATABASE_URL format
   - Verify PostgreSQL service status
   - Check firewall rules

2. **API Integration Failures**
   - Verify API keys are valid
   - Check rate limits
   - Monitor error logs

3. **Email Delivery Issues**
   - Verify SMTP credentials
   - Check spam folders
   - Monitor email service status

### Logs Location
- Application logs: `/app/logs/`
- Nginx logs: `/var/log/nginx/`
- PostgreSQL logs: `/var/log/postgresql/`

## Support

For deployment issues or questions:
1. Check application logs
2. Review this documentation
3. Contact system administrator
4. Create issue in project repository

---

**Note:** Always test deployments in a staging environment before production deployment.