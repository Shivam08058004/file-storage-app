# 🚀 Quick Start Guide - Docker Compose Deployment

## What You Got

I've created a **complete, production-ready Docker Compose setup** for deploying your File Storage App on AWS EC2 (m7i-flex.large).

---

## 📦 Files Created (15 files)

### Core Deployment Files:
1. ✅ **docker-compose.yml** - Orchestrates 6 containers
2. ✅ **Dockerfile** - Optimized Next.js build (multi-stage)
3. ✅ **.dockerignore** - Keeps image small
4. ✅ **.env.production** - Environment variables template

### Setup & Configuration:
5. ✅ **setup-ec2.sh** - Automated EC2 setup script
6. ✅ **setup-ssl.sh** - SSL certificate automation
7. ✅ **nginx/app.conf** - Reverse proxy configuration
8. ✅ **Jenkinsfile** - Complete CI/CD pipeline

### Monitoring & Alerts:
9. ✅ **prometheus/prometheus.yml** - Metrics collection config
10. ✅ **prometheus/alerts/alerts.yml** - Alert rules
11. ✅ **grafana/provisioning/datasources/prometheus.yml** - Auto-configure Prometheus
12. ✅ **grafana/provisioning/dashboards/dashboards.yml** - Dashboard loading
13. ✅ **grafana/dashboards/system-overview.json** - Pre-built dashboard

### Documentation:
14. ✅ **DEPLOYMENT_GUIDE.md** - Step-by-step deployment (comprehensive)
15. ✅ **PROJECT_REPORT_TEMPLATE.md** - College report template

### Modified Files:
16. ✅ **next.config.mjs** - Added `output: 'standalone'` for Docker

---

## 🎯 What It Deploys

### 6 Docker Containers:
```
┌─────────────────────────────────────────┐
│   Your m7i-flex.large EC2 Instance      │
│                                          │
│  📦 nextjs-app       (Port 3000)        │
│  📦 jenkins          (Port 8080)        │
│  📦 grafana          (Port 3001)        │
│  📦 prometheus       (Port 9090)        │
│  📦 node-exporter    (Port 9100)        │
│  📦 cadvisor         (Port 8081)        │
│                                          │
│  🌐 Nginx Reverse Proxy                 │
│  🔒 SSL/TLS with Let's Encrypt          │
└─────────────────────────────────────────┘
```

---

## ⚡ Quick Deployment (3 Steps)

### Step 1: Launch EC2 & Connect (10 min)
```bash
# Launch m7i-flex.large with Ubuntu 22.04
# Open ports: 22, 80, 443, 8080, 3001
# Connect via SSH:
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
```

### Step 2: Run Setup Script (15 min)
```bash
# Clone your repo
git clone https://github.com/YOUR_USERNAME/file-storage-app.git app
cd app

# Run automated setup
chmod +x setup-ec2.sh
sudo ./setup-ec2.sh

# Logout and login again
exit
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
```

### Step 3: Configure & Deploy (20 min)
```bash
cd app

# Copy and edit environment variables
cp .env.production .env
nano .env  # Fill in your actual values

# Start everything!
docker compose up -d

# Check status
docker compose ps

# Setup SSL (after DNS is configured)
sudo bash setup-ssl.sh
```

**Done! Your app is live! 🎉**

---

## 🌐 Access Your Services

After deployment:

| Service | URL | Purpose |
|---------|-----|---------|
| **Main App** | `https://your-domain.com` | File storage app |
| **Jenkins** | `https://your-domain.com/jenkins` | CI/CD dashboard |
| **Grafana** | `https://your-domain.com/grafana` | Monitoring |
| **Prometheus** | `https://your-domain.com/prometheus` | Metrics (optional) |

---

## 📊 System Requirements

### m7i-flex.large Specs:
- **vCPUs:** 2
- **Memory:** 8 GB
- **Storage:** 30 GB (minimum)
- **Network:** Up to 12.5 Gbps
- **Cost:** ~$62/month

### Resource Usage:
```
Expected Usage:
├── CPU:     30-40% average, 80% peak
├── Memory:  4.5-5.5 GB used (60-70%)
├── Disk:    12-15 GB used
└── Network: 5-10 Mbps average

✅ Perfect fit for your workload!
```

---

## 💰 Total Monthly Cost

```
EC2 m7i-flex.large:        $62.00
Elastic IP:                 $3.60
EBS Storage (30 GB):        $2.40
S3 Storage (100 GB):        $2.30
Data Transfer (50 GB):      $4.50
Domain (.com):              $1.00
─────────────────────────────────
Total:                     ~$75.80/month
```

**With AWS Free Tier:** ~$65-70/month

---

## 🔧 Common Commands

### Check Status:
```bash
docker compose ps                    # Container status
docker compose logs -f               # View logs
~/monitor.sh                         # System resources
```

### Restart Services:
```bash
docker compose restart               # Restart all
docker compose restart nextjs-app    # Restart specific service
```

### Update Application:
```bash
cd ~/app
git pull                             # Get latest code
docker compose build                 # Rebuild images
docker compose up -d                 # Deploy update
```

### Backups:
```bash
~/backup.sh                          # Backup all data
```

### Cleanup:
```bash
~/cleanup.sh                         # Clean Docker resources
```

---

## 🎓 For Your College Project

### What It Demonstrates:

#### AWS Services (6+):
✅ EC2 - Compute instance
✅ S3 - File storage
✅ VPC - Networking
✅ Security Groups - Firewall
✅ IAM - Access control
✅ (Optional) Route 53, CloudWatch

#### DevOps Tools (6+):
✅ Docker - Containerization
✅ Docker Compose - Orchestration
✅ Jenkins - CI/CD automation
✅ Grafana - Monitoring
✅ Prometheus - Metrics
✅ Nginx - Reverse proxy
✅ Git/GitHub - Version control

#### Key Concepts:
✅ Infrastructure as Code
✅ Continuous Integration/Deployment
✅ Container orchestration
✅ Monitoring & observability
✅ Security best practices
✅ Automated deployments

---

## 📝 Documentation for Report

### Screenshots to Take:
1. ✅ EC2 dashboard with instance running
2. ✅ `docker compose ps` output (all containers)
3. ✅ Jenkins pipeline success
4. ✅ Grafana dashboard with graphs
5. ✅ Application working (upload a file)
6. ✅ SSL certificate in browser (padlock)
7. ✅ Nginx configuration
8. ✅ `~/monitor.sh` output

### Use the Report Template:
- Open `PROJECT_REPORT_TEMPLATE.md`
- Fill in your details
- Add screenshots
- Explain architecture
- Document challenges

---

## 🚨 Troubleshooting

### Containers won't start?
```bash
sudo systemctl restart docker
docker compose down
docker compose up -d
```

### Out of memory?
```bash
# Check usage
free -h

# Add swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### SSL certificate issues?
```bash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### Can't access via HTTPS?
```bash
# Check DNS
nslookup your-domain.com

# Check Nginx
sudo nginx -t
sudo systemctl status nginx

# Check firewall
sudo ufw status
```

---

## ✅ Pre-Deployment Checklist

Before starting deployment:

- [ ] AWS account with payment method
- [ ] Domain name purchased
- [ ] Supabase database created
- [ ] AWS S3 bucket created
- [ ] AWS IAM user with S3 access
- [ ] Resend API key obtained
- [ ] GitHub repo accessible
- [ ] SSH key pair downloaded

---

## 🎯 Next Steps

### Immediate:
1. **Push to GitHub:** Commit and push all new files
   ```bash
   git add .
   git commit -m "Add Docker Compose deployment configuration"
   git push
   ```

2. **Create AWS Resources:**
   - EC2 instance (m7i-flex.large)
   - Elastic IP (optional)
   - Security group rules

3. **Follow DEPLOYMENT_GUIDE.md:**
   - Complete step-by-step instructions
   - Estimated time: 2-3 hours total

### After Deployment:
1. Test all features
2. Take screenshots for report
3. Fill in PROJECT_REPORT_TEMPLATE.md
4. Configure Jenkins webhook
5. Test CI/CD pipeline

---

## 📚 File Structure Reference

```
file-storage-app/
├── docker-compose.yml              ← Main orchestration
├── Dockerfile                      ← App container build
├── .dockerignore                   ← Exclude files from image
├── .env.production                 ← Environment template
├── next.config.mjs                 ← Updated for Docker
│
├── setup-ec2.sh                    ← Automated EC2 setup
├── setup-ssl.sh                    ← SSL certificate setup
│
├── Jenkinsfile                     ← CI/CD pipeline
│
├── nginx/
│   └── app.conf                    ← Reverse proxy config
│
├── prometheus/
│   ├── prometheus.yml              ← Metrics config
│   └── alerts/
│       └── alerts.yml              ← Alert rules
│
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/
│   │   │   └── prometheus.yml      ← Auto-configure datasource
│   │   └── dashboards/
│   │       └── dashboards.yml      ← Dashboard loading
│   └── dashboards/
│       └── system-overview.json    ← Pre-built dashboard
│
├── DEPLOYMENT_GUIDE.md             ← Step-by-step guide
├── PROJECT_REPORT_TEMPLATE.md      ← College report
├── DOCKER_COMPOSE_OPTION_DETAILED.md  ← Architecture explanation
└── KUBERNETES_WITHOUT_EKS.md       ← Alternative (K8s)
```

---

## 💡 Pro Tips

### 1. Save Money
```bash
# Stop instance when not using (saves $62/month)
aws ec2 stop-instances --instance-ids i-xxxxx

# Start when needed
aws ec2 start-instances --instance-ids i-xxxxx
```

### 2. Monitor Costs
- Setup AWS Budget alerts
- Monitor data transfer
- Use AWS Cost Explorer

### 3. Backup Regularly
```bash
# Add to crontab for weekly backups
crontab -e
# Add: 0 2 * * 0 /home/ubuntu/backup.sh
```

### 4. Security Best Practices
- Change default passwords
- Restrict admin ports to your IP
- Update packages regularly
- Monitor logs for suspicious activity

---

## 🎉 You're All Set!

You now have everything you need to deploy your File Storage App using Docker Compose on AWS!

### What You Have:
✅ **Production-ready configuration**
✅ **Automated setup scripts**
✅ **Complete CI/CD pipeline**
✅ **Monitoring dashboards**
✅ **Comprehensive documentation**
✅ **College report template**

### Deployment Timeline:
- **Setup:** 30 minutes
- **Deploy:** 30 minutes
- **Configure:** 30 minutes
- **Test:** 30 minutes
- **Total:** ~2-3 hours

### Support:
- **Detailed Guide:** `DEPLOYMENT_GUIDE.md`
- **Architecture:** `DOCKER_COMPOSE_OPTION_DETAILED.md`
- **Report Help:** `PROJECT_REPORT_TEMPLATE.md`

---

**Good luck with your deployment and college project! 🚀**

Questions? Check the DEPLOYMENT_GUIDE.md for detailed troubleshooting!
