#!/bin/bash

# Start Production Environment Safely
set -e

echo "Starting production environment for autonomiapro.com.br..."

# Clean up any existing containers
docker compose -f docker-compose.prod.yml down

# Create certificate directories
mkdir -p ./certbot/conf/live/autonomiapro.com.br
mkdir -p ./certbot/www

# Create dummy certificates so nginx can start
echo "Creating temporary SSL certificates..."
if [ ! -f "./certbot/conf/live/autonomiapro.com.br/fullchain.pem" ]; then
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
        -keyout ./certbot/conf/live/autonomiapro.com.br/privkey.pem \
        -out ./certbot/conf/live/autonomiapro.com.br/fullchain.pem \
        -subj "/C=BR/ST=State/L=City/O=Organization/CN=autonomiapro.com.br"
fi

# Create dhparam if missing
if [ ! -f "./certbot/conf/ssl-dhparams.pem" ]; then
    echo "Generating dhparam..."
    openssl dhparam -out ./certbot/conf/ssl-dhparams.pem 2048
fi

# Start services
echo "Starting all services..."
docker compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 30

# Check nginx status
echo "Checking nginx status..."
if docker compose -f docker-compose.prod.yml ps nginx | grep -q "Up"; then
    echo "✅ Nginx is running"
    
    # Test local connectivity
    if curl -s -o /dev/null -w "%{http_code}" http://localhost/health | grep -q "200"; then
        echo "✅ Local health check passed"
        echo "🌐 Your app is running at: http://autonomiapro.com.br"
        echo ""
        echo "To add SSL certificates, run:"
        echo "  docker compose -f docker-compose.prod.yml run --rm certbot certbot certonly --webroot --webroot-path=/var/www/certbot --email admin@autonomiapro.com.br --agree-tos --no-eff-email -d autonomiapro.com.br -d www.autonomiapro.com.br"
        echo "  docker compose -f docker-compose.prod.yml exec nginx nginx -s reload"
    else
        echo "❌ Health check failed"
        docker compose -f docker-compose.prod.yml logs nginx
    fi
else
    echo "❌ Nginx failed to start"
    docker compose -f docker-compose.prod.yml logs nginx
fi

echo ""
echo "Container status:"
docker compose -f docker-compose.prod.yml ps