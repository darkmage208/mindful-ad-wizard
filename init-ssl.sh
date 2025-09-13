#!/bin/bash

# Initialize SSL for Production Environment
# This creates dummy certificates first, then gets real ones

set -e

DOMAIN="autonomiapro.com.br"
EMAIL="admin@autonomiapro.com.br"

echo "Initializing SSL for production domain: $DOMAIN"

# Create certificate directories
mkdir -p ./certbot/conf/live/$DOMAIN
mkdir -p ./certbot/www

# Create dummy certificates for initial startup
echo "Creating dummy SSL certificates..."
openssl req -x509 -nodes -newkey rsa:4096 -days 1 \
    -keyout ./certbot/conf/live/$DOMAIN/privkey.pem \
    -out ./certbot/conf/live/$DOMAIN/fullchain.pem \
    -subj "/C=BR/ST=State/L=City/O=Organization/CN=$DOMAIN"

# Create dhparam
echo "Generating dhparam..."
openssl dhparam -out ./certbot/conf/ssl-dhparams.pem 2048

# Start all services with dummy certificates
echo "Starting production environment with dummy certificates..."
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

# Wait for nginx to be ready
echo "Waiting for services to start..."
sleep 30

# Check if nginx is running
if ! docker compose -f docker-compose.prod.yml ps nginx | grep -q "Up"; then
    echo "L Nginx failed to start. Check logs:"
    docker compose -f docker-compose.prod.yml logs nginx
    exit 1
fi

echo " Services started with dummy certificates"

# Now get real certificates
echo "Getting real SSL certificates from Let's Encrypt..."
docker compose -f docker-compose.prod.yml run --rm certbot \
    certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN

if [ $? -eq 0 ]; then
    echo " Real certificates obtained successfully!"
    
    # Reload nginx with real certificates
    echo "Reloading nginx with real certificates..."
    docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
    
    echo ""
    echo "<‰ Production environment is now running with SSL!"
    echo "< Your site is available at: https://$DOMAIN"
    echo ""
else
    echo "L Failed to get real certificates. Running with dummy certificates."
    echo "< Your site is available at: http://$DOMAIN (HTTP only)"
    echo ""
    echo "Check firewall and DNS settings, then try again:"
    echo "  docker compose -f docker-compose.prod.yml run --rm certbot certbot certonly --webroot --webroot-path=/var/www/certbot --email $EMAIL --agree-tos --no-eff-email -d $DOMAIN -d www.$DOMAIN"
    echo "  docker compose -f docker-compose.prod.yml exec nginx nginx -s reload"
fi

echo ""
echo "Container status:"
docker compose -f docker-compose.prod.yml ps