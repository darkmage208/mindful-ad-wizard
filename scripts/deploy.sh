#!/bin/bash

# Mindful Ad Wizard - Docker Deployment Script
# Usage: ./scripts/deploy.sh [dev|prod] [build]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="mindful-ad-wizard"
ENV=${1:-dev}  # dev or prod
BUILD_FLAG=${2:-}  # build flag

echo -e "${BLUE}🚀 Mindful Ad Wizard Deployment Script${NC}"
echo -e "${BLUE}Environment: ${ENV}${NC}"

# Validate environment
if [[ "$ENV" != "dev" && "$ENV" != "prod" ]]; then
    echo -e "${RED}❌ Invalid environment. Use 'dev' or 'prod'${NC}"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Function to check if .env file exists
check_env_file() {
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example${NC}"
            cp .env.example .env
            echo -e "${YELLOW}⚠️  Please edit .env file with your actual values before proceeding${NC}"
            echo -e "${YELLOW}⚠️  Required: OPENAI_API_KEY, POSTGRES_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET${NC}"
            read -p "Press Enter when you have configured .env file..." -r
        else
            echo -e "${RED}❌ .env file not found and no .env.example to copy from${NC}"
            exit 1
        fi
    fi
}

# Function to validate required environment variables
validate_env_vars() {
    echo -e "${BLUE}🔍 Validating environment variables...${NC}"
    
    if [ "$ENV" = "prod" ]; then
        required_vars=("POSTGRES_PASSWORD" "JWT_SECRET" "JWT_REFRESH_SECRET")
        for var in "${required_vars[@]}"; do
            if ! grep -q "^${var}=" .env || grep -q "^${var}=$\|^${var}=.*change.*in.*production" .env; then
                echo -e "${RED}❌ Missing or default value for required variable: ${var}${NC}"
                echo -e "${RED}   Please set a secure value in .env file${NC}"
                exit 1
            fi
        done
    fi
    
    echo -e "${GREEN}✅ Environment validation passed${NC}"
}

# Function to create necessary directories
create_directories() {
    echo -e "${BLUE}📁 Creating necessary directories...${NC}"
    
    mkdir -p backup
    mkdir -p logs
    
    # Create empty log files with proper permissions
    touch logs/app.log
    touch logs/error.log
    
    echo -e "${GREEN}✅ Directories created${NC}"
}

# Function to handle database initialization
init_database() {
    echo -e "${BLUE}🗄️  Preparing database initialization...${NC}"
    
    if [ "$ENV" = "dev" ]; then
        echo -e "${YELLOW}ℹ️  Development database will be initialized automatically${NC}"
    else
        echo -e "${YELLOW}ℹ️  Production database will be initialized on first run${NC}"
    fi
}

# Function to build and deploy
deploy() {
    local compose_file="docker-compose.yml"
    
    if [ "$ENV" = "dev" ]; then
        compose_file="docker-compose.dev.yml"
    elif [ "$ENV" = "prod" ]; then
        compose_file="docker-compose.prod.yml"
    fi
    
    echo -e "${BLUE}🏗️  Starting deployment with ${compose_file}...${NC}"
    
    # Stop existing containers
    echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
    docker-compose -f "$compose_file" down --remove-orphans || true
    
    # Build images if requested or if they don't exist
    if [ "$BUILD_FLAG" = "build" ] || [ "$ENV" = "prod" ]; then
        echo -e "${BLUE}🔨 Building Docker images...${NC}"
        docker-compose -f "$compose_file" build --no-cache
    fi
    
    # Start services
    echo -e "${BLUE}🚀 Starting services...${NC}"
    docker-compose -f "$compose_file" up -d
    
    # Wait for services to be healthy
    echo -e "${BLUE}⏳ Waiting for services to be healthy...${NC}"
    sleep 30
    
    # Check service status
    check_services "$compose_file"
}

# Function to check service status
check_services() {
    local compose_file="$1"
    echo -e "${BLUE}🏥 Checking service health...${NC}"
    
    # Get service status
    services_status=$(docker-compose -f "$compose_file" ps --services --filter "status=running")
    
    if [ -z "$services_status" ]; then
        echo -e "${RED}❌ No services are running${NC}"
        show_logs "$compose_file"
        exit 1
    fi
    
    # Check individual services
    echo -e "${GREEN}✅ Running services:${NC}"
    docker-compose -f "$compose_file" ps
    
    # Test backend health endpoint
    echo -e "${BLUE}🔍 Testing backend health...${NC}"
    sleep 10
    
    backend_health=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/admin/health || echo "000")
    if [ "$backend_health" = "200" ]; then
        echo -e "${GREEN}✅ Backend is healthy${NC}"
    else
        echo -e "${YELLOW}⚠️  Backend health check failed (HTTP $backend_health)${NC}"
        echo -e "${YELLOW}   Backend might still be starting up...${NC}"
    fi
    
    # Test frontend
    echo -e "${BLUE}🔍 Testing frontend...${NC}"
    frontend_port=$([ "$ENV" = "dev" ] && echo "5173" || echo "80")
    frontend_health=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$frontend_port/ || echo "000")
    
    if [ "$frontend_health" = "200" ]; then
        echo -e "${GREEN}✅ Frontend is accessible${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend health check failed (HTTP $frontend_health)${NC}"
    fi
}

# Function to show logs if there are issues
show_logs() {
    local compose_file="$1"
    echo -e "${RED}📋 Recent logs:${NC}"
    docker-compose -f "$compose_file" logs --tail=50
}

# Function to run database migrations and seeding
run_migrations() {
    echo -e "${BLUE}🗄️  Running database migrations and seeding...${NC}"
    
    local compose_file="docker-compose.yml"
    if [ "$ENV" = "dev" ]; then
        compose_file="docker-compose.dev.yml"
    elif [ "$ENV" = "prod" ]; then
        compose_file="docker-compose.prod.yml"
    fi
    
    # Wait for database to be ready
    echo -e "${BLUE}⏳ Waiting for database to be ready...${NC}"
    sleep 15
    
    # Run migrations
    echo -e "${BLUE}🔄 Running Prisma migrations...${NC}"
    docker-compose -f "$compose_file" exec backend npx prisma migrate deploy
    
    # Run seeding (only in development or if requested)
    if [ "$ENV" = "dev" ]; then
        echo -e "${BLUE}🌱 Seeding database with demo data...${NC}"
        docker-compose -f "$compose_file" exec backend npm run seed
    fi
    
    echo -e "${GREEN}✅ Database setup completed${NC}"
}

# Function to display deployment info
show_deployment_info() {
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}📋 Service Information:${NC}"
    
    if [ "$ENV" = "dev" ]; then
        echo -e "  • Frontend (React): ${GREEN}http://localhost:5173${NC}"
        echo -e "  • Backend API: ${GREEN}http://localhost:5000${NC}"
        echo -e "  • Database: ${GREEN}postgresql://localhost:5432${NC}"
        echo -e "  • Redis: ${GREEN}redis://localhost:6379${NC}"
    else
        echo -e "  • Application: ${GREEN}http://localhost${NC}"
        echo -e "  • API Health: ${GREEN}http://localhost/api/admin/health${NC}"
        echo -e "  • Database: ${GREEN}Internal Docker network${NC}"
        echo -e "  • Redis: ${GREEN}Internal Docker network${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}🔧 Useful Commands:${NC}"
    echo -e "  • View logs: ${YELLOW}docker-compose -f docker-compose.$ENV.yml logs -f${NC}"
    echo -e "  • Stop services: ${YELLOW}docker-compose -f docker-compose.$ENV.yml down${NC}"
    echo -e "  • Restart services: ${YELLOW}docker-compose -f docker-compose.$ENV.yml restart${NC}"
    echo -e "  • View containers: ${YELLOW}docker-compose -f docker-compose.$ENV.yml ps${NC}"
    
    if [ "$ENV" = "prod" ]; then
        echo ""
        echo -e "${YELLOW}🔒 Production Security Notes:${NC}"
        echo -e "  • Change default passwords in .env"
        echo -e "  • Configure SSL certificates for HTTPS"
        echo -e "  • Set up monitoring and logging"
        echo -e "  • Configure backups"
    fi
}

# Main execution flow
main() {
    echo -e "${BLUE}Starting deployment process...${NC}"
    
    # Check prerequisites
    check_env_file
    validate_env_vars
    create_directories
    init_database
    
    # Deploy application
    deploy
    
    # Setup database (wait a bit more for stability)
    sleep 20
    run_migrations
    
    # Show final information
    show_deployment_info
}

# Trap to handle errors
trap 'echo -e "${RED}❌ Deployment failed! Check the logs above.${NC}"; exit 1' ERR

# Check if running from correct directory
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Please run this script from the project root directory${NC}"
    exit 1
fi

# Run main function
main