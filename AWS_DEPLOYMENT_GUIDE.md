# Complete AWS Deployment Guide - File Storage Application

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [AWS Services Used](#aws-services-used)
3. [Prerequisites](#prerequisites)
4. [Step 1: Database Setup (Supabase)](#step-1-database-setup-supabase)
5. [Step 2: AWS S3 Storage Setup](#step-2-aws-s3-storage-setup)
6. [Step 3: Email Service Setup (Gmail)](#step-3-email-service-setup-gmail)
7. [Step 4: AWS EC2 Instance Setup](#step-4-aws-ec2-instance-setup)
8. [Step 5: CI/CD Pipeline with Jenkins](#step-5-cicd-pipeline-with-jenkins)
9. [Step 6: Application Deployment](#step-6-application-deployment)
10. [Step 7: Monitoring with Prometheus](#step-7-monitoring-with-prometheus)
11. [Testing & Verification](#testing--verification)
12. [Maintenance & Operations](#maintenance--operations)
13. [Troubleshooting](#troubleshooting)

---

## Project Overview

**Application**: Next.js 15 File Storage Application  
**Tech Stack**: Next.js, TypeScript, React, Tailwind CSS, shadcn/ui  
**Authentication**: NextAuth.js with email/password  
**Database**: Supabase (PostgreSQL)  
**Storage**: AWS S3  
**Email**: Gmail SMTP via Nodemailer  
**Infrastructure**: AWS EC2 (c7i-flex.large)  
**CI/CD**: Jenkins with Docker  
**Monitoring**: Prometheus + Node Exporter + cAdvisor  

**Live URLs**:
- Application: http://54.236.38.189:3000
- Jenkins: http://54.236.38.189:8080
- Prometheus: http://54.236.38.189:9090

---

## AWS Services Used

### 1. **Amazon EC2 (Elastic Compute Cloud)**
- **Purpose**: Host the application, Jenkins, and monitoring stack
- **Instance Type**: c7i-flex.large
- **OS**: Ubuntu 24.04 LTS
- **vCPU**: 2
- **Memory**: 4 GB
- **Storage**: 30 GB EBS
- **Region**: us-east-1
- **Public IP**: 54.236.38.189

### 2. **Amazon S3 (Simple Storage Service)**
- **Purpose**: Store user-uploaded files
- **Bucket Name**: file-storage-app-2025
- **Region**: us-east-1
- **Access**: Public read access for file downloads
- **Security**: IAM user with programmatic access
- **Storage Class**: Standard (pay-as-you-go)

### 3. **AWS IAM (Identity and Access Management)**
- **Purpose**: Manage S3 access credentials
- **User**: file-storage-app-user
- **Permissions**: AmazonS3FullAccess
- **Access Type**: Programmatic access (Access Key ID + Secret)

### 4. **AWS Security Groups**
- **Purpose**: Firewall rules for EC2 instance
- **Inbound Rules**:
  - Port 22 (SSH)
  - Port 80 (HTTP - reserved for future)
  - Port 443 (HTTPS - reserved for future)
  - Port 3000 (Next.js Application)
  - Port 8080 (Jenkins)
  - Port 8081 (cAdvisor)
  - Port 9090 (Prometheus)
  - Port 9100 (Node Exporter)

---

## Prerequisites

Before starting, ensure you have:

- ✅ AWS Account (free tier eligible)
- ✅ GitHub Account
- ✅ Supabase Account (free tier)
- ✅ Gmail Account with App Password enabled
- ✅ SSH Key Pair for EC2 access
- ✅ Basic knowledge of Linux commands
- ✅ Git installed locally

---

## Step 1: Database Setup (Supabase)

### 1.1 Create Supabase Project

1. Go to https://supabase.com
2. Click **"New Project"**
3. Fill in details:
   - **Name**: file-storage-app
   - **Database Password**: (Generate strong password)
   - **Region**: Choose closest to your users
4. Wait for project provisioning (~2 minutes)

### 1.2 Get Database Credentials

1. Go to **Project Settings** → **API**
2. Copy these values:
   - **URL**: `https://[project-ref].supabase.co`
   - **anon/public key**: `eyJhbGc...` (for client-side)
   - **service_role key**: `eyJhbGc...` (for server-side)

### 1.3 Create Database Schema

1. Go to **SQL Editor** in Supabase dashboard
2. Run the schema file (`supabase-schema.sql`):

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token TEXT,
  verification_token_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  storage_used BIGINT DEFAULT 0,
  storage_limit BIGINT DEFAULT 5368709120, -- 5GB in bytes
  provider TEXT DEFAULT 'credentials'
);

-- Files table
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size BIGINT NOT NULL,
  type TEXT NOT NULL,
  s3_key TEXT NOT NULL,
  s3_url TEXT NOT NULL,
  parent_folder TEXT DEFAULT '',
  is_folder BOOLEAN DEFAULT FALSE,
  share_token TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_parent_folder ON files(parent_folder);
CREATE INDEX IF NOT EXISTS idx_files_share_token ON files(share_token);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
```

3. Click **Run** to execute

### 1.4 Verify Tables Created

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

You should see `users` and `files` tables.

---

## Step 2: AWS S3 Storage Setup

### 2.1 Create S3 Bucket

1. Login to **AWS Console**: https://console.aws.amazon.com
2. Navigate to **S3** service
3. Click **"Create bucket"**
4. Configure:
   - **Bucket name**: `file-storage-app-2025` (must be globally unique)
   - **Region**: `us-east-1` (US East - N. Virginia)
   - **Block all public access**: UNCHECK (we need public read)
   - **Bucket Versioning**: Disabled
   - **Default encryption**: SSE-S3
5. Click **"Create bucket"**

### 2.2 Configure Bucket Policy (Public Read Access)

1. Go to your bucket → **Permissions** tab
2. Scroll to **Bucket Policy**
3. Click **Edit** and paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::file-storage-app-2025/*"
    }
  ]
}
```

4. Click **Save changes**

### 2.3 Enable CORS

1. Go to **Permissions** → **CORS**
2. Click **Edit** and paste:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

3. Click **Save changes**

### 2.4 Create IAM User for S3 Access

1. Navigate to **IAM** service
2. Click **Users** → **Create user**
3. **User name**: `file-storage-app-user`
4. Click **Next**
5. **Permissions**: Select **"Attach policies directly"**
6. Search and select: **AmazonS3FullAccess**
7. Click **Next** → **Create user**

### 2.5 Generate Access Keys

1. Click on the created user
2. Go to **Security credentials** tab
3. Click **"Create access key"**
4. Select **"Application running on AWS compute service"** → Continue
5. Copy and save securely:
   - **Access Key ID**: `AKIA...`
   - **Secret Access Key**: `wJalr...` (shown only once!)

---

## Step 3: Email Service Setup (Gmail)

### 3.1 Enable 2-Factor Authentication

1. Go to https://myaccount.google.com/security
2. Enable **2-Step Verification**
3. Follow the setup wizard

### 3.2 Generate App Password

1. Go to https://myaccount.google.com/apppasswords
2. **App name**: `File Storage App`
3. Click **Create**
4. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)
5. Remove spaces: `abcdefghijklmnop`

### 3.3 Test Email Configuration

From your local machine, create a test file:

```javascript
// test-email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password'
  }
});

transporter.sendMail({
  from: 'your-email@gmail.com',
  to: 'your-email@gmail.com',
  subject: 'Test Email',
  text: 'If you receive this, email is configured correctly!'
}, (error, info) => {
  if (error) {
    console.log('Error:', error);
  } else {
    console.log('Email sent:', info.response);
  }
});
```

Run: `node test-email.js`

---

## Step 4: AWS EC2 Instance Setup

### 4.1 Launch EC2 Instance

1. Go to **EC2 Dashboard**
2. Click **"Launch Instance"**
3. Configure:

   **Name**: `file-storage-app-server`
   
   **AMI**: Ubuntu Server 24.04 LTS (64-bit x86)
   
   **Instance Type**: c7i-flex.large (2 vCPU, 4 GB RAM)
   
   **Key Pair**: 
   - Create new or select existing
   - Download `.pem` file if creating new
   
   **Network Settings**:
   - VPC: Default
   - Auto-assign public IP: Enable
   - Firewall: Create new security group
   
   **Security Group Rules**:
   ```
   SSH          TCP  22    0.0.0.0/0
   HTTP         TCP  80    0.0.0.0/0
   HTTPS        TCP  443   0.0.0.0/0
   Custom TCP   TCP  3000  0.0.0.0/0  (Next.js)
   Custom TCP   TCP  8080  0.0.0.0/0  (Jenkins)
   Custom TCP   TCP  8081  0.0.0.0/0  (cAdvisor)
   Custom TCP   TCP  9090  0.0.0.0/0  (Prometheus)
   Custom TCP   TCP  9100  0.0.0.0/0  (Node Exporter)
   ```
   
   **Storage**: 30 GB gp3

4. Click **"Launch instance"**
5. Wait for **Status: Running**
6. Note the **Public IPv4 address** (e.g., 54.236.38.189)

### 4.2 Connect to EC2 Instance

**Windows (PowerShell)**:
```powershell
ssh -i "your-key.pem" ubuntu@54.236.38.189
```

**Mac/Linux**:
```bash
chmod 400 your-key.pem
ssh -i "your-key.pem" ubuntu@54.236.38.189
```

### 4.3 Initial Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y git curl wget build-essential

# Set timezone
sudo timedatectl set-timezone America/New_York

# Create swap file (recommended for 4GB RAM)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Configure firewall
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 8080/tcp
sudo ufw allow 8081/tcp
sudo ufw allow 9090/tcp
sudo ufw allow 9100/tcp
sudo ufw --force enable
```

### 4.4 Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker ubuntu

# Start Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Verify installation
docker --version
```

### 4.5 Install Docker Compose

```bash
# Download Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

### 4.6 Install Node.js and pnpm

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js
node --version  # Should show v20.x.x
npm --version

# Install pnpm globally
sudo npm install -g pnpm

# Verify pnpm
pnpm --version
```

### 4.7 Create Application Directory

```bash
# Create app directory
sudo mkdir -p /home/ubuntu/app
sudo chown -R ubuntu:ubuntu /home/ubuntu/app
cd /home/ubuntu/app

# Clone repository
git clone https://github.com/Shivam08058004/file-storage-app.git
cd file-storage-app
```

### 4.8 Create Environment File

```bash
# Create .env file
nano /home/ubuntu/app/.env
```

Paste this configuration (replace with your actual values):

```bash
# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key

# AWS S3 Storage
AWS_ACCESS_KEY_ID=AKIA...your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET_NAME=file-storage-app-2025
AWS_REGION=us-east-1

# NextAuth Configuration
NEXTAUTH_URL=http://54.236.38.189:3000
NEXTAUTH_SECRET=your-random-secret-key-here

# Gmail SMTP
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# Email Configuration
EMAIL_FROM=noreply@yourdomain.com

# App Configuration
NEXT_PUBLIC_APP_URL=http://54.236.38.189:3000
NODE_ENV=production
```

Save and exit: `Ctrl + X`, then `Y`, then `Enter`

---

## Step 5: CI/CD Pipeline with Jenkins

### 5.1 Deploy Jenkins with Docker

```bash
cd /home/ubuntu/app/file-storage-app

# Start Jenkins using Docker Compose
docker-compose -f docker-compose.minimal.yml up -d jenkins

# Wait for Jenkins to start (takes 2-3 minutes)
sleep 120

# Get initial admin password
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

Copy the password output.

### 5.2 Access Jenkins Web UI

1. Open browser: **http://54.236.38.189:8080**
2. Paste the initial admin password
3. Click **"Install suggested plugins"**
4. Wait for plugin installation (~5 minutes)

### 5.3 Create Admin User

1. Fill in the form:
   - **Username**: admin
   - **Password**: (choose strong password)
   - **Full name**: Your Name
   - **Email**: your-email@gmail.com
2. Click **"Save and Continue"**
3. **Jenkins URL**: `http://54.236.38.189:8080`
4. Click **"Save and Finish"** → **"Start using Jenkins"**

### 5.4 Install Required Jenkins Plugins

1. Go to **"Manage Jenkins"** → **"Plugins"**
2. Click **"Available plugins"**
3. Search and install:
   - ✅ **NodeJS Plugin**
   - ✅ **Docker Pipeline**
   - ✅ **GitHub Integration Plugin**
   - ✅ **Git Plugin**
4. Click **"Install"** (select "Restart Jenkins when installation is complete")

### 5.5 Configure NodeJS in Jenkins

1. Go to **"Manage Jenkins"** → **"Tools"**
2. Scroll to **"NodeJS installations"**
3. Click **"Add NodeJS"**
4. Configure:
   - **Name**: `NodeJS-20`
   - **Version**: Select `NodeJS 20.x.x`
   - ✅ Check "Install automatically"
5. Click **"Save"**

### 5.6 Configure GitHub Credentials

1. Go to **"Manage Jenkins"** → **"Credentials"**
2. Click **"(global)"** → **"Add Credentials"**
3. Configure:
   - **Kind**: Username with password
   - **Username**: Your GitHub username
   - **Password**: Your GitHub personal access token
   - **ID**: `github-credentials`
   - **Description**: GitHub Access
4. Click **"Create"**

**How to create GitHub token**:
1. Go to https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. Select scopes: `repo`, `admin:repo_hook`
4. Copy the token

### 5.7 Create Jenkins Pipeline Job

1. Click **"New Item"**
2. **Name**: `file-storage-app-pipeline`
3. Select **"Pipeline"**
4. Click **"OK"**

**Configuration**:

**General**:
- ✅ GitHub project
- **Project url**: `https://github.com/Shivam08058004/file-storage-app/`

**Build Triggers**:
- ✅ GitHub hook trigger for GITScm polling

**Pipeline**:
- **Definition**: Pipeline script from SCM
- **SCM**: Git
- **Repository URL**: `https://github.com/Shivam08058004/file-storage-app.git`
- **Credentials**: Select your GitHub credentials
- **Branch**: `*/main`
- **Script Path**: `Jenkinsfile.simple`

Click **"Save"**

### 5.8 Configure GitHub Webhook

1. Go to your GitHub repo: https://github.com/Shivam08058004/file-storage-app
2. Click **"Settings"** → **"Webhooks"** → **"Add webhook"**
3. Configure:
   - **Payload URL**: `http://54.236.38.189:8080/github-webhook/`
   - **Content type**: `application/json`
   - **Which events**: Just the push event
   - ✅ Active
4. Click **"Add webhook"**
5. Verify green checkmark ✅ appears

### 5.9 Test Pipeline

1. Go back to Jenkins
2. Click on **file-storage-app-pipeline**
3. Click **"Build Now"**
4. Watch the build progress in **"Build History"**
5. Click on the build number → **"Console Output"**

**Expected stages**:
1. ✅ Checkout
2. ✅ Environment Check
3. ✅ Install Dependencies & Build
4. ✅ Build Docker Image
5. ✅ Deploy
6. ✅ Health Check
7. ✅ Cleanup

If all stages pass: **SUCCESS** 🎉

---

## Step 6: Application Deployment

### 6.1 Manual Build and Deploy (First Time)

```bash
cd /home/ubuntu/app/file-storage-app

# Install dependencies
pnpm install

# Build Next.js application
pnpm build

# Build Docker image
docker build -t file-storage-app:latest .

# Copy .env file
cp /home/ubuntu/app/.env .env

# Run container
docker run -d \
  --name file-storage-app \
  --network host \
  --env-file .env \
  --restart always \
  file-storage-app:latest

# Check container status
docker ps | grep file-storage-app

# View logs
docker logs file-storage-app
```

You should see:
```
▲ Next.js 15.2.4
- Local:        http://localhost:3000
✓ Starting...
✓ Ready in 500ms
```

### 6.2 Verify Application is Running

```bash
# Test from server
curl http://localhost:3000

# Check container health
docker inspect file-storage-app | grep -A 5 "Health"
```

### 6.3 Access Application

Open in browser: **http://54.236.38.189:3000**

You should see the File Storage Application login page.

### 6.4 Automated Deployment (via Jenkins)

From now on, to deploy updates:

1. **Make code changes locally**
2. **Commit and push**:
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```
3. **Jenkins automatically**:
   - Detects the push (webhook)
   - Pulls latest code
   - Builds the app
   - Creates Docker image
   - Deploys to EC2
   - Runs health checks

Watch progress: **http://54.236.38.189:8080**

---

## Step 7: Monitoring with Prometheus

### 7.1 Deploy Monitoring Stack

```bash
cd /home/ubuntu/app/file-storage-app

# Make deployment script executable
chmod +x deploy-monitoring.sh

# Deploy monitoring
./deploy-monitoring.sh
```

### 7.2 Verify Monitoring Services

```bash
# Check running containers
docker ps

# Should show:
# - prometheus
# - node-exporter
# - cadvisor
```

### 7.3 Access Monitoring UIs

1. **Prometheus**: http://54.236.38.189:9090
2. **Node Exporter**: http://54.236.38.189:9100/metrics
3. **cAdvisor**: http://54.236.38.189:8081

### 7.4 Check Targets Status

Go to: **http://54.236.38.189:9090/targets**

All targets should show **"UP"**:
- ✅ prometheus (1/1 up)
- ✅ node-exporter (1/1 up)
- ✅ cadvisor (1/1 up)

---

## Important Prometheus Queries

### System Monitoring

#### 1. **CPU Usage (%)**
```promql
100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```
**Interpretation**: Shows overall CPU utilization. Alert if > 80%.

#### 2. **CPU Usage by Core**
```promql
100 - (avg by(cpu) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```
**Interpretation**: Per-core CPU usage. Useful for identifying core bottlenecks.

#### 3. **Memory Usage (%)**
```promql
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100
```
**Interpretation**: Percentage of memory in use. Alert if > 85%.

#### 4. **Available Memory (GB)**
```promql
node_memory_MemAvailable_bytes / 1024 / 1024 / 1024
```
**Interpretation**: Free memory available. Alert if < 500MB.

#### 5. **Total Memory (GB)**
```promql
node_memory_MemTotal_bytes / 1024 / 1024 / 1024
```
**Interpretation**: Total RAM capacity of the system.

#### 6. **Disk Usage (%)**
```promql
(1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})) * 100
```
**Interpretation**: Root filesystem usage. Alert if > 85%.

#### 7. **Disk Free Space (GB)**
```promql
node_filesystem_avail_bytes{mountpoint="/"} / 1024 / 1024 / 1024
```
**Interpretation**: Available disk space. Alert if < 5GB.

#### 8. **Disk I/O Read Rate (MB/s)**
```promql
rate(node_disk_read_bytes_total[5m]) / 1024 / 1024
```
**Interpretation**: Disk read throughput. High values indicate heavy read operations.

#### 9. **Disk I/O Write Rate (MB/s)**
```promql
rate(node_disk_written_bytes_total[5m]) / 1024 / 1024
```
**Interpretation**: Disk write throughput. High values during backups or heavy writes.

#### 10. **Network Traffic Received (MB/s)**
```promql
rate(node_network_receive_bytes_total{device!="lo"}[5m]) / 1024 / 1024
```
**Interpretation**: Incoming network traffic. Spike indicates high user activity.

#### 11. **Network Traffic Transmitted (MB/s)**
```promql
rate(node_network_transmit_bytes_total{device!="lo"}[5m]) / 1024 / 1024
```
**Interpretation**: Outgoing network traffic. High during file downloads.

#### 12. **System Load Average (1 minute)**
```promql
node_load1
```
**Interpretation**: Average system load. Should be < number of CPU cores.

#### 13. **System Load Average (5 minutes)**
```promql
node_load5
```
**Interpretation**: Medium-term load trend. Better indicator than load1.

#### 14. **System Uptime (hours)**
```promql
(time() - node_boot_time_seconds) / 3600
```
**Interpretation**: How long the system has been running without reboot.

### Container Monitoring

#### 15. **File Storage App - CPU Usage (%)**
```promql
rate(container_cpu_usage_seconds_total{name="file-storage-app"}[5m]) * 100
```
**Interpretation**: CPU used by your app container. Alert if consistently > 70%.

#### 16. **File Storage App - Memory Usage (MB)**
```promql
container_memory_usage_bytes{name="file-storage-app"} / 1024 / 1024
```
**Interpretation**: RAM used by app. Alert if approaching container limit.

#### 17. **File Storage App - Memory Limit (MB)**
```promql
container_spec_memory_limit_bytes{name="file-storage-app"} / 1024 / 1024
```
**Interpretation**: Maximum memory allocated to container.

#### 18. **File Storage App - Network Received (MB/s)**
```promql
rate(container_network_receive_bytes_total{name="file-storage-app"}[5m]) / 1024 / 1024
```
**Interpretation**: File upload traffic rate.

#### 19. **File Storage App - Network Transmitted (MB/s)**
```promql
rate(container_network_transmit_bytes_total{name="file-storage-app"}[5m]) / 1024 / 1024
```
**Interpretation**: File download traffic rate.

#### 20. **Jenkins - CPU Usage (%)**
```promql
rate(container_cpu_usage_seconds_total{name="jenkins"}[5m]) * 100
```
**Interpretation**: CPU used by Jenkins. Spikes during builds.

#### 21. **Jenkins - Memory Usage (MB)**
```promql
container_memory_usage_bytes{name="jenkins"} / 1024 / 1024
```
**Interpretation**: Jenkins RAM usage. Increase if frequently high.

#### 22. **Prometheus - Memory Usage (MB)**
```promql
container_memory_usage_bytes{name="prometheus"} / 1024 / 1024
```
**Interpretation**: Memory used by Prometheus itself.

#### 23. **All Containers - Memory Usage**
```promql
sum by(name) (container_memory_usage_bytes{name!=""} / 1024 / 1024)
```
**Interpretation**: Memory usage breakdown by container.

#### 24. **All Containers - CPU Usage**
```promql
sum by(name) (rate(container_cpu_usage_seconds_total{name!=""}[5m]) * 100)
```
**Interpretation**: CPU usage breakdown by container.

#### 25. **Container Restart Count**
```promql
container_restarts_total{name!=""}
```
**Interpretation**: Number of times containers have restarted. Alert if increasing.

### Application-Specific Queries

#### 26. **Total Containers Running**
```promql
count(container_last_seen{name!=""})
```
**Interpretation**: How many containers are currently active.

#### 27. **Filesystem Usage per Mount**
```promql
100 - ((node_filesystem_avail_bytes * 100) / node_filesystem_size_bytes)
```
**Interpretation**: Usage percentage for all mounted filesystems.

#### 28. **Swap Memory Usage (%)**
```promql
(1 - (node_memory_SwapFree_bytes / node_memory_SwapTotal_bytes)) * 100
```
**Interpretation**: Swap usage. High values indicate RAM pressure.

#### 29. **Open File Descriptors**
```promql
node_filefd_allocated
```
**Interpretation**: Number of open files. Alert if approaching system limit.

#### 30. **Network Errors (Receive)**
```promql
rate(node_network_receive_errs_total[5m])
```
**Interpretation**: Network errors. Should be 0 in healthy system.

### Performance Alerts (Example Thresholds)

#### 31. **High CPU Alert**
```promql
100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
```
**Use**: Alert when CPU > 80% for 5 minutes.

#### 32. **High Memory Alert**
```promql
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
```
**Use**: Alert when memory > 85%.

#### 33. **Low Disk Space Alert**
```promql
(1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})) * 100 > 85
```
**Use**: Alert when disk > 85% full.

#### 34. **Container Down Alert**
```promql
absent(container_last_seen{name="file-storage-app"})
```
**Use**: Alert when app container is not running.

#### 35. **High Network Traffic Alert**
```promql
rate(node_network_receive_bytes_total{device!="lo"}[5m]) / 1024 / 1024 > 100
```
**Use**: Alert when incoming traffic > 100 MB/s.

---

## Testing & Verification

### Test 1: User Registration

1. Go to http://54.236.38.189:3000
2. Click **"Sign Up"**
3. Enter email and password
4. Click **"Create Account"**
5. **Expected**: "Verification email sent" message

### Test 2: Email Verification

1. Check your email inbox
2. Find verification email
3. Click verification link
4. **Expected**: "Email verified successfully"

### Test 3: User Login

1. Go to http://54.236.38.189:3000
2. Enter credentials
3. Click **"Sign In"**
4. **Expected**: Redirected to dashboard

### Test 4: File Upload (S3 Integration)

1. Click **"Upload"** button
2. Select a file (< 100 MB)
3. Click **"Upload"**
4. **Expected**: 
   - File appears in grid
   - Progress bar shows 100%
   - File stored in S3
   - Metadata saved in Supabase

**Verify in S3**:
```bash
aws s3 ls s3://file-storage-app-2025/ --recursive
```

**Verify in Supabase**:
```sql
SELECT * FROM files ORDER BY created_at DESC LIMIT 5;
```

### Test 5: File Operations

**Download**:
1. Click file → **"Download"**
2. **Expected**: File downloads from S3

**Share**:
1. Click file → **"Share"**
2. Copy share link
3. Open in incognito window
4. **Expected**: Can download without login

**Delete**:
1. Click file → **"Delete"**
2. Confirm deletion
3. **Expected**: 
   - File removed from UI
   - Deleted from S3
   - Removed from Supabase

### Test 6: Folder Management

1. Click **"New Folder"**
2. Enter folder name
3. **Expected**: Folder created with `.foldermarker` in S3

### Test 7: Storage Quota

1. Check storage indicator in top bar
2. Upload files
3. **Expected**: Storage usage updates in real-time

### Test 8: CI/CD Pipeline

1. Make a code change locally
2. Commit and push:
   ```bash
   echo "// Test change" >> app/page.tsx
   git add .
   git commit -m "Test CI/CD"
   git push origin main
   ```
3. **Expected**: 
   - Jenkins starts build automatically
   - Build completes successfully
   - App redeployed with changes

### Test 9: Monitoring

1. Go to http://54.236.38.189:9090
2. Run query:
   ```promql
   100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
   ```
3. **Expected**: Graph showing CPU usage

---

## Maintenance & Operations

### Daily Operations

**Check Application Health**:
```bash
# Container status
docker ps | grep file-storage-app

# Application logs
docker logs file-storage-app --tail=50

# Resource usage
docker stats file-storage-app --no-stream
```

**Check Disk Space**:
```bash
df -h
```

**Check Memory**:
```bash
free -h
```

### Weekly Maintenance

**Update System Packages**:
```bash
sudo apt update && sudo apt upgrade -y
```

**Clean Docker Resources**:
```bash
# Remove unused images
docker image prune -a -f

# Remove unused volumes
docker volume prune -f

# Remove unused networks
docker network prune -f

# Full system cleanup
docker system prune -a -f
```

**Review Logs**:
```bash
# Application logs
docker logs file-storage-app --since 7d > /tmp/app-logs.txt

# Jenkins logs
docker logs jenkins --since 7d > /tmp/jenkins-logs.txt
```

### Monthly Maintenance

**Backup Database** (Supabase):
1. Go to Supabase Dashboard
2. Project → Database → Backups
3. Download latest backup

**Check S3 Storage Costs**:
1. AWS Console → S3 → Bucket → Metrics
2. Review storage usage and costs

**Review Monitoring Alerts**:
1. Prometheus → Alerts
2. Investigate any recurring issues

**Update Dependencies**:
```bash
cd /home/ubuntu/app/file-storage-app
pnpm update
git add pnpm-lock.yaml
git commit -m "Update dependencies"
git push origin main
```

### Container Management

**Restart Application**:
```bash
docker restart file-storage-app
```

**Stop Application**:
```bash
docker stop file-storage-app
```

**Start Application**:
```bash
docker start file-storage-app
```

**Rebuild and Redeploy**:
```bash
cd /home/ubuntu/app/file-storage-app
git pull origin main
pnpm install
pnpm build
docker build -t file-storage-app:latest .
docker stop file-storage-app
docker rm file-storage-app
docker run -d --name file-storage-app --network host --env-file /home/ubuntu/app/.env --restart always file-storage-app:latest
```

**View Real-Time Logs**:
```bash
docker logs -f file-storage-app
```

### Monitoring with Prometheus

**Access Dashboards**:
- Prometheus: http://54.236.38.189:9090
- cAdvisor: http://54.236.38.189:8081

**Export Metrics**:
```bash
curl http://54.236.38.189:9090/api/v1/query?query=up
```

---

## Troubleshooting

### Issue 1: Application Not Starting

**Symptoms**: Container exits immediately

**Debug**:
```bash
docker logs file-storage-app
```

**Common Causes**:
- Missing/invalid `.env` file
- Port 3000 already in use
- Insufficient memory

**Solutions**:
```bash
# Check .env file
cat /home/ubuntu/app/.env

# Check port usage
sudo netstat -tulpn | grep :3000

# Kill process on port 3000
sudo kill -9 $(sudo lsof -t -i:3000)

# Increase swap
sudo fallocate -l 8G /swapfile
```

### Issue 2: Cannot Connect to Database

**Symptoms**: "Failed to connect to Supabase"

**Debug**:
```bash
# Test Supabase connection
curl https://your-project.supabase.co/rest/v1/
```

**Common Causes**:
- Invalid Supabase credentials
- Network firewall blocking
- Supabase project paused

**Solutions**:
1. Verify credentials in `.env`
2. Check Supabase project status
3. Verify API keys haven't expired

### Issue 3: S3 Upload Fails

**Symptoms**: "Failed to upload file"

**Debug**:
```bash
# Test S3 access
aws s3 ls s3://file-storage-app-2025/
```

**Common Causes**:
- Invalid AWS credentials
- Insufficient S3 permissions
- Network connectivity issues

**Solutions**:
1. Verify AWS credentials in `.env`
2. Check IAM user permissions
3. Test S3 bucket policy

### Issue 4: Email Not Sending

**Symptoms**: No verification email received

**Debug**:
```bash
# Check application logs
docker logs file-storage-app | grep -i email
```

**Common Causes**:
- Invalid Gmail app password
- Gmail blocking less secure apps
- Rate limit exceeded

**Solutions**:
1. Regenerate Gmail app password
2. Check spam folder
3. Verify GMAIL_USER and GMAIL_APP_PASSWORD in `.env`

### Issue 5: Jenkins Build Fails

**Symptoms**: Pipeline fails at build stage

**Debug**:
1. Jenkins → Job → Last build → Console Output

**Common Causes**:
- Node.js not configured
- Git credentials expired
- Docker daemon not accessible

**Solutions**:
```bash
# Restart Docker
sudo systemctl restart docker

# Restart Jenkins
docker restart jenkins

# Check Docker socket permissions
sudo chmod 666 /var/run/docker.sock
```

### Issue 6: High Memory Usage

**Symptoms**: System becomes slow

**Debug**:
```bash
# Check memory usage
free -h

# Check container memory
docker stats --no-stream
```

**Solutions**:
```bash
# Restart containers
docker restart file-storage-app jenkins

# Clear system cache
sudo sync && sudo sysctl -w vm.drop_caches=3

# Increase swap
sudo dd if=/dev/zero of=/swapfile bs=1M count=4096
```

### Issue 7: Prometheus Not Scraping

**Symptoms**: Targets show "DOWN"

**Debug**:
1. Prometheus → Status → Targets
2. Check container logs:
   ```bash
   docker logs prometheus
   ```

**Solutions**:
```bash
# Restart monitoring stack
cd /home/ubuntu/app/file-storage-app
docker-compose -f docker-compose.monitoring.yml restart

# Verify network connectivity
docker network ls
docker network inspect app-network
```

### Issue 8: GitHub Webhook Not Triggering

**Symptoms**: Push to GitHub doesn't trigger Jenkins build

**Debug**:
1. GitHub → Repository → Settings → Webhooks
2. Click webhook → Recent Deliveries

**Solutions**:
1. Verify webhook URL: `http://54.236.38.189:8080/github-webhook/`
2. Check Jenkins is accessible from internet
3. Verify security group allows port 8080
4. Re-create webhook

### Issue 9: Port Already in Use

**Symptoms**: "Address already in use"

**Debug**:
```bash
sudo netstat -tulpn | grep :3000
```

**Solution**:
```bash
# Kill process
sudo kill -9 $(sudo lsof -t -i:3000)

# Or use different port in docker run
docker run -p 3001:3000 ...
```

### Issue 10: SSL/TLS Errors

**Symptoms**: "certificate verification failed"

**Solution**:
```bash
# Update CA certificates
sudo apt update
sudo apt install -y ca-certificates
sudo update-ca-certificates
```

---

## Security Best Practices

### 1. Environment Variables
- ✅ Never commit `.env` to Git
- ✅ Use strong, random secrets for NEXTAUTH_SECRET
- ✅ Rotate AWS credentials regularly
- ✅ Use IAM roles instead of access keys when possible

### 2. EC2 Instance
- ✅ Keep Ubuntu updated
- ✅ Use SSH key authentication only (disable password)
- ✅ Configure firewall (ufw) properly
- ✅ Regular security audits

### 3. S3 Bucket
- ✅ Enable versioning for file recovery
- ✅ Use bucket policies instead of ACLs
- ✅ Enable logging for audit trail
- ✅ Consider encryption at rest

### 4. Application
- ✅ Use HTTPS in production (add Let's Encrypt)
- ✅ Implement rate limiting
- ✅ Validate file uploads (type, size, content)
- ✅ Sanitize user inputs

### 5. Database
- ✅ Use RLS (Row Level Security) in Supabase
- ✅ Regular backups
- ✅ Separate read/write credentials
- ✅ Monitor for suspicious queries

---

## Cost Optimization

### Free Tier Limits

**AWS EC2**:
- 750 hours/month (t2.micro) - **You're using c7i-flex.large (paid)**

**AWS S3**:
- 5 GB storage
- 20,000 GET requests
- 2,000 PUT requests

**Supabase**:
- 500 MB database
- 1 GB file storage
- 50,000 monthly active users

**Gmail**:
- 500 emails/day (free)

### Current Estimated Costs

**EC2 c7i-flex.large**:
- ~$0.10/hour
- ~$72/month (24/7)

**S3 Storage**:
- $0.023/GB/month
- Example: 10 GB = $0.23/month

**Data Transfer**:
- First 100 GB out: Free
- After: $0.09/GB

**Total Estimated**: ~$75-80/month

### Cost Reduction Tips

1. **Use t3.small instead of c7i-flex.large**: Save ~$40/month
2. **Use S3 Intelligent-Tiering**: Automatic cost optimization
3. **Stop EC2 when not needed**: Save during testing/development
4. **Set up CloudWatch alarms**: Get notified of unexpected costs
5. **Delete old S3 files**: Implement lifecycle policies

---

## Future Enhancements

### 1. Add HTTPS (SSL/TLS)
- Use Let's Encrypt free SSL certificates
- Configure Nginx reverse proxy
- Update NEXTAUTH_URL to https://

### 2. Add Domain Name
- Register domain (e.g., Namecheap, GoDaddy)
- Point DNS to EC2 IP
- Update application URLs

### 3. Database Optimization
- Add Redis for caching
- Implement connection pooling
- Add database indexes

### 4. Add Grafana (Free Visualization)
- Better dashboards than Prometheus UI
- Pre-built dashboards
- Alert management

### 5. Implement CDN
- Use CloudFront for faster file delivery
- Cache static assets
- Reduce S3 data transfer costs

### 6. Auto-Scaling
- Create AMI of configured EC2
- Set up Auto Scaling Group
- Use Application Load Balancer

### 7. Backup Automation
- Automated database backups
- S3 versioning
- Cross-region replication

### 8. Enhanced Monitoring
- Application performance monitoring (APM)
- Error tracking (Sentry)
- User analytics

---

## Conclusion

You have successfully deployed a production-ready file storage application with:

✅ **Complete AWS infrastructure**
- EC2 instance running Ubuntu
- S3 bucket for file storage
- IAM user with secure credentials
- Proper security groups

✅ **Automated CI/CD pipeline**
- Jenkins with GitHub webhooks
- Docker containerization
- Automated testing and deployment

✅ **Full-stack application**
- Next.js 15 frontend
- Supabase PostgreSQL database
- AWS S3 file storage
- Email authentication

✅ **Production monitoring**
- Prometheus metrics collection
- System and container monitoring
- Real-time dashboards

✅ **Security best practices**
- Environment-based configuration
- Secure authentication
- Firewall configuration
- IAM permissions

**Your application is now live and accessible at**:
- **App**: http://54.236.38.189:3000
- **Jenkins**: http://54.236.38.189:8080
- **Prometheus**: http://54.236.38.189:9090

---

## Quick Reference Commands

```bash
# Application Management
docker ps | grep file-storage-app
docker logs file-storage-app
docker restart file-storage-app

# Jenkins Management
docker logs jenkins
docker restart jenkins

# Monitoring Management
docker-compose -f docker-compose.monitoring.yml ps
docker-compose -f docker-compose.monitoring.yml restart

# System Health
free -h
df -h
docker stats --no-stream

# Git Operations
git pull origin main
git add .
git commit -m "Your message"
git push origin main

# Cleanup
docker system prune -a -f
sudo apt autoremove -y
```

---

## Support & Resources

**Documentation**:
- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- AWS S3: https://docs.aws.amazon.com/s3/
- Docker: https://docs.docker.com
- Prometheus: https://prometheus.io/docs/

**AWS Console**: https://console.aws.amazon.com
**GitHub Repository**: https://github.com/Shivam08058004/file-storage-app
**Supabase Dashboard**: https://app.supabase.com

---

**Last Updated**: October 30, 2025  
**Version**: 1.0  
**Author**: Shivam Singh  
**Project**: File Storage Application
