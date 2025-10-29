#!/bin/bash
#############################################
# File Storage App - Deployment Script
# Run this after setup-ec2-production.sh
#############################################

set -e

APP_DIR="/home/ubuntu/app/file-storage-app"
ENV_FILE="/home/ubuntu/app/.env"

echo "================================================"
echo "🚀 Deploying File Storage App"
echo "================================================"

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ ERROR: .env file not found at $ENV_FILE"
    echo "Please create the .env file with your credentials first!"
    exit 1
fi

# Clone or update repository
if [ -d "$APP_DIR" ]; then
    echo "📦 Updating repository..."
    cd "$APP_DIR"
    git fetch origin
    git reset --hard origin/main
    git pull origin main
else
    echo "📦 Cloning repository..."
    cd /home/ubuntu/app
    git clone https://github.com/Shivam08058004/file-storage-app.git
    cd "$APP_DIR"
fi

# Copy .env file
echo "📄 Copying environment variables..."
cp "$ENV_FILE" "$APP_DIR/.env"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# Build application
echo "🏗️  Building Next.js application..."
pnpm build

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.minimal.yml down || true

# Build and start containers
echo "🐳 Building and starting Docker containers..."
docker-compose -f docker-compose.minimal.yml up -d --build

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check container status
echo ""
echo "📊 Container Status:"
docker-compose -f docker-compose.minimal.yml ps

# Test health
echo ""
echo "🏥 Testing application health..."
sleep 5
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Application is running successfully!"
else
    echo "⚠️  Application may still be starting up. Check logs with:"
    echo "   docker-compose -f docker-compose.minimal.yml logs -f"
fi

echo ""
echo "================================================"
echo "✅ Deployment Complete!"
echo "================================================"
echo ""
echo "📋 Quick Commands:"
echo "  View logs:     docker-compose -f docker-compose.minimal.yml logs -f"
echo "  Restart:       docker-compose -f docker-compose.minimal.yml restart"
echo "  Stop:          docker-compose -f docker-compose.minimal.yml down"
echo "  Rebuild:       docker-compose -f docker-compose.minimal.yml up -d --build"
echo ""
echo "🌐 Access your app at: http://$(curl -s ifconfig.me):3000"
echo "🔧 Access Jenkins at: http://$(curl -s ifconfig.me):8080"
echo ""
echo "================================================"
