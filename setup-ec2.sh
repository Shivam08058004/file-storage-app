#!/bin/bash

################################################################################
# EC2 Instance Setup Script for Docker Compose Deployment
# Instance Type: m7i-flex.large (2 vCPU, 8GB RAM)
# OS: Ubuntu 22.04 LTS
################################################################################

set -e  # Exit on error

echo "=================================="
echo "🚀 Starting EC2 Setup for Docker Compose"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Update system
print_status "Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# Install essential packages
print_status "Installing essential packages..."
sudo apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    software-properties-common \
    git \
    wget \
    vim \
    htop \
    net-tools \
    ufw \
    certbot \
    python3-certbot-nginx

# Install Docker
print_status "Installing Docker..."
curl -fsSL https://get.docker.com | sh

# Add current user to docker group
print_status "Adding user to docker group..."
sudo usermod -aG docker ${USER}

# Install Docker Compose
print_status "Installing Docker Compose plugin..."
sudo apt-get install -y docker-compose-plugin

# Verify Docker installation
print_status "Verifying Docker installation..."
docker --version
docker compose version

# Configure Docker daemon for production
print_status "Configuring Docker daemon..."
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "default-address-pools": [
    {
      "base": "172.20.0.0/16",
      "size": 24
    }
  ]
}
EOF

# Restart Docker
print_status "Restarting Docker service..."
sudo systemctl restart docker
sudo systemctl enable docker

# Install Nginx
print_status "Installing Nginx..."
sudo apt-get install -y nginx

# Configure firewall
print_status "Configuring UFW firewall..."
sudo ufw --force enable
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw allow 8080/tcp comment 'Jenkins'
sudo ufw allow 3001/tcp comment 'Grafana'
sudo ufw status

# Optimize system for Docker
print_status "Optimizing system settings..."

# Increase file descriptors
sudo tee -a /etc/security/limits.conf > /dev/null <<EOF
* soft nofile 65536
* hard nofile 65536
EOF

# Optimize kernel parameters
sudo tee -a /etc/sysctl.conf > /dev/null <<EOF
# Docker optimization
vm.max_map_count=262144
fs.file-max=65536
net.core.somaxconn=1024
net.ipv4.tcp_max_syn_backlog=2048
EOF

sudo sysctl -p

# Create directories for application
print_status "Creating application directories..."
mkdir -p ~/app
mkdir -p ~/app/prometheus
mkdir -p ~/app/grafana/provisioning/datasources
mkdir -p ~/app/grafana/provisioning/dashboards
mkdir -p ~/app/grafana/dashboards
mkdir -p ~/app/nginx

# Create .env file template
print_status "Creating .env template..."
cat > ~/app/.env.example <<EOF
# Database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# AWS S3
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_REGION=us-east-1

# NextAuth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=generate-a-random-secret-here

# Email (Resend)
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=noreply@your-domain.com

# Grafana
GRAFANA_ADMIN_PASSWORD=change-this-password
EOF

# Install monitoring tools
print_status "Installing monitoring tools..."
sudo apt-get install -y sysstat iotop

# Configure automatic security updates
print_status "Configuring automatic security updates..."
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Create backup script
print_status "Creating backup script..."
cat > ~/backup.sh <<'EOF'
#!/bin/bash
# Backup script for Docker volumes and configurations

BACKUP_DIR=~/backups
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup Jenkins
docker run --rm -v jenkins_home:/volume -v $BACKUP_DIR:/backup alpine tar czf /backup/jenkins_$TIMESTAMP.tar.gz -C /volume ./

# Backup Grafana
docker run --rm -v grafana_data:/volume -v $BACKUP_DIR:/backup alpine tar czf /backup/grafana_$TIMESTAMP.tar.gz -C /volume ./

# Backup Prometheus
docker run --rm -v prometheus_data:/volume -v $BACKUP_DIR:/backup alpine tar czf /backup/prometheus_$TIMESTAMP.tar.gz -C /volume ./

echo "Backup completed: $BACKUP_DIR"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x ~/backup.sh

# Create cleanup script
print_status "Creating cleanup script..."
cat > ~/cleanup.sh <<'EOF'
#!/bin/bash
# Docker cleanup script

echo "Cleaning up Docker resources..."

# Remove stopped containers
docker container prune -f

# Remove unused images
docker image prune -a -f

# Remove unused volumes
docker volume prune -f

# Remove unused networks
docker network prune -f

# Show disk usage
docker system df

echo "Cleanup completed!"
EOF

chmod +x ~/cleanup.sh

# Setup log rotation for Docker
print_status "Setting up log rotation..."
sudo tee /etc/logrotate.d/docker > /dev/null <<EOF
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    missingok
    delaycompress
    copytruncate
}
EOF

# Create system monitoring script
print_status "Creating monitoring script..."
cat > ~/monitor.sh <<'EOF'
#!/bin/bash
# System monitoring script

echo "======================================"
echo "System Resource Usage"
echo "======================================"
echo ""

echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}'
echo ""

echo "Memory Usage:"
free -h
echo ""

echo "Disk Usage:"
df -h /
echo ""

echo "Docker Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.CPUPerc}}\t{{.MemUsage}}"
echo ""

echo "Docker Resource Usage:"
docker stats --no-stream
EOF

chmod +x ~/monitor.sh

# Print completion message
echo ""
echo "=================================="
print_status "EC2 Setup Complete!"
echo "=================================="
echo ""
print_warning "IMPORTANT: You need to logout and login again for docker group changes to take effect!"
echo ""
echo "Next steps:"
echo "1. Clone your GitHub repository to ~/app"
echo "2. Copy .env.example to .env and fill in your credentials"
echo "3. Copy all configuration files (docker-compose.yml, Dockerfile, etc.)"
echo "4. Run: cd ~/app && docker compose up -d"
echo ""
echo "Useful commands:"
echo "  ~/monitor.sh     - Check system resources"
echo "  ~/backup.sh      - Backup Docker volumes"
echo "  ~/cleanup.sh     - Clean up Docker resources"
echo ""
print_status "Setup script completed successfully!"
echo "=================================="
