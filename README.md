# Mindful Ad Wizard 🧠✨

An AI-powered advertising platform specifically designed for psychology professionals to create, manage, and optimize advertising campaigns across Google Ads and Meta (Facebook/Instagram) platforms.

## 🌟 Features

### For Psychology Professionals
- **AI-Powered Campaign Creation**: Generate compelling ad copy and targeting suggestions using GPT-4
- **Multi-Platform Management**: Manage Google Ads and Meta Ads campaigns from one dashboard  
- **Lead Tracking**: Comprehensive lead management with conversion tracking
- **Landing Page Builder**: Create professional landing pages with psychology-focused templates
- **Analytics & Reporting**: Real-time performance metrics and AI-powered insights
- **Compliance Ready**: Built with healthcare marketing compliance in mind

### User Experience
- **Intuitive Dashboard** - Clean, modern interface with key metrics
- **Campaign Builder** - Step-by-step campaign creation with AI assistance
- **Performance Analytics** - Detailed metrics and optimization suggestions
- **Mobile Responsive** - Works perfectly on all devices
- **Smart AI Assistant** - ChatGPT-style analysis and recommendations

### Admin Features
- **User Management** - Complete user oversight and control
- **System Monitoring** - Platform health and security status
- **Analytics Dashboard** - System-wide performance metrics
- **Configuration Management** - System settings and limits

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern React with TypeScript
- **Tailwind CSS** - Utility-first CSS framework
- **ShadCN/UI** - High-quality, accessible component library
- **React Router** - Client-side routing
- **React Query** - Server state management
- **React Hook Form** - Form handling with validation
- **Zod** - Schema validation
- **Lucide React** - Beautiful icons
- **Sonner** - Toast notifications

### Backend
- **Node.js + Express** - Server runtime and web framework
- **PostgreSQL + Prisma** - Database with modern ORM
- **JWT Authentication** - Secure user sessions with refresh tokens
- **OpenAI Integration** - GPT-4 for AI content generation
- **Meta Ads API** - Facebook/Instagram advertising platform
- **Google Ads API** - Google advertising platform
- **Docker** - Full containerization for easy deployment

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL (for local development)

### 🐳 Docker Deployment (Recommended)

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd mindful-ad-wizard
   cp .env.example .env
   ```

2. **Configure Environment**
   Edit `.env` file with your API keys and secrets:
   ```env
   # Required
   OPENAI_API_KEY=sk-your-openai-key
   POSTGRES_PASSWORD=your-secure-password
   JWT_SECRET=your-jwt-secret
   JWT_REFRESH_SECRET=your-refresh-secret
   
   # Optional API Keys
   META_APP_ID=your-meta-app-id
   GOOGLE_CLIENT_ID=your-google-client-id
   ```

3. **Deploy Development Environment**
   ```bash
   ./scripts/deploy.sh dev build
   ```

4. **Deploy Production Environment**
   ```bash
   ./scripts/deploy.sh prod build
   ```

### 🌐 Access Your Application

- **Development**: 
  - Frontend: http://localhost:5173
  - Backend API: http://localhost:5000
  
- **Production**: 
  - Application: http://localhost
  - API Health: http://localhost/api/admin/health

### 👤 Default Admin Account
After seeding:
- Email: `admin@mindfuladwizard.com`
- Password: `admin123!`

## 📖 Documentation

### API Documentation
Comprehensive API documentation is available at: `/backend/API_DOCUMENTATION.md`

### Deployment Guide
Detailed deployment instructions: `/DEPLOYMENT_GUIDE.md`

### Key Endpoints
- **Authentication**: `/api/auth/*`
- **Campaigns**: `/api/campaigns/*`
- **Leads**: `/api/leads/*`
- **AI Chat**: `/api/ai/*`
- **Analytics**: `/api/analytics/*`
- **Admin**: `/api/admin/*`

## 🛠️ Development

### Local Development Setup

1. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Configure your .env file
   npx prisma migrate dev
   npm run seed
   npm run dev
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Database Management

**Migrations**
```bash
# Create migration
npx prisma migrate dev --name migration-name

# Deploy migrations
npx prisma migrate deploy

# Reset database
npx prisma migrate reset
```

**Database Seeding**
```bash
npm run seed
```

### Testing
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 📁 Project Structure

```
mindful-ad-wizard/
├── frontend/                   # React TypeScript frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/             # Page components
│   │   ├── contexts/          # React contexts
│   │   ├── lib/               # Utilities and API calls
│   │   └── types/             # TypeScript definitions
│   └── Dockerfile             # Frontend container
├── backend/                    # Node.js Express backend
│   ├── src/
│   │   ├── controllers/       # API route handlers
│   │   ├── middleware/        # Auth, validation, error handling
│   │   ├── routes/            # API route definitions
│   │   ├── services/          # External API integrations
│   │   └── utils/             # Helper functions
│   ├── prisma/                # Database schema and migrations
│   ├── tests/                 # Test suites
│   └── Dockerfile             # Backend container
├── nginx/                      # Reverse proxy configuration
├── scripts/                    # Deployment and utility scripts
├── docker-compose.yml          # Main Docker configuration
├── docker-compose.dev.yml      # Development environment
├── docker-compose.prod.yml     # Production environment
└── .env.example               # Environment variables template
```

## 🗄️ Database Backup

### Manual Backup
```bash
./scripts/backup.sh manual prod
```

### Automated Backup
Backups run automatically in production every 24 hours. Configure cloud storage:
```env
S3_BACKUP_BUCKET=your-s3-bucket
GCS_BACKUP_BUCKET=your-gcs-bucket
```

### List Backups
```bash
./scripts/backup.sh list
```

### Restore Database
```bash
./scripts/backup.sh restore
```

## 🔧 Configuration

### Environment Variables

**Required Variables**
- `OPENAI_API_KEY`: OpenAI API key for AI features
- `POSTGRES_PASSWORD`: Database password  
- `JWT_SECRET`: JWT signing secret
- `JWT_REFRESH_SECRET`: JWT refresh token secret

**Optional API Integrations**
- `META_APP_ID`, `META_APP_SECRET`: Meta Ads API
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google Ads API
- `SMTP_*`: Email configuration

**Application Settings**
- `CLIENT_URL`: Frontend URL
- `DOMAIN`: Your domain name
- `NODE_ENV`: Environment (development/production)

### Docker Compose Profiles

- **Development**: `docker-compose.dev.yml` - Hot reloading enabled
- **Production**: `docker-compose.prod.yml` - Optimized for production
- **Main**: `docker-compose.yml` - Balanced configuration

## 📊 Monitoring

### Health Checks
- Application: `/api/admin/health`
- Nginx: `/health`
- Database: Built-in Docker health checks

### Logging
- Application logs: `logs/`
- Nginx logs: `/var/log/nginx/`
- Docker logs: `docker-compose logs`

### Metrics
- System stats: `/api/admin/stats`
- Performance metrics: `/api/analytics/performance`

## 🔒 Security

### Security Features
- JWT authentication with refresh tokens
- Rate limiting on all endpoints
- Input validation and sanitization
- SQL injection prevention (Prisma ORM)
- XSS protection headers
- CORS configuration
- Password hashing (bcrypt)

### Production Security
- Change all default passwords
- Use strong JWT secrets
- Configure HTTPS/SSL certificates
- Set up firewall rules
- Regular security updates

## 🚢 Deployment Options

### Docker (Recommended)
- Single command deployment
- Automated health checks
- Built-in backup system
- Scalable architecture

### Traditional Hosting
- VPS/Dedicated server deployment
- Manual service management
- Custom configurations

### Cloud Platforms
- AWS (Elastic Beanstalk, ECS)
- Google Cloud (Cloud Run)
- Digital Ocean (App Platform)
- Heroku

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 🆘 Support

### Common Issues

1. **Docker Issues**
   - Ensure Docker daemon is running
   - Check port availability (80, 5000, 5432, 6379)
   - Verify .env file configuration

2. **Database Connection**
   - Check DATABASE_URL format
   - Ensure PostgreSQL container is healthy
   - Verify credentials

3. **API Integration**
   - Validate API keys
   - Check rate limits
   - Review error logs

### Getting Help

1. Check the documentation
2. Review Docker logs: `docker-compose logs`
3. Check application logs in `logs/` directory
4. Create an issue in the repository

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│     Nginx       │    │    Frontend      │    │    Backend      │
│  (Reverse       │───▶│   (React +       │───▶│  (Node.js +     │
│   Proxy)        │    │   TypeScript)    │    │   Express)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                       ┌──────────────────┐             │
                       │   PostgreSQL     │◀────────────┘
                       │   (Database)     │
                       └──────────────────┘
                                │
                       ┌──────────────────┐
                       │     Redis        │
                       │  (Cache/Session) │
                       └──────────────────┘
```

### External Integrations
- **OpenAI GPT-4**: AI content generation
- **Meta Ads API**: Facebook/Instagram advertising
- **Google Ads API**: Google advertising platform
- **Email Service**: SMTP for notifications

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ for psychology professionals** 

Transform your practice with AI-powered advertising that understands your needs.