#!/bin/bash

# SSL Setup Script with Debugging for autonomiapro.com.br

set -e

DOMAIN="autonomiapro.com.br"
EMAIL="admin@autonomiapro.com.br"  # Change this to your email

echo "=== SSL SETUP DEBUG MODE ==="
echo "Setting up SSL certificates for $DOMAIN"

# Get public IP
PUBLIC_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || echo "unknown")
echo "VPS Public IP: $PUBLIC_IP"

# Check firewall
echo ""
echo "=== FIREWALL CHECK ==="
if command -v ufw >/dev/null 2>&1; then
    echo "UFW Status:"
    sudo ufw status || echo "UFW not configured"
else
    echo "UFW not installed"
fi

# Check if ports are listening
echo ""
echo "=== PORT CHECK ==="
echo "Checking if ports 80 and 443 are available:"
if command -v netstat >/dev/null 2>&1; then
    netstat -tlnp | grep ":80 \|:443 " || echo "No services on ports 80/443"
else
    echo "netstat not available"
fi

# Stop any running containers
echo ""
echo "=== CONTAINER CLEANUP ==="
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

# Create directories
mkdir -p ./certbot/www
mkdir -p ./certbot/conf

# Setup temporary nginx config
if [ -f "./nginx/default.prod.conf" ]; then
    cp ./nginx/default.prod.conf ./nginx/default.prod.conf.backup
fi
cp ./nginx/default.ssl-init.conf ./nginx/default.prod.conf

# Start nginx
echo ""
echo "=== STARTING NGINX ==="
docker compose -f docker-compose.prod.yml up -d --build nginx

# Wait and check
sleep 10

echo ""
echo "=== CONTAINER STATUS ==="
docker compose -f docker-compose.prod.yml ps

echo ""
echo "=== NGINX LOGS ==="
docker compose -f docker-compose.prod.yml logs --tail=20 nginx

echo ""
echo "=== LOCAL CONNECTIVITY TEST ==="
# Test locally
if curl -s -o /dev/null -w "%{http_code}" http://localhost/health | grep -q "200"; then
    echo " Local health check: PASS"
else
    echo " Local health check: FAIL"
fi

# Test with public IP
if curl -s -o /dev/null -w "%{http_code}" http://$PUBLIC_IP/health 2>/dev/null | grep -q "200"; then
    echo " Public IP health check: PASS"
else
    echo " Public IP health check: FAIL"
fi

# Test with domain
if curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN/health 2>/dev/null | grep -q "200"; then
    echo " Domain health check: PASS"
else
    echo " Domain health check: FAIL"
fi

echo ""
echo "=== MANUAL TESTS YOU SHOULD RUN ==="
echo "From your LOCAL computer (not VPS), test these URLs:"
echo "  curl -I http://$PUBLIC_IP/health"
echo "  curl -I http://$DOMAIN/health"
echo "  telnet $PUBLIC_IP 80"
echo ""
echo "If these fail, you have firewall issues that need to be resolved first."
echo ""

read -p "Do you want to continue with SSL certificate generation? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Exiting. Fix connectivity issues first."
    docker compose -f docker-compose.prod.yml down
    exit 1
fi

echo ""
echo "=== OBTAINING SSL CERTIFICATE ==="
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
    --verbose \
    -d $DOMAIN \
    -d www.$DOMAIN

# Cleanup
docker compose -f docker-compose.prod.yml down

# Restore config
if [ -f "./nginx/default.prod.conf.backup" ]; then
    mv ./nginx/default.prod.conf.backup ./nginx/default.prod.conf
fi

echo ""
echo "=== SUCCESS ==="
echo "SSL certificate obtained successfully!"
echo "Start production with: docker compose -f docker-compose.prod.yml up -d"