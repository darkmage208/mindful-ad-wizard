#!/bin/bash

# Simple SSL Setup Script for autonomiapro.com.br

set -e

DOMAIN="autonomiapro.com.br"
EMAIL="admin@autonomiapro.com.br"  # Change this to your email

echo "Setting up SSL certificates for $DOMAIN"
echo "Using email: $EMAIL"

# Get public IP for reference
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "unknown")
echo "VPS Public IP: $PUBLIC_IP"

# Stop any running containers
echo "Stopping any running containers..."
docker compose -f docker-compose.prod.yml down 2>/dev/null || true
docker compose -f docker-compose.ssl-setup.yml down 2>/dev/null || true

# Create directories
echo "Creating certificate directories..."
mkdir -p ./certbot/www
mkdir -p ./certbot/conf

# Setup temporary nginx config for SSL
echo "Setting up nginx configuration for SSL..."
if [ -f "./nginx/default.prod.conf" ]; then
    cp ./nginx/default.prod.conf ./nginx/default.prod.conf.backup
fi
cp ./nginx/default.ssl-init.conf ./nginx/default.prod.conf

# Start minimal nginx for SSL setup
echo "Starting nginx for certificate validation..."
docker compose -f docker-compose.ssl-setup.yml up -d --build

# Wait for nginx to be ready
echo "Waiting for nginx to start..."
sleep 10

# Check if nginx is responding
echo "Testing nginx connectivity..."
if curl -s -f http://localhost/health > /dev/null 2>&1; then
    echo "✓ Nginx is responding locally"
else
    echo "⚠ Nginx local test failed, but continuing..."
fi

# Test external connectivity
echo "Testing external connectivity..."
echo "Please test from your LOCAL computer:"
echo "  curl -I http://$DOMAIN/health"
echo "  curl -I http://$PUBLIC_IP/health"
echo ""

read -p "Can you access http://$DOMAIN/health from your local computer? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "❌ External connectivity failed. Common issues:"
    echo "1. Firewall blocking port 80:"
    echo "   sudo ufw allow 80"
    echo "   sudo ufw allow 443"
    echo ""
    echo "2. Hostinger VPS firewall in control panel"
    echo "3. Domain DNS not pointing to VPS IP: $PUBLIC_IP"
    echo ""
    echo "Fix these issues first, then run this script again."
    docker compose -f docker-compose.ssl-setup.yml down
    exit 1
fi

echo "✓ External connectivity confirmed, proceeding with SSL..."

# Obtain SSL certificate
echo "Obtaining SSL certificate from Let's Encrypt..."
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

echo "✓ SSL certificate obtained successfully!"

# Stop setup containers
echo "Cleaning up setup containers..."
docker compose -f docker-compose.ssl-setup.yml down

# Restore original nginx config
if [ -f "./nginx/default.prod.conf.backup" ]; then
    echo "Restoring production nginx configuration..."
    mv ./nginx/default.prod.conf.backup ./nginx/default.prod.conf
fi

echo ""
echo "🎉 SSL Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Start your production environment:"
echo "   docker compose -f docker-compose.prod.yml up -d"
echo ""
echo "2. Your site will be available at:"
echo "   https://$DOMAIN"
echo ""
echo "3. Certificate auto-renewal is configured in the production setup"

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
echo "Created renew-ssl.sh for certificate renewal"