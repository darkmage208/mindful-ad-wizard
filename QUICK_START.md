# Quick Start - Mindful Ad Wizard

## 🚀 One-Command Deployment

### Prerequisites
- Docker and Docker Compose installed
- At least 4GB RAM available

### Deploy in 3 Steps

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd mindful-ad-wizard
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your OpenAI API key (required)
   ```

3. **Deploy with Docker**
   ```bash
   ./quick-deploy.sh
   ```

### Access Your Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Admin Login**: admin@mindfuladwizard.com / admin123!

### Required Configuration

Edit `.env` file and add:
```env
OPENAI_API_KEY=sk-your_openai_api_key_here
POSTGRES_PASSWORD=your_secure_password
JWT_SECRET=your_super_secure_64_character_jwt_secret_key_here
JWT_REFRESH_SECRET=your_super_secure_64_character_refresh_secret_key_here
```

### Development Mode

For development with hot reloading:
```bash
docker-compose -f docker-compose.dev.yml up -d --build
```

Access at:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

### Production Mode

For production deployment:
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

Access at: http://localhost

### Common Commands

```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart services
docker-compose restart

# Access database
docker-compose exec postgres psql -U mindful_user -d mindful_ad_wizard

# Create backup
./scripts/backup.sh manual prod
```

### Troubleshooting

**Build Fails - Package Lock Missing**
```bash
cd backend && npm install --package-lock-only
cd ../frontend && npm install --package-lock-only
docker-compose build --no-cache
```

**Port Already in Use**
```bash
# Check what's using the port
lsof -i :5000
# Kill the process or change ports in .env
```

**Database Connection Issues**
```bash
# Check database logs
docker-compose logs postgres
# Restart database
docker-compose restart postgres
```

**Memory Issues**
```bash
# Check Docker memory
docker system df
# Clean up unused containers/images
docker system prune
```

### Demo Data

The system includes demo users and campaigns:
- Admin: admin@mindfuladwizard.com / admin123!
- Demo Client: sarah.johnson@example.com / demo123!

### Next Steps

1. **Configure API Keys**: Add your Meta and Google Ads API keys for full functionality
2. **SSL Setup**: Configure HTTPS for production deployment
3. **Monitoring**: Set up logging and monitoring
4. **Backups**: Configure automated backups

For detailed documentation, see:
- `API_DOCUMENTATION.md` - Complete API reference
- `DEPLOYMENT_GUIDE.md` - Detailed deployment instructions
- `DOCKER_DEPLOYMENT.md` - Docker-specific deployment guide