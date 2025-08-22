#!/bin/bash

# VPS Deployment Script for Lovable React App
# Make this file executable: chmod +x deploy.sh

set -e  # Exit on any error

# Configuration
PROJECT_NAME="ticketooz"
REPO_URL="git@github.com:Ajaykumar34/Ticketooz.git"
DEPLOY_PATH="/var/www/$PROJECT_NAME"
BACKUP_PATH="/var/backups/$PROJECT_NAME"
NGINX_SITE="/etc/nginx/sites-available/$PROJECT_NAME"
WEB_USER="www-data"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting deployment for $PROJECT_NAME${NC}"

# Function to print status
print_status() {
    echo -e "${YELLOW}➤ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Create backup if deployment exists
if [ -d "$DEPLOY_PATH" ]; then
    print_status "Creating backup..."
    mkdir -p "$BACKUP_PATH"
    cp -r "$DEPLOY_PATH" "$BACKUP_PATH/backup-$(date +%Y%m%d_%H%M%S)"
    print_success "Backup created"
fi

# Create deployment directory
print_status "Preparing deployment directory..."
mkdir -p "$DEPLOY_PATH"
cd "$DEPLOY_PATH"

# Clone or pull latest code
if [ -d ".git" ]; then
    print_status "Pulling latest changes..."
    git pull origin main
else
    print_status "Cloning repository..."
    git clone "$REPO_URL" .
fi

print_success "Code updated"

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    print_status "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    apt-get install -y nodejs
    print_success "Node.js installed"
fi

# Install dependencies
print_status "Installing dependencies..."
npm ci --production=false

# Build the application
print_status "Building application..."
npm run build

# Set proper permissions
print_status "Setting permissions..."
chown -R $WEB_USER:$WEB_USER "$DEPLOY_PATH"
chmod -R 755 "$DEPLOY_PATH"

# Setup Nginx configuration (if nginx.conf exists)
if [ -f "nginx.conf" ] && command -v nginx &> /dev/null; then
    print_status "Configuring Nginx..."
    
    # Copy nginx config
    cp nginx.conf "$NGINX_SITE"
    
    # Replace placeholders in nginx config
    sed -i "s|/var/www/your-app|$DEPLOY_PATH|g" "$NGINX_SITE"
    
    # Enable site
    ln -sf "$NGINX_SITE" "/etc/nginx/sites-enabled/$PROJECT_NAME"
    
    # Test nginx configuration
    if nginx -t; then
        systemctl reload nginx
        print_success "Nginx configured and reloaded"
    else
        print_error "Nginx configuration test failed"
        exit 1
    fi
fi

# Setup SSL with Let's Encrypt (if certbot is available)
if command -v certbot &> /dev/null; then
    print_status "Would you like to setup SSL with Let's Encrypt? (y/n)"
    read -r setup_ssl
    if [ "$setup_ssl" = "y" ]; then
        print_status "Setting up SSL..."
        certbot --nginx -d ticketooz.com -d www.ticketooz.com --non-interactive --agree-tos --email ajaykumarahirwar51@gmail.com
        print_success "SSL configured"
    fi
fi

# Clean up
print_status "Cleaning up..."
npm cache clean --force

print_success "🎉 Deployment completed successfully!"
echo -e "${GREEN}Your app is now live at: https://ticketooz.com${NC}"

# Show final status
print_status "Deployment Summary:"
echo "  • Project: $PROJECT_NAME"
echo "  • Path: $DEPLOY_PATH"
echo "  • Build: dist/"
echo "  • Web Server: $(command -v nginx &> /dev/null && echo "Nginx" || echo "Apache/Other")"
echo "  • SSL: $([ -f "/etc/letsencrypt/live/ticketooz.com/fullchain.pem" ] && echo "Enabled" || echo "Manual setup required")"

print_status "Next steps:"
echo "  1. Update domain name in nginx.conf/apache.conf"
echo "  2. Update repository URL in this script"
echo "  3. Configure SSL certificates"
echo "  4. Set up automated deployments (optional)"