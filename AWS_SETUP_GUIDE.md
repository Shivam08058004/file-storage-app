# AWS S3 Setup Guide for File Storage App

## Step 1: Create S3 Bucket

1. Go to **AWS S3 Console**: https://console.aws.amazon.com/s3/
2. Click **"Create bucket"**
3. Configure bucket:
   - **Bucket name**: Choose a unique name (e.g., `file-storage-app-bucket-123`)
   - **Region**: Select your preferred region (e.g., `us-east-1`)
   - **Block Public Access**: Uncheck "Block all public access" (we need public read for file URLs)
   - **Acknowledge** the warning about public access
4. Click **"Create bucket"**

## Step 2: Configure Bucket Policy (Make Files Publicly Readable)

1. Go to your newly created bucket
2. Click **"Permissions"** tab
3. Scroll to **"Bucket policy"**
4. Click **"Edit"** and paste this policy (replace `YOUR_BUCKET_NAME`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
    }
  ]
}
```

5. Click **"Save changes"**

### Optional: Configure CORS (Recommended)

If you want to allow direct downloads from browser:

1. Go to your bucket → **"Permissions"** tab
2. Scroll to **"Cross-origin resource sharing (CORS)"**
3. Click **"Edit"** and paste:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

4. Click **"Save changes"**

## Step 3: Create IAM User

1. Go to **IAM Console**: https://console.aws.amazon.com/iam/
2. Click **"Users"** in the left sidebar
3. Click **"Create user"**
4. Configure user:
   - **User name**: `file-storage-app-user` (or your preferred name)
   - Click **"Next"**

## Step 4: Set Permissions

1. Select **"Attach policies directly"**
2. Search and select **"AmazonS3FullAccess"** 
   - OR create a custom policy (recommended for production - see below)
3. Click **"Next"**
4. Review and click **"Create user"**

### Custom Policy (Recommended for Production)

Instead of AmazonS3FullAccess, create a custom policy for better security:

1. Click **"Create policy"**
2. Select **"JSON"** tab
3. Paste this policy (replace `YOUR_BUCKET_NAME`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::YOUR_BUCKET_NAME",
        "arn:aws:s3:::YOUR_BUCKET_NAME/*"
      ]
    }
  ]
}
```

4. Name it `FileStorageAppS3Policy`
5. Create and attach to your user

## Step 5: Create Access Keys

1. Go to **IAM Console** > **Users** > Click your user
2. Click **"Security credentials"** tab
3. Scroll to **"Access keys"**
4. Click **"Create access key"**
5. Select use case: **"Application running outside AWS"**
6. Click **"Next"**
7. Add description tag (optional): `File Storage App`
8. Click **"Create access key"**
9. **⚠️ IMPORTANT**: Copy both:
   - **Access key ID** (looks like: `AKIAIOSFODNN7EXAMPLE`)
   - **Secret access key** (looks like: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`)
   - **Save these securely** - you won't see the secret again!

## Step 6: Update .env.local

Open `.env.local` in your project and update with your actual values:

```env
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET_NAME=file-storage-app-bucket-123
AWS_REGION=us-east-1
```

## Step 7: Test the Setup

1. Restart your dev server:
   ```powershell
   pnpm dev
   ```

2. Open http://localhost:3000

3. Try uploading a file

4. Check your S3 bucket in AWS Console to verify the file was uploaded

## Troubleshooting

### Error: "Access Denied"
- Check that your IAM user has the correct permissions
- Verify environment variables are set correctly
- Make sure bucket name matches exactly

### Error: "Bucket does not exist"
- Verify bucket name in `.env.local`
- Check that bucket was created in the correct region
- Ensure region in `.env.local` matches bucket region

### Files upload but can't be viewed
- Check bucket policy is set correctly
- Verify "Block Public Access" settings allow public reads
- Test file URL directly in browser

## Security Best Practices

1. **Never commit `.env.local`** - it's in `.gitignore` by default
2. **Use custom IAM policy** instead of full S3 access in production
3. **Rotate access keys** regularly
4. **Enable CloudTrail** to audit S3 access
5. **Consider using CloudFront** for CDN and better security
6. **Enable S3 versioning** for backup and recovery

## Alternative: Use AWS CLI (Optional)

If you prefer command line, you can set up everything using AWS CLI:

```bash
# Install AWS CLI first
# Then configure:
aws configure

# Create bucket
aws s3 mb s3://file-storage-app-bucket-123 --region us-east-1

# Set bucket policy
aws s3api put-bucket-policy --bucket file-storage-app-bucket-123 --policy file://bucket-policy.json
```

## Cost Estimates

S3 Pricing (us-east-1, as of 2025):
- **Storage**: ~$0.023 per GB/month
- **PUT requests**: ~$0.005 per 1,000 requests
- **GET requests**: ~$0.0004 per 1,000 requests
- **Data transfer out**: ~$0.09 per GB (first 10TB)

**Example**: 10GB storage + 10,000 uploads + 100,000 downloads ≈ $0.30/month

## Next Steps

Once setup is complete:
1. ✅ Test file upload
2. ✅ Test file list
3. ✅ Test file delete
4. ✅ Test storage stats
5. Consider implementing CloudFront for production
