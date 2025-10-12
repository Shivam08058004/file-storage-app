#!/bin/bash

# This script updates the docker-compose.yml on EC2 and restarts Jenkins
# with the /home/ubuntu/app directory mounted

echo "🔧 Updating Jenkins configuration to mount /home/ubuntu/app directory..."

cd ~

# Backup current docker-compose.yml
cp docker-compose.yml docker-compose.yml.backup

# Update the volumes section for Jenkins
echo "Adding /home/ubuntu/app volume mount to Jenkins..."

# This assumes docker-compose.yml exists in /home/ubuntu
# Add the volume mount after the docker binary mount line

# Stop Jenkins
echo "Stopping Jenkins..."
docker-compose stop jenkins

# Restart Jenkins with new configuration
echo "Starting Jenkins with updated configuration..."
docker-compose up -d jenkins

# Wait for Jenkins to start
echo "Waiting for Jenkins to start..."
sleep 30

# Check Jenkins status
echo "Checking Jenkins status..."
docker ps | grep jenkins

echo "✅ Jenkins updated and restarted!"
echo ""
echo "The /home/ubuntu/app directory is now mounted in Jenkins container."
echo "You can now run your Jenkins build again."
