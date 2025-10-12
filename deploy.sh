#!/bin/bash

###############################################################################
# Simple Deployment Script - Build on Host, Run in Docker
# This script builds the Next.js app locally then containerizes it
###############################################################################

set -e  # Exit on error

echo "======================================"
echo "🚀 Starting Deployment"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Are you in the app directory?"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found. Please create it first."
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Step 1: Install pnpm globally if not already installed
echo "📦 Step 1: Checking pnpm installation..."
if ! command -v pnpm &> /dev/null; then
    echo "Installing pnpm globally..."
    sudo npm install -g pnpm
else
    echo "✅ pnpm already installed"
fi
echo ""

# Step 2: Install dependencies
echo "📚 Step 2: Installing dependencies..."
pnpm install --frozen-lockfile
echo "✅ Dependencies installed"
echo ""

# Step 3: Build Next.js application
echo "🔨 Step 3: Building Next.js application..."
pnpm build
echo "✅ Build completed"
echo ""

# Step 4: Build Docker image
echo "🐳 Step 4: Building Docker image..."
docker compose build
echo "✅ Docker image built"
echo ""

# Step 5: Stop existing containers
echo "🛑 Step 5: Stopping existing containers..."
docker compose down || true
echo "✅ Containers stopped"
echo ""

# Step 6: Start containers
echo "🚀 Step 6: Starting containers..."
docker compose up -d
echo "✅ Containers started"
echo ""

# Step 7: Check status
echo "🔍 Step 7: Checking container status..."
sleep 5
docker compose ps
echo ""

# Step 8: Show logs
echo "📋 Step 8: Container logs (last 20 lines)..."
docker compose logs --tail=20
echo ""

echo "======================================"
echo "✅ Deployment Complete!"
echo "======================================"
echo ""
echo "Your application should be accessible at:"
echo "  http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000"
echo ""
echo "Useful commands:"
echo "  docker compose ps          - Check container status"
echo "  docker compose logs -f     - View live logs"
echo "  docker compose restart     - Restart containers"
echo "  docker compose down        - Stop containers"
echo ""
