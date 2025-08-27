#!/bin/bash
echo "🚀 Starting Mindful Ad Wizard deployment..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Create necessary directories
mkdir -p backup logs

# Copy environment file if it doesn't exist
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "⚠️  Created .env file. Please edit it with your API keys before deployment."
fi

echo "🐳 Starting Docker deployment..."

# Stop any existing containers
docker-compose down 2>/dev/null || true

# Build and start services
docker-compose up -d --build

echo "✅ Deployment started!"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:5000"
echo "Admin: admin@mindfuladwizard.com / admin123!"