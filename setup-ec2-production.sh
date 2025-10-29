#!/bin/bash
#############################################
# File Storage App - EC2 Production Setup
# Run this on your Ubuntu EC2 instance
#############################################

set -e

echo "================================================"
echo "🚀 File Storage App - EC2 Production Setup"
echo "================================================"

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu
echo "✅ Docker installed successfully"

# Install Docker Compose standalone (for compatibility)
echo "📦 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
echo "✅ Docker Compose installed"

# Install Node.js 20 (for building)
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
echo "📦 Installing pnpm..."
sudo npm install -g pnpm
echo "✅ Node.js and pnpm installed"

# Install Git
echo "📦 Installing Git..."
sudo apt-get install -y git
echo "✅ Git installed"

# Create app directory
echo "📁 Creating application directory..."
sudo mkdir -p /home/ubuntu/app
sudo chown ubuntu:ubuntu /home/ubuntu/app
cd /home/ubuntu/app

# Install useful tools
echo "📦 Installing monitoring tools..."
sudo apt-get install -y htop wget curl vim net-tools

# Configure firewall (UFW)
echo "🔒 Configuring firewall..."
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 3000/tcp    # Next.js
sudo ufw allow 8080/tcp    # Jenkins
sudo ufw --force enable
echo "✅ Firewall configured"

# Increase system limits for containers
echo "⚙️  Configuring system limits..."
sudo tee -a /etc/sysctl.conf > /dev/null <<EOL
vm.max_map_count=262144
fs.file-max=65536
EOL
sudo sysctl -p

# Create swap file (recommended for smaller instances)
if [ ! -f /swapfile ]; then
    echo "💾 Creating swap file..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "✅ Swap file created"
fi

# Display versions
echo ""
echo "================================================"
echo "✅ Installation Complete!"
echo "================================================"
echo "Installed versions:"
docker --version
docker-compose --version
node --version
npm --version
pnpm --version
git --version
echo ""
echo "Next steps:"
echo "1. Clone your repository: git clone https://github.com/Shivam08058004/file-storage-app.git"
echo "2. Create .env file in /home/ubuntu/app/"
echo "3. Run the deployment script"
echo ""
echo "⚠️  IMPORTANT: Log out and log back in for Docker permissions to take effect!"
echo "================================================"
