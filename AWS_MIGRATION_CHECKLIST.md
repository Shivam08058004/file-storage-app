# AWS Account Migration Checklist

This document provides step-by-step instructions for migrating the file storage application from a suspended AWS account to a new AWS account.

## Prerequisites

- ✅ Access to a new AWS account
- ✅ AWS account has permissions to create S3 buckets, IAM users, and EC2 instances
- ✅ GitHub repository access
- ✅ Supabase credentials (database remains unchanged)
- ✅ Email service credentials (Resend API key or Gmail app password)

---

## Phase 1: AWS Resource Setup (New Account)

### Step 1: Create S3 Bucket

1. **Login to AWS Console**
   - Go to https://console.aws.amazon.com
   - Sign in with your **new AWS account**
   - Select region: **us-east-1** (US East - N. Virginia)

2. **Navigate to S3**
   - Search for "S3" in the AWS services search bar
   - Click on "S3" service

3. **Create Bucket**
   - Click **"Create bucket"** button
   - **Bucket name**: `file-storage-app-2025`
     - If this name is taken, use: `file-storage-app-2025-v2` or add a unique suffix
   - **AWS Region**: `us-east-1`
   - **Object Ownership**: ACLs disabled (recommended)
   - **Block all public access**: **UNCHECK** this box (we need public read access)
   - **Bucket Versioning**: Disabled
   - **Default encryption**: SSE-S3 (Amazon S3 managed keys)
   - Click **"Create bucket"**

4. **Configure Bucket Policy** (Public Read Access)
   - Click on your bucket name
   - Go to **Permissions** tab
   - Scroll to **Bucket Policy**
   - Click **Edit** and paste:
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
   - **Important**: Replace `file-storage-app-2025` with your actual bucket name if different
   - Click **Save changes**

5. **Enable CORS**
   - Still in **Permissions** tab
   - Scroll to **Cross-origin resource sharing (CORS)**
   - Click **Edit** and paste:
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
   - Click **Save changes**

**✅ Checklist:**
- [ ] S3 bucket created with name `file-storage-app-2025` (or variant)
- [ ] Bucket is in `us-east-1` region
- [ ] Public read access enabled via bucket policy
- [ ] CORS configured

---

### Step 2: Create IAM User

1. **Navigate to IAM**
   - Search for "IAM" in AWS services
   - Click on "IAM" service

2. **Create User**
   - Click **Users** in left sidebar
   - Click **Create user** button
   - **User name**: `file-storage-app-user`
   - Click **Next**

3. **Set Permissions**
   - Select **"Attach policies directly"**
   - Search for: `AmazonS3FullAccess`
   - Check the box next to **AmazonS3FullAccess**
   - Click **Next**

4. **Review and Create**
   - Review the user details
   - Click **Create user**

5. **Generate Access Keys**
   - Click on the user name: `file-storage-app-user`
   - Go to **Security credentials** tab
   - Scroll to **Access keys** section
   - Click **Create access key** button
   - Select use case: **"Application running on AWS compute service"**
   - Click **Next**
   - (Optional) Add description: "File Storage App S3 Access"
   - Click **Create access key**

6. **Save Credentials**
   - **IMPORTANT**: Copy both values immediately:
     - **Access Key ID**: `AKIA...` (starts with AKIA)
     - **Secret Access Key**: `wJalr...` (long string - shown only once!)
   - Click **Download .csv** or copy to a secure password manager
   - **Store these securely** - you'll need them for the `.env` file
   - Click **Done**

**✅ Checklist:**
- [ ] IAM user `file-storage-app-user` created
- [ ] User has `AmazonS3FullAccess` policy attached
- [ ] Access Key ID copied and saved securely
- [ ] Secret Access Key copied and saved securely

---

### Step 3: Launch EC2 Instance

1. **Navigate to EC2**
   - Search for "EC2" in AWS services
   - Click on "EC2" service
   - Ensure region is set to **us-east-1**

2. **Launch Instance**
   - Click **Launch Instance** button (orange button)

3. **Configure Instance**
   
   **Name and tags:**
   - Name: `file-storage-app-server`

   **Application and OS Images (AMI):**
   - Select: **Ubuntu Server 24.04 LTS**
   - Architecture: **64-bit (x86)**

   **Instance Type:**
   - Select: **c7i-flex.large** (2 vCPU, 4 GB RAM) - recommended
   - OR **t3.medium** (2 vCPU, 4 GB RAM) - cost-effective
   - OR **t3.small** (2 vCPU, 2 GB RAM) - budget option

   **Key Pair:**
   - If you have an existing key pair: Select it
   - If creating new: Click **Create new key pair**
     - Name: `file-storage-app-key`
     - Key pair type: **RSA**
     - Private key file format: **.pem** (for Mac/Linux) or **.ppk** (for Windows PuTTY)
     - Click **Create key pair**
     - **Download and save the key file securely** - you'll need it to SSH

   **Network Settings:**
   - Click **Edit**
   - VPC: Default VPC
   - Subnet: Default subnet
   - Auto-assign public IP: **Enable**
   - Firewall (Security Groups): **Create new security group**
   - Security group name: `file-storage-app-sg`
   - Description: `Security group for file storage application`

   **Add Inbound Rules:**
   ```
   Type        Protocol  Port Range  Source        Description
   SSH         TCP       22          My IP         SSH access (or 0.0.0.0/0 for anywhere)
   HTTP        TCP       80          0.0.0.0/0     HTTP (future use)
   HTTPS       TCP       443         0.0.0.0/0     HTTPS (future use)
   Custom TCP  TCP       3000        0.0.0.0/0     Next.js App
   Custom TCP  TCP       8080        0.0.0.0/0     Jenkins
   Custom TCP  TCP       8081        0.0.0.0/0     cAdvisor
   Custom TCP  TCP       9090        0.0.0.0/0     Prometheus
   Custom TCP  TCP       9100        0.0.0.0/0     Node Exporter
   ```

   **Configure Storage:**
   - Size: **30 GB** (minimum)
   - Volume type: **gp3** (General Purpose SSD)
   - Delete on termination: **Uncheck** (to preserve data)

4. **Launch Instance**
   - Review all settings
   - Click **Launch instance**
   - Wait for instance status: **Running** (green checkmark)

5. **Get Public IP**
   - Click on the instance ID
   - In the instance details, find **Public IPv4 address**
   - **Copy and save this IP address** - you'll need it for:
     - SSH connection
     - `.env` file configuration
     - Accessing the application

**✅ Checklist:**
- [ ] EC2 instance launched in `us-east-1` region
- [ ] Instance type selected (c7i-flex.large, t3.medium, or t3.small)
- [ ] Key pair created/downloaded and saved securely
- [ ] Security group created with all required ports open
- [ ] Instance status is "Running"
- [ ] Public IPv4 address copied and saved

---

## Phase 2: Application Configuration

### Step 4: Connect to EC2 Instance

1. **Set Up SSH Key** (Windows PowerShell)
   ```powershell
   # Create .ssh directory if it doesn't exist
   mkdir $env:USERPROFILE\.ssh -ErrorAction SilentlyContinue
   
   # Move key file to .ssh directory (adjust path if different)
   Move-Item "$env:USERPROFILE\Downloads\file-storage-app-key.pem" "$env:USERPROFILE\.ssh\file-storage-app-key.pem" -ErrorAction SilentlyContinue
   
   # Set permissions
   icacls "$env:USERPROFILE\.ssh\file-storage-app-key.pem" /inheritance:r
   icacls "$env:USERPROFILE\.ssh\file-storage-app-key.pem" /grant:r "$env:USERNAME`:R"
   ```

2. **Connect via SSH**
   ```powershell
   ssh -i "$env:USERPROFILE\.ssh\file-storage-app-key.pem" ubuntu@YOUR_EC2_IP
   ```
   Replace `YOUR_EC2_IP` with your actual EC2 public IP address.

3. **First Connection**
   - Type `yes` when prompted about host authenticity
   - You should see the Ubuntu welcome message

**✅ Checklist:**
- [ ] SSH key file moved to `.ssh` directory
- [ ] Key file permissions set correctly
- [ ] Successfully connected to EC2 instance
- [ ] See Ubuntu prompt: `ubuntu@ip-xxx-xxx-xxx-xxx:~$`

---

### Step 5: Set Up EC2 Instance

1. **Run Setup Script**
   ```bash
   # Clone repository first (if not already done)
   cd /home/ubuntu
   git clone https://github.com/Shivam08058004/file-storage-app.git
   cd file-storage-app
   
   # Make setup script executable
   chmod +x setup-ec2-production.sh
   
   # Run setup script
   ./setup-ec2-production.sh
   ```

2. **Logout and Login Again**
   ```bash
   exit
   ```
   Then reconnect via SSH (this applies Docker group permissions)

**✅ Checklist:**
- [ ] Setup script executed successfully
- [ ] Docker installed and working (`docker --version`)
- [ ] Docker Compose installed (`docker-compose --version`)
- [ ] Node.js 20 installed (`node --version`)
- [ ] pnpm installed (`pnpm --version`)
- [ ] Logged out and back in

---

### Step 6: Create Environment Variables File

1. **Navigate to App Directory**
   ```bash
   cd /home/ubuntu/app
   ```

2. **Create .env File**
   ```bash
   nano .env
   ```

3. **Paste Configuration Template**
   Copy and paste the following, replacing all placeholder values:

   ```bash
   # Database (Supabase) - These remain the same
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key

   # AWS S3 Storage (NEW AWS ACCOUNT)
   AWS_ACCESS_KEY_ID=AKIA...your-access-key-id
   AWS_SECRET_ACCESS_KEY=your-secret-access-key
   AWS_S3_BUCKET_NAME=file-storage-app-2025
   AWS_REGION=us-east-1

   # NextAuth Configuration
   NEXTAUTH_URL=http://YOUR_EC2_IP:3000
   NEXTAUTH_SECRET=your-generated-secret-here

   # Email Service (Resend)
   RESEND_API_KEY=re_your-api-key
   EMAIL_FROM=noreply@yourdomain.com

   # Application Configuration
   NEXT_PUBLIC_APP_URL=http://YOUR_EC2_IP:3000
   NODE_ENV=production
   ```

4. **Replace Placeholder Values**
   - Replace `YOUR_EC2_IP` with your actual EC2 public IP (appears twice)
   - Replace `AWS_ACCESS_KEY_ID` with your IAM user access key
   - Replace `AWS_SECRET_ACCESS_KEY` with your IAM user secret key
   - Replace `AWS_S3_BUCKET_NAME` if you used a different bucket name
   - Generate `NEXTAUTH_SECRET`:
     ```bash
     openssl rand -base64 32
     ```
   - Replace Supabase credentials (if needed)
   - Replace Resend API key and email settings

5. **Save and Exit**
   - Press `Ctrl + O` (save)
   - Press `Enter` (confirm)
   - Press `Ctrl + X` (exit)

6. **Set Permissions**
   ```bash
   chmod 600 /home/ubuntu/app/.env
   ```

**✅ Checklist:**
- [ ] `.env` file created at `/home/ubuntu/app/.env`
- [ ] All placeholder values replaced with actual credentials
- [ ] `NEXTAUTH_SECRET` generated and added
- [ ] File permissions set to 600 (secure)
- [ ] AWS credentials from new account are used

---

## Phase 3: Deploy Application

### Step 7: Deploy Application

1. **Clone Repository** (if not already done)
   ```bash
   cd /home/ubuntu/app
   git clone https://github.com/Shivam08058004/file-storage-app.git
   ```

2. **Copy .env File to Repository**
   ```bash
   cp /home/ubuntu/app/.env /home/ubuntu/app/file-storage-app/.env
   ```

3. **Deploy Using Script**
   ```bash
   cd /home/ubuntu/app/file-storage-app
   chmod +x deploy-production.sh
   ./deploy-production.sh
   ```

   OR deploy manually:
   ```bash
   cd /home/ubuntu/app/file-storage-app
   pnpm install
   pnpm build
   docker-compose -f docker-compose.minimal.yml up -d --build
   ```

4. **Verify Deployment**
   ```bash
   # Check container status
   docker-compose -f docker-compose.minimal.yml ps
   
   # Check application logs
   docker-compose -f docker-compose.minimal.yml logs file-storage-app
   
   # Test application
   curl http://localhost:3000
   ```

**✅ Checklist:**
- [ ] Repository cloned
- [ ] `.env` file copied to repository directory
- [ ] Dependencies installed
- [ ] Application built successfully
- [ ] Docker containers running
- [ ] Application responds to HTTP requests

---

### Step 8: Configure Jenkins (Optional)

1. **Access Jenkins**
   - Open browser: `http://YOUR_EC2_IP:8080`
   - Get initial admin password:
     ```bash
     docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
     ```

2. **Complete Jenkins Setup**
   - Paste initial admin password
   - Install suggested plugins
   - Create admin user
   - Set Jenkins URL: `http://YOUR_EC2_IP:8080`

3. **Configure GitHub Webhook**
   - Go to GitHub repository → Settings → Webhooks
   - Add webhook:
     - Payload URL: `http://YOUR_EC2_IP:8080/github-webhook/`
     - Content type: `application/json`
     - Events: Just the push event
   - Save webhook

**✅ Checklist:**
- [ ] Jenkins accessible at `http://YOUR_EC2_IP:8080`
- [ ] Jenkins configured with admin user
- [ ] GitHub webhook configured
- [ ] Jenkins pipeline can trigger builds

---

## Phase 4: Verification

### Step 9: Test Application

1. **Access Application**
   - Open browser: `http://YOUR_EC2_IP:3000`
   - You should see the login/signup page

2. **Test File Upload**
   - Create an account or sign in
   - Upload a test file
   - Verify file appears in the UI
   - Verify file is accessible in S3 bucket

3. **Verify S3 Integration**
   ```bash
   # From EC2 instance, test S3 access
   aws s3 ls s3://file-storage-app-2025/ --recursive
   ```
   (Requires AWS CLI installed, or check via AWS Console)

4. **Check Monitoring** (if deployed)
   - Prometheus: `http://YOUR_EC2_IP:9090`
   - Verify targets are UP

**✅ Checklist:**
- [ ] Application accessible in browser
- [ ] User registration/login works
- [ ] File upload works
- [ ] Files stored in S3 bucket
- [ ] File download works
- [ ] Monitoring accessible (if deployed)

---

## Troubleshooting

### Issue: Cannot connect to S3

**Symptoms**: File upload fails, S3 errors in logs

**Solutions**:
1. Verify AWS credentials in `.env` file
2. Check IAM user has `AmazonS3FullAccess` policy
3. Verify bucket name matches in `.env`
4. Check bucket region matches (`us-east-1`)
5. Test S3 access from EC2:
   ```bash
   # Install AWS CLI if needed
   sudo apt install awscli -y
   
   # Test access
   aws s3 ls s3://file-storage-app-2025/ --region us-east-1
   ```

### Issue: Application not accessible

**Symptoms**: Cannot access `http://YOUR_EC2_IP:3000`

**Solutions**:
1. Check security group has port 3000 open
2. Check container is running:
   ```bash
   docker ps | grep file-storage-app
   ```
3. Check application logs:
   ```bash
   docker logs file-storage-app
   ```
4. Verify `.env` file has correct `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL`

### Issue: Jenkins webhook not working

**Symptoms**: GitHub push doesn't trigger Jenkins build

**Solutions**:
1. Verify webhook URL: `http://YOUR_EC2_IP:8080/github-webhook/`
2. Check security group has port 8080 open
3. Verify Jenkins is accessible from internet
4. Check webhook delivery in GitHub repository settings

---

## Migration Complete

Once all steps are completed and verified:

✅ **New AWS Account Resources:**
- S3 bucket created and configured
- IAM user created with access keys
- EC2 instance running

✅ **Application Deployed:**
- Application accessible on new EC2 instance
- S3 integration working with new bucket
- All services operational

✅ **CI/CD Configured:**
- Jenkins accessible and configured
- GitHub webhook working (if configured)

**Note**: Existing files from the old S3 bucket cannot be migrated since the old account is inaccessible. Users will need to re-upload their files.

---

## Next Steps

1. **Update DNS** (if using custom domain)
   - Point domain to new EC2 IP address

2. **Set Up SSL/HTTPS** (recommended)
   - Use Let's Encrypt for free SSL certificates
   - Configure Nginx reverse proxy

3. **Monitor Costs**
   - Set up AWS Cost Explorer
   - Set up billing alerts

4. **Backup Strategy**
   - Enable S3 versioning
   - Set up automated database backups
   - Create EC2 snapshots

---

## Support

For issues or questions:
- Check application logs: `docker logs file-storage-app`
- Check Jenkins logs: `docker logs jenkins`
- Review AWS CloudWatch logs
- Check security group rules in EC2 console

**Last Updated**: January 2025  
**Migration Version**: 1.0

