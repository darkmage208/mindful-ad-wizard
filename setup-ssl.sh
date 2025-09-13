#!/bin/bash

# SSL Setup Script for autonomiapro.com.br
# This script sets up Let's Encrypt SSL certificates using Certbot

set -e

DOMAIN="autonomiapro.com.br"
EMAIL="admin@autonomiapro.com.br"  # Change this to your email

echo "Setting up SSL certificates for $DOMAIN"

# Check if domain is provided
if [ -z "$DOMAIN" ]; then
    echo "Error: Domain not specified"
    exit 1
fi

# Check if email is provided
if [ -z "$EMAIL" ]; then
    echo "Error: Email not specified"
    exit 1
fi

echo "Using email: $EMAIL"

# Stop any running containers first
echo "Stopping any running containers..."
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

# Create directories for certificates
echo "Creating certificate directories..."
mkdir -p ./certbot/www
mkdir -p ./certbot/conf

# Create a temporary nginx config for SSL initialization
echo "Creating temporary nginx configuration for SSL setup..."
if [ -f "./nginx/default.prod.conf" ]; then
    cp ./nginx/default.prod.conf ./nginx/default.prod.conf.backup
fi
cp ./nginx/default.ssl-init.conf ./nginx/default.prod.conf

# Start nginx temporarily to handle HTTP challenges
echo "Starting temporary nginx for certificate validation..."
docker compose -f docker-compose.prod.yml up -d --build nginx

# Wait for nginx to be ready
echo "Waiting for nginx to start..."
sleep 15

# Test nginx is responding
echo "Testing nginx response..."
if docker compose -f docker-compose.prod.yml exec nginx curl -f http://localhost/health > /dev/null 2>&1; then
    echo "Nginx is responding correctly"
else
    echo "Warning: Nginx health check failed, but continuing..."
fi

# Obtain SSL certificate
echo "Obtaining SSL certificate for $DOMAIN..."
docker run --rm \
    -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    -v "$(pwd)/certbot/www:/var/www/certbot" \
    --network "$(basename $(pwd))_mindful_network" \
    certbot/certbot:latest \
    certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    -d $DOMAIN \
    -d www.$DOMAIN

# Stop temporary nginx
echo "Stopping temporary nginx..."
docker compose -f docker-compose.prod.yml down

# Restore original nginx config
if [ -f "./nginx/default.prod.conf.backup" ]; then
    echo "Restoring original nginx configuration..."
    mv ./nginx/default.prod.conf.backup ./nginx/default.prod.conf
fi

echo "SSL certificate obtained successfully!"
echo "You can now start the production environment with SSL:"
echo "   docker compose -f docker-compose.prod.yml up -d"

# Create renewal script
cat > renew-ssl.sh << 'EOF'
#!/bin/bash
echo "Renewing SSL certificates..."
docker run --rm \
    -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    -v "$(pwd)/certbot/www:/var/www/certbot" \
    certbot/certbot:latest \
    renew --quiet

# Reload nginx to use new certificates
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo "SSL certificates renewed successfully!"
EOF

chmod +x renew-ssl.sh

echo "Created renew-ssl.sh script for certificate renewal"
echo "Set up a cron job to run ./renew-ssl.sh monthly"