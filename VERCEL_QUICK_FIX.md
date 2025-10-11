# Quick Fix for Vercel Deployment Errors

## The Problem
You're seeing these errors on Vercel:
- ❌ `GET /api/files/list 500 (Internal Server Error)`
- ❌ Files won't upload
- ❌ App doesn't work

## The Solution: Add Environment Variables

### 🔑 Step-by-Step Fix

1. **Go to your Vercel project dashboard**
   - Visit: https://vercel.com/dashboard
   - Click on your `file-storage-app` project

2. **Navigate to Settings**
   - Click "Settings" tab at the top
   - Click "Environment Variables" in the left sidebar

3. **Add AWS Credentials**
   
   Click "Add New" and enter each variable:

   **Variable 1:**
   - Key: `AWS_ACCESS_KEY_ID`
   - Value: `[Your AWS Access Key from .env.local]`
   - ✅ Check: Production, Preview, Development

   **Variable 2:**
   - Key: `AWS_SECRET_ACCESS_KEY`
   - Value: `[Your AWS Secret Key from .env.local]`
   - ✅ Check: Production, Preview, Development

   **Variable 3:**
   - Key: `AWS_S3_BUCKET_NAME`
   - Value: `[Your S3 Bucket Name]`
   - ✅ Check: Production, Preview, Development

   **Variable 4:**
   - Key: `AWS_REGION`
   - Value: `us-east-1` (or your region)
   - ✅ Check: Production, Preview, Development

4. **Redeploy Your App**
   - Go to "Deployments" tab
   - Click the "..." menu on the latest deployment
   - Click "Redeploy"
   - ✅ Wait for deployment to complete

5. **Test Your App**
   - Visit your Vercel URL
   - Try uploading a file
   - Should work now! ✅

## Where to Find Your Values

Open your local `.env.local` file and copy the values:

```env
AWS_ACCESS_KEY_ID=AKIA...          ← Copy this
AWS_SECRET_ACCESS_KEY=wJal...      ← Copy this
AWS_S3_BUCKET_NAME=my-bucket       ← Copy this
AWS_REGION=us-east-1               ← Copy this
```

## ⚠️ Important Notes

1. **Never commit `.env.local` to GitHub** - It's already in .gitignore
2. **All 4 variables are required** - App won't work without them
3. **Select all environments** - Production, Preview, and Development
4. **Redeploy after adding** - Changes only apply after redeployment

## 🎉 Success!

After following these steps, your app should:
- ✅ Load without 500 errors
- ✅ Upload files successfully
- ✅ List files correctly
- ✅ Work just like locally

## Still Having Issues?

### Check Your AWS Setup:

1. **S3 Bucket exists**: Go to AWS Console → S3 → Check bucket exists
2. **IAM Permissions**: Make sure IAM user has S3 access
3. **Bucket Policy**: Public read access configured
4. **Region matches**: Bucket region = AWS_REGION value

### Check Vercel Function Logs:

1. Go to Deployments tab
2. Click on latest deployment
3. Click "Functions" tab
4. Check for error messages

If you see "Access Denied" errors, your AWS credentials might be wrong or expired.
