#!/bin/bash

# Deploy Monitoring Stack (Prometheus + Node Exporter + cAdvisor)
# Run this script on your EC2 instance

set -e

echo "🔍 Deploying Monitoring Stack..."

# Create app-network if it doesn't exist
docker network inspect app-network >/dev/null 2>&1 || docker network create app-network

# Stop and remove existing monitoring containers
echo "Stopping existing monitoring containers..."
docker-compose -f docker-compose.monitoring.yml down || true

# Pull latest images
echo "Pulling latest monitoring images..."
docker-compose -f docker-compose.monitoring.yml pull

# Start monitoring stack
echo "Starting monitoring stack..."
docker-compose -f docker-compose.monitoring.yml up -d

# Wait for services to start
echo "Waiting for services to start..."
sleep 10

# Check status
echo ""
echo "✅ Monitoring Stack Status:"
docker-compose -f docker-compose.monitoring.yml ps

# Get EC2 public IP dynamically
EC2_IP=$(curl -s ifconfig.me || curl -s http://checkip.amazonaws.com || echo "YOUR_EC2_IP")

echo ""
echo "🎉 Monitoring deployed successfully!"
echo ""
echo "📊 Access Points:"
echo "  - Prometheus UI:  http://${EC2_IP}:9090"
echo "  - Node Exporter:  http://${EC2_IP}:9100/metrics"
echo "  - cAdvisor UI:    http://${EC2_IP}:8081"
echo ""
echo "📈 Useful Prometheus Queries:"
echo "  - CPU Usage:      100 - (avg by(instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)"
echo "  - Memory Usage:   (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100"
echo "  - Disk Usage:     (1 - (node_filesystem_avail_bytes{mountpoint=\"/\"} / node_filesystem_size_bytes{mountpoint=\"/\"})) * 100"
echo "  - Container CPU:  rate(container_cpu_usage_seconds_total{name=\"file-storage-app\"}[5m]) * 100"
echo ""
