#!/bin/bash

################################################################################
# SSL Certificate Setup with Let's Encrypt
# Run this after Nginx is installed and domain is pointing to your EC2 instance
################################################################################

set -e

echo "=================================="
echo "🔒 Setting up SSL with Let's Encrypt"
echo "=================================="

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root (use sudo)" 
   exit 1
fi

# Get domain name
read -p "Enter your domain name (e.g., example.com): " DOMAIN
read -p "Enter your email for Let's Encrypt notifications: " EMAIL

# Validate inputs
if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "Domain and email are required!"
    exit 1
fi

# Create webroot directory
mkdir -p /var/www/certbot

# Copy nginx configuration
echo "Copying Nginx configuration..."
cp ~/app/nginx/app.conf /etc/nginx/sites-available/app

# Replace YOUR_DOMAIN with actual domain
sed -i "s/YOUR_DOMAIN/$DOMAIN/g" /etc/nginx/sites-available/app

# Enable site
ln -sf /etc/nginx/sites-available/app /etc/nginx/sites-enabled/

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
echo "Testing Nginx configuration..."
nginx -t

# Reload nginx
echo "Reloading Nginx..."
systemctl reload nginx

# Obtain SSL certificate
echo "Obtaining SSL certificate from Let's Encrypt..."
certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

# Update nginx config with SSL
echo "Updating Nginx configuration with SSL..."
systemctl reload nginx

# Setup auto-renewal
echo "Setting up automatic certificate renewal..."
cat > /etc/cron.d/certbot-renew <<EOF
0 3 * * * root certbot renew --quiet --post-hook "systemctl reload nginx"
EOF

echo ""
echo "=================================="
echo "✅ SSL Setup Complete!"
echo "=================================="
echo ""
echo "Your application should now be accessible at:"
echo "  https://$DOMAIN          - Main App"
echo "  https://$DOMAIN/jenkins  - Jenkins"
echo "  https://$DOMAIN/grafana  - Grafana"
echo ""
echo "Certificates will auto-renew every 60 days."
echo "=================================="
