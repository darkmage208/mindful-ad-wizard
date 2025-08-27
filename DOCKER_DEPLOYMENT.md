# Docker Deployment Guide - Mindful Ad Wizard

This guide provides step-by-step instructions for deploying the Mindful Ad Wizard platform using Docker.

## 📋 Prerequisites

### System Requirements
- **Docker Engine**: Version 20.10+ 
- **Docker Compose**: Version 2.0+
- **Operating System**: Linux, macOS, or Windows (with WSL2)
- **Memory**: Minimum 4GB RAM (8GB recommended for production)
- **Storage**: 20GB+ available disk space

### Check Prerequisites
```bash
# Check Docker version
docker --version

# Check Docker Compose version
docker-compose --version

# Verify Docker is running
docker info
```

## 🚀 Quick Deployment

### 1. Clone Repository
```bash
git clone <repository-url>
cd mindful-ad-wizard
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit with your actual values
nano .env
```

### 3. Deploy
```bash
# Development deployment with hot reloading
./scripts/deploy.sh dev build

# OR Production deployment
./scripts/deploy.sh prod build
```

## 📝 Environment Configuration

### Required Environment Variables

Edit your `.env` file with these essential variables:

```env
# Database
POSTGRES_PASSWORD=your_secure_database_password

# JWT Authentication
JWT_SECRET=your_super_secure_jwt_secret_key_64_chars_minimum
JWT_REFRESH_SECRET=your_super_secure_refresh_secret_key_64_chars_minimum

# OpenAI API (Required for AI features)
OPENAI_API_KEY=sk-your_openai_api_key_here
```

### Optional API Integrations

```env
# Meta/Facebook Ads API
META_APP_ID=your_meta_application_id
META_APP_SECRET=your_meta_application_secret
META_ACCESS_TOKEN=your_meta_access_token

# Google Ads API
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_DEVELOPER_TOKEN=your_google_ads_developer_token

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
FROM_EMAIL=noreply@mindfuladwizard.com
FROM_NAME=Mindful Ad Wizard
```

### Application Settings

```env
# URLs
CLIENT_URL=http://localhost:3000
VITE_API_URL=http://localhost:5000/api

# Ports (can be customized)
BACKEND_PORT=5000
FRONTEND_PORT=3000
HTTP_PORT=80
HTTPS_PORT=443

# Domain (for production)
DOMAIN=yourdomain.com
```

## 🔧 Deployment Configurations

### Development Environment

**File**: `docker-compose.dev.yml`

**Features**:
- Hot reloading for both frontend and backend
- Development database with demo data
- Exposed ports for direct access
- Volume mounts for live code changes

**Deploy**:
```bash
./scripts/deploy.sh dev build
```

**Access**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- Database: localhost:5432
- Redis: localhost:6379

### Production Environment

**File**: `docker-compose.prod.yml`

**Features**:
- Optimized Docker images
- Nginx reverse proxy
- Health checks and auto-restart
- Resource limits
- Automated backups
- Security headers

**Deploy**:
```bash
./scripts/deploy.sh prod build
```

**Access**:
- Application: http://localhost
- Health Check: http://localhost/api/admin/health

### Balanced Environment

**File**: `docker-compose.yml`

**Features**:
- Production-ready but accessible
- Good for staging environments
- Direct service access with proxy

## 🐳 Docker Services

### 1. PostgreSQL Database
- **Image**: `postgres:15-alpine`
- **Purpose**: Primary data storage
- **Port**: 5432 (internal)
- **Volume**: Persistent data storage
- **Health Check**: pg_isready

### 2. Redis Cache
- **Image**: `redis:7-alpine`
- **Purpose**: Session storage and caching
- **Port**: 6379 (internal)
- **Volume**: Persistent cache data
- **Health Check**: redis-cli ping

### 3. Backend API
- **Build**: Custom Node.js image
- **Purpose**: REST API server
- **Port**: 5000
- **Features**: Prisma ORM, JWT auth, AI integration
- **Health Check**: /api/admin/health endpoint

### 4. Frontend App
- **Build**: Custom React image with Nginx
- **Purpose**: User interface
- **Port**: 80 (in container)
- **Features**: React 18, TypeScript, Tailwind CSS
- **Health Check**: HTTP response check

### 5. Nginx Proxy (Production)
- **Build**: Custom Nginx image
- **Purpose**: Reverse proxy and load balancer
- **Ports**: 80, 443
- **Features**: SSL termination, rate limiting, gzip compression
- **Health Check**: /health endpoint

## 🔍 Monitoring and Health Checks

### Service Health Checks

All services include health checks:

```bash
# Check all service status
docker-compose ps

# Check specific service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres

# Monitor health checks
docker-compose exec backend curl http://localhost:5000/api/admin/health
```

### Application Health Endpoints

- **Backend Health**: `GET /api/admin/health`
- **Nginx Health**: `GET /health`
- **Frontend Health**: Browser access test

### Monitoring Commands

```bash
# View real-time logs
docker-compose logs -f

# Monitor resource usage
docker stats

# View service details
docker-compose ps --services
docker-compose top
```

## 🗄️ Database Management

### Initial Setup
Database initialization happens automatically on first run:
1. Database creation
2. Schema migration
3. Demo data seeding (development)

### Manual Database Operations

```bash
# Run migrations
docker-compose exec backend npx prisma migrate deploy

# Seed demo data
docker-compose exec backend npm run seed

# Access database directly
docker-compose exec postgres psql -U mindful_user -d mindful_ad_wizard

# Create database backup
./scripts/backup.sh manual prod
```

### Database Backups

Automated backups are configured in production:

```bash
# Manual backup
./scripts/backup.sh manual prod

# List available backups
./scripts/backup.sh list

# Restore from backup
./scripts/backup.sh restore
```

## 🔧 Maintenance Operations

### Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart services
./scripts/deploy.sh prod build

# OR restart without rebuilding
docker-compose restart
```

### Scale Services

```bash
# Scale backend replicas
docker-compose up -d --scale backend=3

# Scale frontend replicas  
docker-compose up -d --scale frontend=2
```

### View Logs

```bash
# All services
docker-compose logs

# Specific service with follow
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100

# Specific time range
docker-compose logs --since="2024-01-01T00:00:00"
```

### Cleanup

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: Data loss!)
docker-compose down -v

# Remove unused images
docker image prune

# Full cleanup (WARNING: Removes everything!)
docker system prune -a
```

## 🔒 Security Configuration

### Production Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secrets (64+ characters)
- [ ] Configure HTTPS with SSL certificates
- [ ] Set up firewall rules
- [ ] Enable Docker security features
- [ ] Configure log rotation
- [ ] Set up monitoring alerts

### SSL/HTTPS Setup

1. **Obtain SSL Certificates**:
   ```bash
   # Using Let's Encrypt
   certbot certonly --standalone -d yourdomain.com
   ```

2. **Update Nginx Configuration**:
   ```bash
   # Copy certificates to nginx volume
   docker cp /etc/letsencrypt/live/yourdomain.com/ nginx_certs:/
   ```

3. **Enable HTTPS in docker-compose.prod.yml**:
   Uncomment the HTTPS server block in nginx configuration.

### Firewall Configuration

```bash
# Allow only necessary ports
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable

# Block direct access to services
ufw deny 5000   # Backend
ufw deny 5432   # PostgreSQL
ufw deny 6379   # Redis
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Find process using port
sudo lsof -i :5000
sudo lsof -i :3000

# Kill process or change port in .env
```

#### 2. Permission Errors
```bash
# Fix Docker permissions
sudo chmod +x scripts/*.sh
sudo chown -R $USER:$USER .
```

#### 3. Database Connection Issues
```bash
# Check database logs
docker-compose logs postgres

# Verify environment variables
docker-compose exec backend env | grep DATABASE_URL

# Test database connection
docker-compose exec backend npx prisma db pull
```

#### 4. Build Failures
```bash
# Clear Docker cache
docker builder prune

# Rebuild without cache
docker-compose build --no-cache

# Check for syntax errors in Dockerfiles
```

#### 5. Memory Issues
```bash
# Check available memory
free -h

# Monitor Docker memory usage
docker stats

# Increase swap space if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Debug Mode

Enable verbose logging for troubleshooting:

```bash
# Set debug environment
export VERBOSE_LOGS=true

# Run with debug output
docker-compose --verbose up
```

### Log Analysis

```bash
# Check specific errors
docker-compose logs | grep -i error

# Monitor specific service
docker-compose logs -f --tail=50 backend

# Export logs for analysis
docker-compose logs > debug.log
```

## 📊 Performance Optimization

### Resource Limits

Production deployment includes resource limits:
- **Backend**: 1 CPU, 1GB RAM
- **Frontend**: 0.5 CPU, 512MB RAM
- **Database**: 2 CPU, 2GB RAM
- **Redis**: 0.5 CPU, 512MB RAM

### Performance Monitoring

```bash
# Monitor resource usage
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Check container performance
docker exec backend top
```

### Optimization Tips

1. **Database Optimization**:
   - Connection pooling enabled
   - Indexed queries
   - Regular VACUUM operations

2. **Frontend Optimization**:
   - Nginx gzip compression
   - Static asset caching
   - Minified builds

3. **Backend Optimization**:
   - Node.js clustering
   - Redis caching
   - API rate limiting

## 🚀 Production Deployment

### Pre-deployment Checklist

- [ ] Environment variables configured
- [ ] SSL certificates ready
- [ ] Domain DNS configured
- [ ] Firewall rules set
- [ ] Backup strategy in place
- [ ] Monitoring configured

### Deployment Steps

1. **Prepare Environment**:
   ```bash
   # Create production directory
   mkdir -p /opt/mindful-ad-wizard
   cd /opt/mindful-ad-wizard
   
   # Clone repository
   git clone <repo-url> .
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

3. **Deploy**:
   ```bash
   ./scripts/deploy.sh prod build
   ```

4. **Verify Deployment**:
   ```bash
   # Check service status
   docker-compose ps
   
   # Test health endpoints
   curl http://localhost/api/admin/health
   
   # Check logs for errors
   docker-compose logs | grep -i error
   ```

### Post-deployment

1. **Set up automated backups**
2. **Configure monitoring alerts**
3. **Set up log rotation**
4. **Document access credentials**
5. **Create runbook for operations**

---

## 📞 Support

For Docker deployment issues:

1. **Check this guide** for common solutions
2. **Review logs**: `docker-compose logs`
3. **Verify environment**: Check `.env` configuration
4. **Check system resources**: Memory, disk, CPU
5. **Contact support** with specific error messages

**Deployment completed!** 🎉

Your Mindful Ad Wizard platform should now be running with Docker.