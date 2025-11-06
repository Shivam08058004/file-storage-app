#!/bin/bash
#############################################
# Fix Port 3000 Not Exposed Issue
# Run this on EC2: bash fix-port-issue.sh
#############################################

set -e

echo "🔧 Fixing file-storage-app port exposure issue..."
echo ""

# Show current container status
echo "📊 Current container status:"
docker ps -a | grep file-storage-app || echo "Container not found"
echo ""

# Stop and remove the app container (Jenkins deploys with docker run, not docker-compose)
echo "🛑 Stopping and removing file-storage-app container..."
docker stop file-storage-app 2>/dev/null || echo "Container already stopped"
docker rm file-storage-app 2>/dev/null || echo "Container already removed"

# Wait a moment
sleep 2

# Check if .env file exists
if [ ! -f /home/ubuntu/app/.env ]; then
    echo "❌ ERROR: .env file not found at /home/ubuntu/app/.env"
    echo "Please create it first!"
    exit 1
fi

# Start container with host network (same as Jenkins does)
echo "🚀 Starting file-storage-app with host network..."
docker run -d \
    --name file-storage-app \
    --network host \
    --env-file /home/ubuntu/app/.env \
    --restart always \
    file-storage-app:latest

# Wait for container to start
echo "⏳ Waiting for container to start..."
sleep 10

# Show new container status
echo ""
echo "✅ New container status:"
docker ps | grep file-storage-app

# Check if port is listening
echo ""
echo "🔍 Checking if port 3000 is listening..."
sudo netstat -tulpn | grep 3000 || echo "⚠️  Port 3000 not listening yet, waiting..."

# Wait a bit more and try again
sleep 5
sudo netstat -tulpn | grep 3000 || echo "⚠️  Still not listening"

# Test local access
echo ""
echo "🧪 Testing local access..."
curl -I http://localhost:3000 2>&1 | head -10 || echo "❌ Not responding yet"

# Show container logs
echo ""
echo "📋 Recent container logs:"
docker logs file-storage-app --tail=20

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
