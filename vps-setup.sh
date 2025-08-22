#!/bin/bash

# Complete VPS Setup Script for Hostinger VPS
# This script sets up everything needed to host your Lovable React app

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() { echo -e "${YELLOW}➤ $1${NC}"; }
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }

echo -e "${GREEN}🚀 Setting up VPS for Lovable React App${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Update system
print_status "Updating system packages..."
apt update && apt upgrade -y
print_success "System updated"

# Install essential packages
print_status "Installing essential packages..."
apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
print_success "Essential packages installed"

# Install Node.js (LTS version)
print_status "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt install -y nodejs
print_success "Node.js $(node --version) installed"

# Install Nginx
print_status "Installing Nginx..."
apt install -y nginx
systemctl enable nginx
systemctl start nginx
print_success "Nginx installed and started"

# Install Certbot for SSL
print_status "Installing Certbot for SSL..."
apt install -y certbot python3-certbot-nginx
print_success "Certbot installed"

# Install PM2 (optional, for Node.js process management)
print_status "Installing PM2..."
npm install -g pm2
print_success "PM2 installed"

# Create web directory
print_status "Setting up web directories..."
mkdir -p /var/www
mkdir -p /var/backups
mkdir -p /var/log/deployments
chown -R www-data:www-data /var/www
print_success "Web directories created"

# Configure UFW Firewall
print_status "Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable
print_success "Firewall configured"

# Setup swap (if not exists and RAM < 2GB)
if [ ! -f /swapfile ] && [ $(free -m | awk 'NR==2{print $2}') -lt 2048 ]; then
    print_status "Setting up swap file..."
    fallocate -l 1G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
    print_success "Swap file created"
fi

# Configure automatic security updates
print_status "Configuring automatic security updates..."
apt install -y unattended-upgrades
echo 'Unattended-Upgrade::Automatic-Reboot "false";' >> /etc/apt/apt.conf.d/50unattended-upgrades
systemctl enable unattended-upgrades
print_success "Automatic security updates configured"

# Install fail2ban for security
print_status "Installing fail2ban..."
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
print_success "Fail2ban installed"

# Create deployment user (optional)
print_status "Creating deployment user..."
if ! id "deployer" &>/dev/null; then
    useradd -m -s /bin/bash deployer
    usermod -aG www-data deployer
    usermod -aG sudo deployer
    print_success "Deployment user 'deployer' created"
else
    print_success "Deployment user 'deployer' already exists"
fi

# Configure Git (for deployment user)
print_status "Configuring Git..."
sudo -u deployer git config --global user.name "Deployment User"
sudo -u deployer git config --global user.email "deployer@$(hostname)"
print_success "Git configured"

# Setup SSH key for GitHub (optional)
print_status "Setting up SSH key for GitHub..."
sudo -u deployer mkdir -p /home/deployer/.ssh
if [ ! -f /home/deployer/.ssh/id_rsa ]; then
    sudo -u deployer ssh-keygen -t rsa -b 4096 -f /home/deployer/.ssh/id_rsa -N ""
    chown -R deployer:deployer /home/deployer/.ssh
    chmod 700 /home/deployer/.ssh
    chmod 600 /home/deployer/.ssh/id_rsa
    chmod 644 /home/deployer/.ssh/id_rsa.pub
    
    echo -e "\n${YELLOW}📋 Add this SSH key to your GitHub account:${NC}"
    echo -e "${GREEN}"
    cat /home/deployer/.ssh/id_rsa.pub
    echo -e "${NC}"
    print_success "SSH key generated"
else
    print_success "SSH key already exists"
fi

# Setup logrotate for deployment logs
print_status "Configuring log rotation..."
cat > /etc/logrotate.d/deployments << EOF
/var/log/deployments/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 deployer deployer
}
EOF
print_success "Log rotation configured"

# Create basic monitoring script
print_status "Creating monitoring script..."
cat > /usr/local/bin/server-health.sh << 'EOF'
#!/bin/bash
# Basic server health monitoring

LOG_FILE="/var/log/server-health.log"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    log "WARNING: Disk usage is ${DISK_USAGE}%"
fi

# Check memory
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ "$MEMORY_USAGE" -gt 80 ]; then
    log "WARNING: Memory usage is ${MEMORY_USAGE}%"
fi

# Check Nginx status
if ! systemctl is-active --quiet nginx; then
    log "ERROR: Nginx is not running"
    systemctl restart nginx
fi

log "Health check completed - Disk: ${DISK_USAGE}%, Memory: ${MEMORY_USAGE}%"
EOF

chmod +x /usr/local/bin/server-health.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "*/15 * * * * /usr/local/bin/server-health.sh") | crontab -
print_success "Health monitoring configured"

# Display summary
echo -e "\n${GREEN}🎉 VPS Setup Complete!${NC}\n"
echo -e "${YELLOW}📋 Setup Summary:${NC}"
echo "  • Node.js: $(node --version)"
echo "  • npm: $(npm --version)"
echo "  • Nginx: Installed and running"
echo "  • SSL: Certbot ready"
echo "  • Firewall: UFW configured"
echo "  • Security: fail2ban enabled"
echo "  • User: deployer created"
echo "  • Monitoring: Basic health checks enabled"

echo -e "\n${YELLOW}📝 Next Steps:${NC}"
echo "  1. Add the SSH key above to your GitHub account"
echo "  2. Clone your repository to /var/www/your-app"
echo "  3. Configure nginx.conf with your domain"
echo "  4. Run deploy.sh to deploy your app"
echo "  5. Setup SSL with: certbot --nginx -d your-domain.com"

echo -e "\n${YELLOW}🔧 Useful Commands:${NC}"
echo "  • Check Nginx status: systemctl status nginx"
echo "  • View deployment logs: tail -f /var/log/deployments/*.log"
echo "  • Check health: /usr/local/bin/server-health.sh"
echo "  • Deploy app: ./deploy.sh"

print_success "VPS is ready for deployment!"