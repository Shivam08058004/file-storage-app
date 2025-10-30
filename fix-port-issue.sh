#!/bin/bash
#############################################
# Fix Port 3000 Not Exposed Issue
# Run this on EC2: bash fix-port-issue.sh
#############################################

set -e

echo "🔧 Fixing file-storage-app port exposure issue..."
echo ""

# Navigate to app directory
cd /home/ubuntu/app

# Show current container status
echo "📊 Current container status:"
docker ps | grep file-storage-app || echo "Container not found"
echo ""

# Stop and remove containers
echo "🛑 Stopping containers..."
docker-compose down

# Wait a moment
sleep 2

# Start containers with proper configuration
echo "🚀 Starting containers with port mapping..."
docker-compose up -d

# Wait for containers to start
sleep 5

# Show new container status
echo ""
echo "✅ New container status:"
docker ps | grep file-storage-app

# Check if port is listening
echo ""
echo "🔍 Checking if port 3000 is listening..."
sudo netstat -tulpn | grep 3000 || echo "⚠️  Port 3000 not listening yet"

# Test local access
echo ""
echo "🧪 Testing local access..."
curl -I http://localhost:3000 2>&1 | head -5

echo ""
echo "================================================"
echo "✅ Fix applied!"
echo "================================================"
echo ""
echo "Now test from your local machine:"
echo "  Test-NetConnection -ComputerName 44.220.178.213 -Port 3000"
echo ""
echo "Or open in browser:"
echo "  http://44.220.178.213:3000"
echo ""
