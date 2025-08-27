#!/bin/bash

# Mindful Ad Wizard - Setup Script
# This script prepares the project for Docker deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🛠️  Mindful Ad Wizard Setup Script${NC}"

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Please run this script from the project root directory${NC}"
    exit 1
fi

# Function to install dependencies and generate lock files
install_dependencies() {
    echo -e "${BLUE}📦 Installing dependencies and generating lock files...${NC}"
    
    # Backend setup
    if [ -d "backend" ]; then
        echo -e "${YELLOW}Setting up backend dependencies...${NC}"
        cd backend
        
        # Check if package-lock.json exists
        if [ ! -f "package-lock.json" ]; then
            echo -e "${YELLOW}Generating package-lock.json for backend...${NC}"
            npm install --package-lock-only
            
            # If that fails, try regular install
            if [ $? -ne 0 ]; then
                echo -e "${YELLOW}Fallback: Installing backend dependencies...${NC}"
                npm install
            fi
        else
            echo -e "${GREEN}✅ Backend package-lock.json already exists${NC}"
        fi
        
        cd ..
    fi
    
    # Frontend setup
    if [ -d "frontend" ]; then
        echo -e "${YELLOW}Setting up frontend dependencies...${NC}"
        cd frontend
        
        # Check if package-lock.json exists
        if [ ! -f "package-lock.json" ]; then
            echo -e "${YELLOW}Generating package-lock.json for frontend...${NC}"
            npm install --package-lock-only
            
            # If that fails, try regular install
            if [ $? -ne 0 ]; then
                echo -e "${YELLOW}Fallback: Installing frontend dependencies...${NC}"
                npm install
            fi
        else
            echo -e "${GREEN}✅ Frontend package-lock.json already exists${NC}"
        fi
        
        cd ..
    fi
}

# Function to create necessary directories
create_directories() {
    echo -e "${BLUE}📁 Creating necessary directories...${NC}"
    
    # Create directories for Docker volumes
    mkdir -p backup
    mkdir -p logs
    mkdir -p scripts
    
    # Backend specific directories
    if [ -d "backend" ]; then
        mkdir -p backend/logs
        mkdir -p backend/uploads
        mkdir -p backend/tmp
        
        # Create placeholder files to ensure directories are included in Docker
        touch backend/uploads/.gitkeep
        touch backend/tmp/.gitkeep
    fi
    
    echo -e "${GREEN}✅ Directories created${NC}"
}

# Function to setup environment files
setup_environment() {
    echo -e "${BLUE}🔧 Setting up environment files...${NC}"
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            echo -e "${GREEN}✅ Created .env from .env.example${NC}"
            echo -e "${YELLOW}⚠️  Please edit .env file with your actual values${NC}"
        else
            echo -e "${YELLOW}⚠️  No .env.example found, skipping environment setup${NC}"
        fi
    else
        echo -e "${GREEN}✅ .env file already exists${NC}"
    fi
}

# Function to validate Docker installation
check_docker() {
    echo -e "${BLUE}🐳 Checking Docker installation...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
        echo -e "${YELLOW}Visit: https://docs.docker.com/get-docker/${NC}"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
        echo -e "${YELLOW}Visit: https://docs.docker.com/compose/install/${NC}"
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Docker daemon is not running. Please start Docker first.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Docker and Docker Compose are installed and running${NC}"
}

# Function to make scripts executable
setup_scripts() {
    echo -e "${BLUE}🔧 Making scripts executable...${NC}"
    
    if [ -d "scripts" ]; then
        chmod +x scripts/*.sh
        echo -e "${GREEN}✅ Scripts are now executable${NC}"
    fi
}

# Function to validate package.json files
validate_packages() {
    echo -e "${BLUE}✅ Validating package configurations...${NC}"
    
    # Check backend package.json
    if [ -f "backend/package.json" ]; then
        cd backend
        if npm ls &> /dev/null; then
            echo -e "${GREEN}✅ Backend dependencies are valid${NC}"
        else
            echo -e "${YELLOW}⚠️  Backend dependency issues detected${NC}"
        fi
        cd ..
    fi
    
    # Check frontend package.json
    if [ -f "frontend/package.json" ]; then
        cd frontend
        if npm ls &> /dev/null; then
            echo -e "${GREEN}✅ Frontend dependencies are valid${NC}"
        else
            echo -e "${YELLOW}⚠️  Frontend dependency issues detected${NC}"
        fi
        cd ..
    fi
}

# Function to show next steps
show_next_steps() {
    echo ""
    echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo -e "  1. Edit ${YELLOW}.env${NC} file with your actual API keys and secrets"
    echo -e "  2. Deploy development environment: ${YELLOW}./scripts/deploy.sh dev build${NC}"
    echo -e "  3. Or deploy production environment: ${YELLOW}./scripts/deploy.sh prod build${NC}"
    echo ""
    echo -e "${BLUE}🔑 Required Environment Variables:${NC}"
    echo -e "  • ${YELLOW}OPENAI_API_KEY${NC}: OpenAI API key for AI features"
    echo -e "  • ${YELLOW}POSTGRES_PASSWORD${NC}: Database password"
    echo -e "  • ${YELLOW}JWT_SECRET${NC}: JWT signing secret (64+ characters)"
    echo -e "  • ${YELLOW}JWT_REFRESH_SECRET${NC}: JWT refresh secret (64+ characters)"
    echo ""
    echo -e "${BLUE}📖 Documentation:${NC}"
    echo -e "  • API Documentation: ${YELLOW}backend/API_DOCUMENTATION.md${NC}"
    echo -e "  • Deployment Guide: ${YELLOW}DEPLOYMENT_GUIDE.md${NC}"
    echo -e "  • Docker Guide: ${YELLOW}DOCKER_DEPLOYMENT.md${NC}"
    echo ""
}

# Main execution
main() {
    echo -e "${BLUE}Starting setup process...${NC}"
    
    check_docker
    create_directories
    setup_environment
    install_dependencies
    setup_scripts
    validate_packages
    show_next_steps
}

# Error handling
trap 'echo -e "${RED}❌ Setup failed! Check the error above.${NC}"; exit 1' ERR

# Run main function
main

echo -e "${GREEN}✅ Setup process completed successfully!${NC}"