#!/bin/bash

# SSL Setup Script for autonomiapro.com.br
# This script sets up Let's Encrypt SSL certificates using Certbot

set -e

DOMAIN="autonomiapro.com.br"
EMAIL="admin@autonomiapro.com.br"  # Change this to your email

echo "= Setting up SSL certificates for $DOMAIN"

# Check if domain is provided
if [ -z "$DOMAIN" ]; then
    echo "L Error: Domain not specified"
    exit 1
fi

# Check if email is provided
if [ -z "$EMAIL" ]; then
    echo "L Error: Email not specified"
    exit 1
fi

echo "=ç Using email: $EMAIL"

# Create directories for certificates
echo "=Á Creating certificate directories..."
mkdir -p ./certbot/www
mkdir -p ./certbot/conf

# Start nginx temporarily to handle HTTP challenges
echo "=€ Starting temporary nginx for certificate validation..."
docker-compose -f docker-compose.prod.yml up -d nginx

# Wait for nginx to be ready
echo "ó Waiting for nginx to start..."
sleep 10

# Obtain SSL certificate
echo "= Obtaining SSL certificate for $DOMAIN..."
docker run --rm -it \
    -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    -v "$(pwd)/certbot/www:/var/www/certbot" \
    certbot/certbot:latest \
    certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN

# Stop temporary nginx
echo "=Ñ Stopping temporary nginx..."
docker-compose -f docker-compose.prod.yml down

echo " SSL certificate obtained successfully!"
echo "= You can now start the production environment with SSL:"
echo "   docker-compose -f docker-compose.prod.yml up -d"

# Create renewal script
cat > renew-ssl.sh << EOF
#!/bin/bash
echo "= Renewing SSL certificates..."
docker run --rm -it \\
    -v "\$(pwd)/certbot/conf:/etc/letsencrypt" \\
    -v "\$(pwd)/certbot/www:/var/www/certbot" \\
    certbot/certbot:latest \\
    renew --quiet

# Reload nginx to use new certificates
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo " SSL certificates renewed successfully!"
EOF

chmod +x renew-ssl.sh

echo "=İ Created renew-ssl.sh script for certificate renewal"
echo "=¡ Set up a cron job to run ./renew-ssl.sh monthly"