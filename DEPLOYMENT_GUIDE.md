# 🚀 Complete Deployment Guide - Docker Compose on AWS EC2

## Overview

This guide will walk you through deploying your File Storage App using Docker Compose on an AWS EC2 m7i-flex.large instance.

**Total Deployment Time: ~2-3 hours**

---

## 📋 Prerequisites

Before starting, make sure you have:

- [ ] AWS Account with EC2 access
- [ ] Domain name (required for SSL)
- [ ] GitHub account with your code
- [ ] Supabase account (database)
- [ ] AWS S3 bucket configured
- [ ] Resend API key (for emails)
- [ ] Basic terminal/SSH knowledge

---

## Part 1: AWS EC2 Setup (30 minutes)

### Step 1: Launch EC2 Instance

1. **Login to AWS Console** → EC2 Dashboard

2. **Click "Launch Instance"**

3. **Configure Instance:**
   ```
   Name:              file-storage-production
   AMI:               Ubuntu Server 22.04 LTS (64-bit x86)
   Instance Type:     m7i-flex.large
   Key Pair:          Create new or select existing
   ```

4. **Network Settings:**
   - Create new security group or use existing
   - Allow inbound traffic:
     - SSH (22) - Your IP
     - HTTP (80) - Anywhere
     - HTTPS (443) - Anywhere
     - Custom TCP (8080) - Your IP (Jenkins)
     - Custom TCP (3001) - Your IP (Grafana)

5. **Storage:**
   - 30 GB gp3 SSD (minimum)
   - 50 GB recommended for logs and data

6. **Click "Launch Instance"**

### Step 2: Connect to EC2

```bash
# Download your .pem key and set permissions
chmod 400 your-key.pem

# Connect via SSH
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

### Step 3: Allocate Elastic IP (Optional but Recommended)

1. Go to EC2 → Elastic IPs
2. Click "Allocate Elastic IP address"
3. Associate it with your instance
4. Update DNS to point to this IP

---

## Part 2: Server Setup (45 minutes)

### Step 1: Run Automated Setup Script

```bash
# Download the setup script from your repo
wget https://raw.githubusercontent.com/YOUR_USERNAME/file-storage-app/main/setup-ec2.sh

# Make it executable
chmod +x setup-ec2.sh

# Run the script
sudo ./setup-ec2.sh
```

**What this script does:**
- Updates system packages
- Installs Docker & Docker Compose
- Installs Nginx
- Configures firewall (UFW)
- Optimizes system settings
- Creates necessary directories
- Sets up monitoring tools

### Step 2: Logout and Login Again

```bash
# Exit SSH session
exit

# Login again for docker group changes to take effect
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

### Step 3: Verify Installations

```bash
# Check Docker
docker --version
docker compose version

# Check Nginx
nginx -v

# Check system
~/monitor.sh
```

---

## Part 3: Application Deployment (30 minutes)

### Step 1: Clone Your Repository

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/file-storage-app.git app
cd app
```

### Step 2: Configure Environment Variables

```bash
# Copy the example env file
cp .env.production .env

# Edit with your actual values
nano .env
```

**Required values:**
```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_REGION=us-east-1

# NextAuth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Email
RESEND_API_KEY=your-resend-key
EMAIL_FROM=noreply@your-domain.com

# Grafana
GRAFANA_ADMIN_PASSWORD=your-secure-password
```

Save with `Ctrl+X`, then `Y`, then `Enter`

### Step 3: Build and Start Containers

```bash
# Build the Next.js Docker image
docker compose build

# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

**You should see 6 containers running:**
- nextjs-app (port 3000)
- jenkins (port 8080)
- grafana (port 3001)
- prometheus (port 9090)
- node-exporter (port 9100)
- cadvisor (port 8081)

### Step 4: Test Without SSL

```bash
# Test the app
curl http://localhost:3000

# Or from your browser
http://YOUR_EC2_PUBLIC_IP:3000
```

---

## Part 4: Domain & SSL Setup (30 minutes)

### Step 1: Configure DNS

Point your domain to your EC2 instance:

1. Go to your domain registrar (GoDaddy, Namecheap, etc.)
2. Add an **A Record**:
   ```
   Type:  A
   Name:  @ (or subdomain like 'app')
   Value: YOUR_EC2_PUBLIC_IP
   TTL:   300
   ```
3. Wait 5-10 minutes for DNS propagation

### Step 2: Verify DNS

```bash
# Check if DNS is propagated
nslookup your-domain.com

# Or
dig your-domain.com
```

### Step 3: Run SSL Setup Script

```bash
cd ~/app
sudo bash setup-ssl.sh
```

**Follow the prompts:**
- Enter your domain: `your-domain.com`
- Enter your email: `your-email@example.com`

**The script will:**
- Configure Nginx with your domain
- Obtain SSL certificate from Let's Encrypt
- Setup auto-renewal
- Reload Nginx

### Step 4: Verify HTTPS

Open in browser:
- `https://your-domain.com` → Your app
- `https://your-domain.com/jenkins` → Jenkins
- `https://your-domain.com/grafana` → Grafana

---

## Part 5: Jenkins CI/CD Setup (30 minutes)

### Step 1: Get Jenkins Initial Password

```bash
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

Copy the password.

### Step 2: Access Jenkins

1. Open: `https://your-domain.com/jenkins`
2. Paste the initial admin password
3. Click "Install suggested plugins"
4. Create admin user

### Step 3: Install Additional Plugins

Go to: **Manage Jenkins → Plugins → Available**

Install:
- [ ] Docker Pipeline
- [ ] GitHub Integration
- [ ] Pipeline
- [ ] Prometheus Metrics

Restart Jenkins after installation.

### Step 4: Add Docker Hub Credentials

1. Go to: **Manage Jenkins → Credentials → Global → Add Credentials**
2. Select: **Username with password**
3. Username: Your Docker Hub username
4. Password: Your Docker Hub password (or access token)
5. ID: `docker-hub-credentials`
6. Click **Create**

### Step 5: Create Pipeline Job

1. Click **New Item**
2. Name: `file-storage-app-pipeline`
3. Select: **Pipeline**
4. Click **OK**

5. Configure:
   - Description: "Build and deploy File Storage App"
   - Build Triggers: ✓ GitHub hook trigger
   - Pipeline Definition: **Pipeline script from SCM**
   - SCM: **Git**
   - Repository URL: `https://github.com/YOUR_USERNAME/file-storage-app.git`
   - Branch: `main`
   - Script Path: `Jenkinsfile`

6. Click **Save**

### Step 6: Configure GitHub Webhook

1. Go to your GitHub repo → **Settings → Webhooks**
2. Click **Add webhook**
3. Payload URL: `https://your-domain.com/jenkins/github-webhook/`
4. Content type: `application/json`
5. Select: **Just the push event**
6. Click **Add webhook**

### Step 7: Test Pipeline

```bash
# Make a small change and push
echo "# Test" >> README.md
git add .
git commit -m "Test Jenkins pipeline"
git push
```

Jenkins should automatically build and deploy!

---

## Part 6: Grafana Dashboard Setup (15 minutes)

### Step 1: Access Grafana

1. Open: `https://your-domain.com/grafana`
2. Login:
   - Username: `admin`
   - Password: (from your .env file)

### Step 2: Verify Data Source

1. Go to: **Configuration → Data Sources**
2. You should see **Prometheus** (auto-configured)
3. Click **Test** to verify connection

### Step 3: Import Dashboard

1. Go to: **Dashboards → Browse**
2. You should see **"File Storage App - System Overview"** (auto-loaded)
3. Click on it to view metrics

### Step 4: Explore Metrics

You should see:
- CPU, Memory, Disk usage gauges
- Container resource usage graphs
- Network traffic
- Disk I/O

---

## Part 7: Verification & Testing (15 minutes)

### Checklist

```bash
# 1. Check all containers are running
docker compose ps

# 2. Check container health
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 3. Check logs for errors
docker compose logs --tail=50

# 4. Test app endpoints
curl -I https://your-domain.com
curl -I https://your-domain.com/api/files/stats

# 5. Check disk space
df -h

# 6. Check memory usage
free -h

# 7. View system resources
~/monitor.sh
```

### Test the Application

1. **Sign Up:** Create a new account
2. **Email Verification:** Check email and verify
3. **Upload File:** Upload a test file
4. **Create Folder:** Test folder creation
5. **Download File:** Download the file back
6. **Delete File:** Test deletion
7. **Storage Stats:** Check storage indicator

---

## Part 8: Maintenance & Operations

### Daily Operations

```bash
# Check system status
~/monitor.sh

# View container logs
docker compose logs -f --tail=50

# Restart a specific service
docker compose restart nextjs-app

# Restart all services
docker compose restart
```

### Backups

```bash
# Run backup script
~/backup.sh

# Backups are stored in ~/backups/

# Restore from backup (example for Jenkins)
docker run --rm \
  -v jenkins_home:/volume \
  -v ~/backups:/backup \
  alpine sh -c "cd /volume && tar xzf /backup/jenkins_TIMESTAMP.tar.gz"
```

### Updates

```bash
cd ~/app

# Pull latest code
git pull

# Rebuild and restart
docker compose build
docker compose up -d

# Check if update was successful
docker compose ps
docker compose logs -f
```

### Cleanup

```bash
# Remove unused Docker resources
~/cleanup.sh

# Or manually:
docker system prune -a
docker volume prune
```

### Monitoring

- **Grafana Dashboard:** `https://your-domain.com/grafana`
- **Prometheus:** `https://your-domain.com/prometheus`
- **Container Stats:** `docker stats`
- **System Monitor:** `~/monitor.sh`

---

## 🔧 Troubleshooting

### Issue: Containers won't start

```bash
# Check Docker daemon
sudo systemctl status docker

# Check logs
docker compose logs

# Check disk space
df -h

# Restart Docker
sudo systemctl restart docker
docker compose up -d
```

### Issue: Cannot access via HTTPS

```bash
# Check Nginx status
sudo systemctl status nginx

# Test Nginx config
sudo nginx -t

# Check SSL certificate
sudo certbot certificates

# Renew certificate manually
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### Issue: Jenkins build fails

```bash
# Check Jenkins logs
docker logs jenkins

# Enter Jenkins container
docker exec -it jenkins bash

# Check Docker socket access
ls -l /var/run/docker.sock
```

### Issue: High memory usage

```bash
# Check which container is using memory
docker stats

# Restart the problematic container
docker compose restart <container-name>

# Increase swap if needed
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Issue: Database connection fails

```bash
# Check environment variables
docker exec nextjs-app env | grep SUPABASE

# Test Supabase connection
curl -I https://YOUR_SUPABASE_URL.supabase.co

# Check app logs
docker logs file-storage-app
```

---

## 📊 Cost Monitoring

### Monthly Cost Breakdown

```
EC2 m7i-flex.large (730 hrs):    ~$62.00
Elastic IP (unused):              $3.60
EBS Storage (30 GB):              $2.40
Data Transfer (50 GB out):        $4.50
S3 Storage (100 GB):              $2.30
Domain (.com):                    $1.00
────────────────────────────────────────
Total:                            ~$75.80/month
```

### Cost Optimization Tips

1. **Stop instance when not needed:**
   ```bash
   aws ec2 stop-instances --instance-ids i-xxxxx
   ```

2. **Use AWS Budgets:** Set up billing alerts

3. **Monitor data transfer:** Use CloudWatch

4. **Optimize images:** Keep Docker images small

5. **Clean up regularly:** Run `~/cleanup.sh` weekly

---

## 🎓 For College Project Report

### Screenshots to Take

1. ✅ EC2 instance running
2. ✅ All 6 containers running (`docker ps`)
3. ✅ Nginx configuration
4. ✅ Jenkins pipeline success
5. ✅ Grafana dashboard with metrics
6. ✅ Application working (upload/download)
7. ✅ SSL certificate (padlock in browser)
8. ✅ System resource usage

### Metrics to Include

- Average CPU usage: ___%
- Average memory usage: ___%
- Build time: ___ minutes
- Deployment time: ___ seconds
- Uptime: ___ days

### Architecture Diagram

Include:
- EC2 instance with Docker Compose
- 6 containers with ports
- External services (S3, Supabase, Resend)
- Nginx reverse proxy
- User flow

---

## 📞 Need Help?

Common resources:
- Docker docs: https://docs.docker.com
- Next.js docs: https://nextjs.org/docs
- AWS EC2 docs: https://docs.aws.amazon.com/ec2
- Let's Encrypt: https://letsencrypt.org/docs

---

## ✅ Deployment Complete!

Your application is now live at:
- **Main App:** `https://your-domain.com`
- **Jenkins:** `https://your-domain.com/jenkins`
- **Grafana:** `https://your-domain.com/grafana`

**Congratulations! 🎉**
