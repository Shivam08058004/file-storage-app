# Step-by-Step AWS EC2 Deployment Guide

## 📋 Overview
We'll set up a new EC2 instance and deploy your file storage application from scratch.

---

## ✅ STEP 1: Launch EC2 Instance

### What You'll Do:
Create a new Ubuntu EC2 instance on AWS.

### Instructions:

1. **Go to AWS Console (NEW AWS ACCOUNT):**
   - Open https://console.aws.amazon.com/
   - Sign in to your **new AWS account**
   - Select region: **us-east-1** (US East - N. Virginia)

2. **Navigate to EC2:**
   - Search for "EC2" in the search bar
   - Click on "EC2" service

3. **Launch Instance:**
   - Click the orange "Launch Instance" button

4. **Configure Instance:**
   
   **Name and Tags:**
   - Name: `file-storage-app-production`

   **Application and OS Images (AMI):**
   - Select: **Ubuntu Server 24.04 LTS**
   - Architecture: 64-bit (x86)

   **Instance Type:**
   - Select: **t3.medium** (2 vCPU, 4 GB RAM)
   - OR **t3.small** (2 vCPU, 2 GB RAM) if on budget

   **Key Pair:**
   - If you have existing key pair: Select it
   - If new: Click "Create new key pair"
     - Name: `file-storage-app-key`
     - Key pair type: RSA
     - Private key format: .pem (for Mac/Linux) or .ppk (for Windows PuTTY)
     - Click "Create key pair" and **SAVE THE FILE SECURELY**

   **Network Settings (Click "Edit"):**
   - Auto-assign public IP: **Enable**
   - Firewall (Security Groups): Create new security group
   - Security group name: `file-storage-app-sg`
   - Description: `Security group for file storage application`
   
   **Add these Inbound Rules:**
   - SSH (22) - Source: My IP (or 0.0.0.0/0 for anywhere)
   - Custom TCP (3000) - Source: 0.0.0.0/0 - Description: Next.js App
   - Custom TCP (8080) - Source: 0.0.0.0/0 - Description: Jenkins
   - HTTP (80) - Source: 0.0.0.0/0 - Description: HTTP (future use)
   - HTTPS (443) - Source: 0.0.0.0/0 - Description: HTTPS (future use)

   **Configure Storage:**
   - Size: **30 GB** (minimum)
   - Volume type: gp3

5. **Review and Launch:**
   - Click "Launch Instance"
   - Wait for instance to start (~2 minutes)

6. **Get Public IP:**
   - Click on your instance ID
   - Copy the **Public IPv4 address** (e.g., `54.236.38.189`)
   - **SAVE THIS IP ADDRESS SECURELY** - you'll need it throughout deployment
   - This IP will be used in your `.env` file and to access the application

---

### ✅ Completion Checklist:
- [ ] EC2 instance is running
- [ ] Instance state shows "Running" with green dot
- [ ] You have the Public IPv4 address saved
- [ ] You have the .pem or .ppk key file downloaded

---

**Once you complete Step 1, let me know and we'll move to Step 2: Connecting to Your Instance**

---

## ✅ STEP 2: Connect to Your EC2 Instance via SSH

### What You'll Do:
Connect to your EC2 instance from your Windows machine using PowerShell.

### Prerequisites:
- Your EC2 Public IP address (from Step 1)
- Your .pem key file downloaded

### Instructions:

1. **Move Your Key File to a Safe Location:**
   - Open PowerShell as Administrator
   - Create a safe directory for SSH keys:
   ```powershell
   mkdir C:\Users\Shivam\.ssh
   ```
   
   - Move your .pem file there (replace `Downloads` path if different):
   ```powershell
   Move-Item "$env:USERPROFILE\Downloads\file-storage-app-key.pem" "$env:USERPROFILE\.ssh\file-storage-app-key.pem"
   ```

2. **Set Correct Permissions on Key File:**
   ```powershell
   # Remove inheritance and set permissions for your user only
   icacls "$env:USERPROFILE\.ssh\file-storage-app-key.pem" /inheritance:r
   icacls "$env:USERPROFILE\.ssh\file-storage-app-key.pem" /grant:r "$env:USERNAME`:R"
   ```

3. **Connect to EC2 Instance:**
   - Replace `YOUR_IP_HERE` with your actual EC2 Public IP
   ```powershell
   ssh -i "$env:USERPROFILE\.ssh\file-storage-app-key.pem" ubuntu@YOUR_IP_HERE
   ```
   
   - Example (replace with your actual EC2 IP):
   ```powershell
   ssh -i "$env:USERPROFILE\.ssh\file-storage-app-key.pem" ubuntu@YOUR_EC2_IP
   ```

4. **First Connection:**
   - You'll see a message: "Are you sure you want to continue connecting?"
   - Type `yes` and press Enter

5. **Verify Connection:**
   - You should see Ubuntu welcome message
   - Your prompt should change to: `ubuntu@ip-xxx-xxx-xxx-xxx:~$`

### Alternative: Use Windows Terminal or PuTTY
If PowerShell SSH doesn't work, you can use:
- **Windows Terminal** (recommended, built into Windows 11)
- **PuTTY** (convert .pem to .ppk using PuTTYgen first)

---

### ✅ Completion Checklist:
- [ ] SSH key file moved to .ssh folder
- [ ] Successfully connected to EC2 instance
- [ ] You see the Ubuntu prompt: `ubuntu@ip-xxx-xxx-xxx-xxx:~$`

---

### 🔧 Troubleshooting:
- **"Permission denied"**: Re-run the icacls commands
- **"Connection refused"**: Check Security Group has port 22 open for your IP
- **"Host key verification failed"**: Delete old entry from `~/.ssh/known_hosts`

---

**Once you're connected and see the Ubuntu prompt, let me know and we'll move to Step 3: Installing Dependencies**

---

## ✅ STEP 3: Install Required Software on EC2

### What You'll Do:
Install Docker, Docker Compose, Node.js, pnpm, and Git on your Ubuntu instance.

### Instructions:

**Copy and paste these commands one by one into your SSH terminal:**

1. **Update System Packages:**
   ```bash
   sudo apt-get update && sudo apt-get upgrade -y
   ```
   (This may take 2-3 minutes)

2. **Install Docker:**
   ```bash
   sudo apt-get install -y ca-certificates curl
   sudo install -m 0755 -d /etc/apt/keyrings
   sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
   sudo chmod a+r /etc/apt/keyrings/docker.asc
   ```

   ```bash
   echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
   ```

   ```bash
   sudo apt-get update
   sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
   ```

3. **Add ubuntu user to docker group:**
   ```bash
   sudo usermod -aG docker ubuntu
   ```

4. **Install Docker Compose standalone:**
   ```bash
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

5. **Install Node.js 20:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

6. **Install pnpm:**
   ```bash
   sudo npm install -g pnpm
   ```

7. **Install Git:**
   ```bash
   sudo apt-get install -y git
   ```

8. **Install useful tools:**
   ```bash
   sudo apt-get install -y htop wget vim net-tools
   ```

9. **Create app directory:**
   ```bash
   sudo mkdir -p /home/ubuntu/app
   sudo chown ubuntu:ubuntu /home/ubuntu/app
   ```

10. **Configure firewall (UFW):**
    ```bash
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow 3000/tcp
    sudo ufw allow 8080/tcp
    sudo ufw --force enable
    ```

11. **Create swap file (helps with memory):**
    ```bash
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    ```

12. **Logout and login again (to apply docker group):**
    ```bash
    exit
    ```

13. **Reconnect via SSH** (from your PowerShell):
    ```powershell
    ssh -i "$env:USERPROFILE\.ssh\file-storage-app-key.pem" ubuntu@YOUR_IP_HERE
    ```

14. **Verify installations:**
    ```bash
    docker --version
    docker-compose --version
    node --version
    pnpm --version
    git --version
    ```

---

### ✅ Completion Checklist:
- [ ] All commands ran without errors
- [ ] You've logged out and back in
- [ ] `docker --version` shows version (e.g., Docker version 24.x.x)
- [ ] `node --version` shows v20.x.x
- [ ] `pnpm --version` shows version number
- [ ] `git --version` shows version number

---

### Expected Output:
```
Docker version 24.0.7, build afdd53b
Docker Compose version v2.23.0
v20.11.0
9.0.0
git version 2.43.0
```

---

**Once all software is installed and verified, let me know and we'll move to Step 4: Setting Up Environment Variables**

---

## ✅ STEP 4: Set Up Environment Variables

### What You'll Do:
Create a `.env` file with all your application credentials (Supabase, AWS S3, Email, etc.).

### Prerequisites:
You need to have these credentials ready:
- **Supabase**: URL, Anon Key, Service Role Key
- **AWS S3**: Access Key ID, Secret Access Key, Bucket Name, Region
- **NextAuth**: Secret (we'll generate this)
- **Gmail**: Email address, App Password
- **Google OAuth** (optional): Client ID, Client Secret

### Instructions:

**In your SSH terminal, run these commands:**

1. **Navigate to app directory:**
   ```bash
   cd /home/ubuntu/app
   ```

2. **Create .env file:**
   ```bash
   nano .env
   ```

3. **Copy and paste this template** (nano editor will open):
   ```bash
   # Database (Supabase)
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

   # AWS S3 Storage (NEW AWS ACCOUNT)
   # Get these from: AWS Console → IAM → Users → file-storage-app-user → Security Credentials
   AWS_ACCESS_KEY_ID=AKIA...
   AWS_SECRET_ACCESS_KEY=your-secret-access-key
   AWS_S3_BUCKET_NAME=file-storage-app-2025
   AWS_REGION=us-east-1

   # NextAuth
   # Replace YOUR_EC2_IP with your actual EC2 public IP address
   NEXTAUTH_URL=http://YOUR_EC2_IP:3000
   # Generate with: openssl rand -base64 32
   NEXTAUTH_SECRET=your-generated-secret-here

   # Google OAuth (Optional)
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-...

   # Email (Gmail SMTP)
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your-16-char-app-password
   EMAIL_FROM=noreply@yourdomain.com

   # App URL (for share links)
   NEXT_PUBLIC_APP_URL=http://YOUR_EC2_IP:3000
   ```

4. **Replace ALL the placeholder values** with your actual credentials:
   - Replace `YOUR_PROJECT` with your Supabase project reference
   - Replace `YOUR_EC2_IP` with your EC2 Public IP
   - Replace all `your-...` placeholders with real values

5. **Generate NEXTAUTH_SECRET:**
   - Open another SSH terminal window (keep nano open)
   - Run: `openssl rand -base64 32`
   - Copy the output and paste it as `NEXTAUTH_SECRET` value in nano

6. **Save and exit nano:**
   - Press `Ctrl + O` (to save)
   - Press `Enter` (to confirm)
   - Press `Ctrl + X` (to exit)

7. **Verify .env file was created:**
   ```bash
   ls -la /home/ubuntu/app/.env
   ```

8. **Set correct permissions:**
   ```bash
   chmod 600 /home/ubuntu/app/.env
   ```

---

### ✅ Completion Checklist:
- [ ] .env file created at `/home/ubuntu/app/.env`
- [ ] All placeholder values replaced with real credentials
- [ ] NEXTAUTH_SECRET generated and added
- [ ] File permissions set to 600 (secure)

---

### 🔧 Important Notes:
- **Supabase**: Get credentials from Supabase Dashboard → Project Settings → API
- **AWS S3**: Create bucket first, then create IAM user with S3 access
- **Gmail**: Enable 2FA, then create App Password at https://myaccount.google.com/apppasswords
- **Google OAuth**: Optional - only if you want Google login

---

**Once your .env file is created and saved, let me know and we'll move to Step 5: Clone and Deploy Application**

---

## ✅ STEP 5: Clone Repository

### What You'll Do:
Clone your file-storage-app repository from GitHub to the EC2 instance.

### Instructions:

**In your SSH terminal, run these commands:**

1. **Navigate to app directory:**
   ```bash
   cd /home/ubuntu/app
   ```

2. **Clone your repository:**
   ```bash
   git clone https://github.com/Shivam08058004/file-storage-app.git
   ```

3. **Navigate into the cloned repository:**
   ```bash
   cd file-storage-app
   ```

4. **Verify files are there:**
   ```bash
   ls -la
   ```

**Expected:** You should see all your project files (package.json, Dockerfile, docker-compose.yml, etc.)

---

### ✅ Completion Checklist:
- [ ] Repository cloned successfully
- [ ] You're in the `/home/ubuntu/app/file-storage-app` directory
- [ ] You can see all project files with `ls -la`

---

**Once repository is cloned, let me know and we'll create the .env file in the correct location!**

---

## ✅ STEP 6: Create .env File

### What You'll Do:
Create the `.env` file inside the cloned repository with all your credentials.

### Instructions:

**In your SSH terminal (make sure you're in `/home/ubuntu/app/file-storage-app`):**

1. **Check you're in the right directory:**
   ```bash
   pwd
   ```
   Should show: `/home/ubuntu/app/file-storage-app`

2. **Generate NextAuth Secret first:**
   ```bash
   openssl rand -base64 32
   ```
   **Copy this output** - you'll need it in the next step!

3. **Create .env file:**
   ```bash
   nano .env
   ```

4. **Copy and paste this template into nano:**
   ```
   # Database (Supabase)
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=

   # AWS S3 Storage (NEW AWS ACCOUNT)
   # Get these from: AWS Console → IAM → Users → file-storage-app-user → Security Credentials
   AWS_ACCESS_KEY_ID=
   AWS_SECRET_ACCESS_KEY=
   AWS_S3_BUCKET_NAME=file-storage-app-2025
   AWS_REGION=us-east-1

   # NextAuth
   NEXTAUTH_URL=
   NEXTAUTH_SECRET=

   # Google OAuth (Optional - leave blank if not using)
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=

   # Email (Gmail SMTP)
   GMAIL_USER=
   GMAIL_APP_PASSWORD=
   EMAIL_FROM=

   # App URL (for share links)
   NEXT_PUBLIC_APP_URL=
   ```

5. **Fill in your values** (I'll help you with the format):
   - Keep the template above open in nano
   - Tell me what your **EC2 Public IP** is, and I'll give you the exact values for `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL`

6. **Save the file:**
   - Press `Ctrl + O` (to save)
   - Press `Enter` (to confirm)
   - Press `Ctrl + X` (to exit)

---

### 🔧 What You Need:

Before filling the .env file, gather these credentials:

1. **Supabase** (from Supabase Dashboard → Settings → API):
   - Project URL
   - Anon/Public key
   - Service Role key

2. **AWS S3** (from NEW AWS Console):
   - Access Key ID (from IAM user: file-storage-app-user)
   - Secret Access Key (from IAM user: file-storage-app-user)
   - Bucket Name: `file-storage-app-2025` (or your bucket name)
   - Region: `us-east-1`
   - **Note**: Create S3 bucket and IAM user in your new AWS account first

3. **Gmail** (for email verification):
   - Your Gmail address
   - App Password (generate at https://myaccount.google.com/apppasswords)

---

### ✅ Quick Check:
- [ ] Generated NEXTAUTH_SECRET with openssl command
- [ ] Have all credentials ready
- [ ] Know your EC2 Public IP address

---

**Tell me your EC2 Public IP, and let me know if you have all the credentials ready, or if you need help setting up any service!**

---

## ✅ STEP 7: Install Dependencies and Build Application

### What You'll Do:
Install npm packages and build the Next.js application.

### Instructions:

**In your SSH terminal (make sure you're in `/home/ubuntu/app/file-storage-app`):**

1. **Verify you're in the right directory:**
   ```bash
   pwd
   ```
   Should show: `/home/ubuntu/app/file-storage-app`

2. **Install dependencies:**
   ```bash
   pnpm install
   ```
   **Expected:** This will take 2-3 minutes. You'll see packages being installed.

3. **Build the application:**
   ```bash
   pnpm build
   ```
   **Expected:** This will take 3-5 minutes. You'll see the Next.js build process.

---

### ✅ Completion Checklist:
- [ ] `pnpm install` completed without errors
- [ ] `pnpm build` completed successfully
- [ ] You see "Compiled successfully" message

---

**Once the build completes successfully, let me know and we'll start the Docker containers!**

---

## ✅ STEP 8: Deploy with Docker

### What You'll Do:
Build Docker image and start containers (Next.js app + Jenkins).

### Instructions:

**In your SSH terminal (in `/home/ubuntu/app/file-storage-app`):**

1. **Stop any existing containers (if any):**
   ```bash
   docker-compose -f docker-compose.minimal.yml down
   ```

2. **Build and start containers:**
   ```bash
   docker-compose -f docker-compose.minimal.yml up -d --build
   ```
   **Expected:** This will take 2-3 minutes. Docker will build the image and start containers.

3. **Wait for services to start:**
   ```bash
   sleep 15
   ```

4. **Check container status:**
   ```bash
   docker-compose -f docker-compose.minimal.yml ps
   ```
   **Expected:** You should see 2 containers running: `file-storage-app` and `jenkins`

5. **Check application logs:**
   ```bash
   docker-compose -f docker-compose.minimal.yml logs -f file-storage-app
   ```
   **Expected:** You should see "Ready in X ms" or "started server on..."
   **Press `Ctrl + C` to exit logs**

6. **Test if app is running:**
   ```bash
   curl http://localhost:3000
   ```
   **Expected:** You should see HTML output (your app's homepage)

---

### ✅ Completion Checklist:
- [ ] Docker containers are running
- [ ] `docker-compose ps` shows both containers as "Up"
- [ ] Application logs show "Ready" or "started server"
- [ ] curl test returns HTML

---

**Once containers are running, let me know and we'll test access from your browser!**

---

## ✅ STEP 9: Test Your Application

### What You'll Do:
Verify the application is accessible and working.

### Instructions:

**1. Check container status:**
```bash
docker-compose -f docker-compose.minimal.yml ps
```

**2. Check application logs:**
```bash
docker-compose -f docker-compose.minimal.yml logs file-storage-app | tail -20
```

**3. Test from EC2 (local):**
```bash
curl http://localhost:3000
```

**4. Test from your browser:**
- Open your web browser
- Go to: `http://YOUR_EC2_IP:3000` (replace with your actual EC2 IP)

**Expected:** You should see your file storage application login page!

---

### ✅ Success Indicators:
- [ ] Containers show "Up" status
- [ ] Logs show "Ready" or "started server"
- [ ] Browser shows your application
- [ ] You can access the login/signup page

---

### 🎉 Your Application URLs (replace with your EC2 IP):
- **App**: http://YOUR_EC2_IP:3000
- **Jenkins**: http://YOUR_EC2_IP:8080

---

### 📋 Useful Commands:

**View logs:**
```bash
docker-compose -f docker-compose.minimal.yml logs -f
```

**Restart containers:**
```bash
docker-compose -f docker-compose.minimal.yml restart
```

**Stop containers:**
```bash
docker-compose -f docker-compose.minimal.yml down
```

**Rebuild and restart:**
```bash
docker-compose -f docker-compose.minimal.yml up -d --build
```

---

**🎊 CONGRATULATIONS! Your application is deployed and running on AWS EC2!**
