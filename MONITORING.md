# Monitoring Setup

Simple monitoring stack with **Prometheus** (no Grafana, completely free).

## What You Get

- **Prometheus**: Metrics collection and visualization UI
- **Node Exporter**: System metrics (CPU, RAM, Disk, Network)
- **cAdvisor**: Docker container metrics

## Deployment Steps

### 1. Open Firewall Ports on EC2

```bash
sudo ufw allow 9090/tcp  # Prometheus
sudo ufw allow 9100/tcp  # Node Exporter (optional)
sudo ufw allow 8081/tcp  # cAdvisor (optional)
sudo ufw reload
```

### 2. Deploy Monitoring Stack

```bash
cd /home/ubuntu/app
chmod +x deploy-monitoring.sh
./deploy-monitoring.sh
```

### 3. Access Prometheus

Open in browser: **http://54.236.38.189:9090**

## Useful Prometheus Queries

### System Metrics

**CPU Usage (%)**
```promql
100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

**Memory Usage (%)**
```promql
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100
```

**Disk Usage (%)**
```promql
(1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})) * 100
```

**Network Traffic (bytes/sec)**
```promql
rate(node_network_receive_bytes_total{device!="lo"}[5m])
rate(node_network_transmit_bytes_total{device!="lo"}[5m])
```

### Container Metrics

**Container CPU Usage (%)**
```promql
rate(container_cpu_usage_seconds_total{name="file-storage-app"}[5m]) * 100
```

**Container Memory Usage (MB)**
```promql
container_memory_usage_bytes{name="file-storage-app"} / 1024 / 1024
```

**Container Network Traffic**
```promql
rate(container_network_receive_bytes_total{name="file-storage-app"}[5m])
rate(container_network_transmit_bytes_total{name="file-storage-app"}[5m])
```

## How to Use Prometheus UI

1. Go to **http://54.236.38.189:9090**
2. Click **"Graph"** tab
3. Enter a query from above
4. Click **"Execute"**
5. Switch between **"Table"** and **"Graph"** view

### Creating Dashboards

1. Click **"Graph"** → Add multiple queries
2. Use the **"+"** button to add more panels
3. Bookmark the URL to save your dashboard

## Container Management

**View logs:**
```bash
docker logs prometheus
docker logs node-exporter
docker logs cadvisor
```

**Restart monitoring:**
```bash
docker-compose -f docker-compose.monitoring.yml restart
```

**Stop monitoring:**
```bash
docker-compose -f docker-compose.monitoring.yml down
```

**View status:**
```bash
docker-compose -f docker-compose.monitoring.yml ps
```

## Retention Policy

Prometheus stores **30 days** of metrics data by default (configured in docker-compose.monitoring.yml).

To change retention:
```yaml
command:
  - '--storage.tsdb.retention.time=30d'  # Change to 7d, 60d, etc.
```
