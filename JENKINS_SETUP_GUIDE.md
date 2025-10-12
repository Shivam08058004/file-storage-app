# Jenkins CI/CD Pipeline Setup Guide

Complete guide to setup automated deployment for your file storage app.

---

## Prerequisites Check ✅

Your EC2 already has:
- ✅ Jenkins container running on port 8080
- ✅ Docker and Docker Compose installed
- ✅ App repository at `/home/ubuntu/app`

---

## Phase 1: Access Jenkins (5 minutes)

### Step 1: Get Initial Admin Password

SSH to your EC2:
```bash
ssh -i your-key.pem ubuntu@54.89.157.18
```

Get the Jenkins admin password:
```bash
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

**Copy this password!** You'll need it in the next step.

### Step 2: Access Jenkins Web UI

Open in your browser:
```
http://54.89.157.18:8080
```

You should see the Jenkins unlock screen.

### Step 3: Unlock Jenkins

1. Paste the admin password from Step 1
2. Click "Continue"

---

## Phase 2: Initial Setup (10 minutes)

### Step 1: Install Plugins

When asked "Customize Jenkins":
- **Select**: "Install suggested plugins" ✅

This will install:
- Git plugin
- GitHub plugin
- Pipeline plugin
- Docker plugin
- And more...

Wait 3-5 minutes for installation to complete.

### Step 2: Create Admin User

Fill in:
- **Username**: `admin` (or your choice)
- **Password**: Choose a strong password (save it!)
- **Full name**: Your name
- **Email**: Your email

Click "Save and Continue"

### Step 3: Instance Configuration

- **Jenkins URL**: `http://54.89.157.18:8080/`
- Click "Save and Finish"
- Click "Start using Jenkins"

🎉 **Jenkins is now ready!**

---

## Phase 3: Install Required Plugins (5 minutes)

### Navigate to Plugin Manager

1. Click "Manage Jenkins" (left sidebar)
2. Click "Plugins"
3. Click "Available plugins" tab

### Install These Plugins

Search and select (check the box):
- ✅ **Docker Pipeline** - For Docker commands in pipeline
- ✅ **GitHub Integration** - For GitHub webhooks
- ✅ **NodeJS** - For running Node.js/pnpm commands

Click "Install" (bottom of page)

Select: "Restart Jenkins when installation is complete and no jobs are running"

Wait 2-3 minutes for restart.

---

## Phase 4: Configure Node.js in Jenkins (5 minutes)

### Step 1: Go to Global Tool Configuration

1. Click "Manage Jenkins"
2. Click "Tools"
3. Scroll down to "NodeJS installations"

### Step 2: Add NodeJS

1. Click "Add NodeJS"
2. Configure:
   - **Name**: `NodeJS-20`
   - **Install automatically**: ✅ Checked
   - **Version**: Select "NodeJS 20.x" (latest)
3. Click "Save"

---

## Phase 5: Setup Docker Permissions (IMPORTANT!)

The Jenkins container needs access to Docker on the host.

### On your EC2 instance:

```bash
# Check Jenkins user ID in container
docker exec jenkins id

# Give Jenkins access to Docker socket
sudo chmod 666 /var/run/docker.sock

# Make it permanent (survives reboot)
sudo usermod -aG docker $(whoami)
```

### Verify Docker Access

```bash
# Test if Jenkins can access Docker
docker exec jenkins docker ps

# You should see your running containers
```

---

## Phase 6: Create Pipeline Job (10 minutes)

### Step 1: Create New Job

1. Click "New Item" (left sidebar)
2. **Item name**: `file-storage-app`
3. **Type**: Select "Pipeline"
4. Click "OK"

### Step 2: Configure General Settings

In the job configuration page:

**General section:**
- ✅ Check "GitHub project"
- **Project url**: `https://github.com/Shivam08058004/file-storage-app/`

**Build Triggers section:**
- ✅ Check "GitHub hook trigger for GITScm polling"

### Step 3: Configure Pipeline

**Pipeline section:**
- **Definition**: Select "Pipeline script from SCM"
- **SCM**: Select "Git"

**Repositories:**
- **Repository URL**: `https://github.com/Shivam08058004/file-storage-app.git`
- **Credentials**: Leave as "- none -" (public repo)
- **Branch Specifier**: `*/main`

**Script Path:**
- Enter: `Jenkinsfile.simple`

Click "Save"

---

## Phase 7: Setup GitHub Webhook (5 minutes)

This makes GitHub trigger Jenkins on every push!

### Step 1: Go to GitHub Repository Settings

1. Go to: https://github.com/Shivam08058004/file-storage-app
2. Click "Settings" tab
3. Click "Webhooks" (left sidebar)
4. Click "Add webhook"

### Step 2: Configure Webhook

Fill in:
- **Payload URL**: `http://54.89.157.18:8080/github-webhook/`
  - ⚠️ **Important**: Include the trailing slash `/`
- **Content type**: `application/json`
- **Secret**: Leave empty
- **Which events**: Select "Just the push event"
- ✅ **Active**: Checked

Click "Add webhook"

### Step 3: Verify Webhook

After adding, you should see:
- Green checkmark ✅ if successful
- Red X ❌ if failed (check Jenkins is accessible)

---

## Phase 8: Test the Pipeline! (5 minutes)

### Method 1: Manual Trigger (First Test)

1. Go to Jenkins Dashboard
2. Click on `file-storage-app` job
3. Click "Build Now" (left sidebar)
4. Watch the build progress:
   - Click on the build number (e.g., "#1")
   - Click "Console Output"
   - Watch logs in real-time

**Expected stages:**
1. ✅ Checkout
2. ✅ Environment Check
3. ✅ Install Dependencies & Build
4. ✅ Build Docker Image
5. ✅ Deploy
6. ✅ Health Check
7. ✅ Cleanup

**Build should take: 3-5 minutes**

### Method 2: Automatic Trigger (Real Test)

Let's make a small change to trigger the webhook:

**On your local machine:**

```powershell
cd C:\Users\Shivam\OneDrive\Desktop\file-storage-app

# Make a small change (add comment to README or any file)
# For example, create a test file:
echo "# Jenkins CI/CD Test" > JENKINS_TEST.md

git add JENKINS_TEST.md
git commit -m "test: Trigger Jenkins CI/CD pipeline"
git push origin main
```

**Watch Jenkins:**
1. Go to Jenkins Dashboard
2. You should see a new build start automatically within 5-10 seconds!
3. Click on the build to watch progress

🎉 **If it auto-triggers, your CI/CD is working!**

---

## Phase 9: Verify Deployment

### Check Application Updated

After build succeeds:

```bash
# On EC2, check container logs
docker compose logs nextjs-app --tail=50

# Check app is running
curl http://localhost:3000/

# Check in browser
# Visit: http://54.89.157.18:3000
```

---

## Understanding the Pipeline

### What Happens on Every Git Push:

1. **GitHub → Webhook** → Triggers Jenkins
2. **Jenkins pulls** latest code from GitHub
3. **Installs dependencies** with pnpm
4. **Builds Next.js** app (creates `.next` folder)
5. **Builds Docker image** with new code
6. **Stops old container** (graceful shutdown)
7. **Starts new container** with updated code
8. **Health check** verifies app is working
9. **Cleanup** removes old Docker images
10. **Notifies** you of success/failure

**Total deployment time: 3-5 minutes**

---

## Troubleshooting

### Issue: Build Fails at "Permission Denied (Docker)"

**Solution:**
```bash
# On EC2
sudo chmod 666 /var/run/docker.sock
docker exec jenkins docker ps  # Test it works
```

### Issue: Build Fails at "pnpm: command not found"

**Solution:**
```bash
# Install pnpm globally on EC2
npm install -g pnpm

# Or install in Jenkins container
docker exec -u root jenkins npm install -g pnpm
```

### Issue: GitHub Webhook Not Triggering

**Solution:**
1. Check Jenkins is accessible: `curl http://54.89.157.18:8080`
2. Check webhook has green checkmark on GitHub
3. Check AWS Security Group allows port 8080
4. Try "Redeliver" on webhook in GitHub settings

### Issue: Build Succeeds but App Not Updated

**Solution:**
```bash
# Check container was recreated
docker ps

# Check container logs
docker compose logs nextjs-app

# Manually restart
cd ~/app
docker compose restart nextjs-app
```

### Issue: Out of Disk Space

**Solution:**
```bash
# Clean up Docker
docker system prune -a -f

# Remove old images
docker image prune -a -f

# Check space
df -h
```

---

## Advanced: Pipeline Customization

### Add Slack Notifications

Edit `Jenkinsfile.simple`, in `post` section:
```groovy
success {
    slackSend(
        color: 'good',
        message: "Deployment successful: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
    )
}
```

### Add Email Notifications

In Jenkins:
1. Manage Jenkins → System
2. Configure email settings
3. Add to Jenkinsfile:
```groovy
post {
    failure {
        emailext(
            subject: "Build Failed: ${env.JOB_NAME}",
            body: "Check Jenkins for details",
            to: "your-email@example.com"
        )
    }
}
```

### Run Tests Before Deploy

Add stage in Jenkinsfile:
```groovy
stage('Tests') {
    steps {
        sh 'pnpm test'
    }
}
```

---

## Benefits of This Setup

✅ **Automated Deployment** - Push to GitHub, auto-deploys to EC2  
✅ **Fast Feedback** - Know if build fails within minutes  
✅ **Consistent** - Same build process every time  
✅ **Rollback Ready** - Easy to see what was deployed  
✅ **Professional** - Industry-standard CI/CD practice  
✅ **Portfolio Ready** - Great for resume and interviews  

---

## Pipeline Flow Diagram

```
┌─────────────┐
│  Git Push   │
│  to GitHub  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   GitHub    │
│   Webhook   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Jenkins   │
│   Trigger   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Checkout   │
│    Code     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Install   │
│Dependencies │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Build    │
│   Next.js   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Build    │
│   Docker    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Deploy    │
│  Container  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Health    │
│    Check    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Success   │
│     🎉      │
└─────────────┘
```

---

## Next Steps After Setup

1. **Make a change** to test auto-deployment
2. **Monitor builds** for a few days
3. **Setup notifications** (email/Slack)
4. **Add tests** to pipeline
5. **Document** the CI/CD process in your project report

---

## Quick Reference Commands

### On EC2:

```bash
# View Jenkins logs
docker logs jenkins -f

# Restart Jenkins
docker restart jenkins

# Check pipeline workspace
ls /var/jenkins_home/workspace/file-storage-app

# Manual deployment (if pipeline fails)
cd ~/app
./deploy.sh
```

### On Local Machine:

```bash
# Trigger deployment
git add .
git commit -m "feat: your changes"
git push origin main

# Watch Jenkins build at:
# http://54.89.157.18:8080
```

---

**You're all set! Push to GitHub and watch the magic happen! 🚀**
