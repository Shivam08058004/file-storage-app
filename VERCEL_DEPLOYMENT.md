# Vercel Deployment Guide

## 🚀 Deploying to Vercel

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Deploy file storage app"
git push origin main
```

### Step 2: Import Project to Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Click "Import"

### Step 3: Configure Environment Variables ⚠️ CRITICAL

Before deploying, add your AWS credentials:

1. In Vercel project settings, go to **Settings** → **Environment Variables**
2. Add these variables (copy from your `.env.local`):

| Name | Value | Environment |
|------|-------|-------------|
| `AWS_ACCESS_KEY_ID` | Your AWS access key | Production, Preview, Development |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key | Production, Preview, Development |
| `AWS_S3_BUCKET_NAME` | Your S3 bucket name | Production, Preview, Development |
| `AWS_REGION` | Your AWS region (e.g., us-east-1) | Production, Preview, Development |

**Important**: Make sure to select all three environments (Production, Preview, Development)

### Step 4: Deploy

Click **Deploy** button. Vercel will build and deploy your app.

### Step 5: Test Your Deployment

Once deployed, visit your Vercel URL and test:
- ✅ Files load without 500 errors
- ✅ Upload works
- ✅ Folder creation works
- ✅ Download works
- ✅ Delete works

## 🔧 Troubleshooting

### Error: `/api/files/list` returns 500

**Cause**: Missing AWS environment variables

**Fix**:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Verify all 4 AWS variables are set correctly
3. Redeploy: Settings → Deployments → Click "..." → Redeploy

### Error: "Access Denied" from S3

**Cause**: AWS credentials invalid or bucket permissions wrong

**Fix**:
1. Verify credentials are correct (test locally first)
2. Check S3 bucket policy allows your IAM user
3. Verify IAM user has required permissions

### Error: CORS issues

**Cause**: S3 bucket CORS not configured

**Fix**:
1. Go to S3 bucket → Permissions → CORS
2. Add the CORS configuration from `aws-configs/cors-config.json`
3. Redeploy

## 📝 Environment Variables Checklist

Before deploying, verify:

- [ ] AWS_ACCESS_KEY_ID is set
- [ ] AWS_SECRET_ACCESS_KEY is set
- [ ] AWS_S3_BUCKET_NAME matches your actual bucket
- [ ] AWS_REGION matches your bucket's region
- [ ] All variables are set for all environments (Production, Preview, Development)
- [ ] S3 bucket exists and is accessible
- [ ] IAM user has correct permissions
- [ ] Bucket policy allows public read access
- [ ] CORS is configured (optional but recommended)

## 🔒 Security Notes

1. **Never commit `.env.local`** - Already in .gitignore
2. **Use Vercel's encrypted environment variables** - They're secure
3. **Rotate AWS keys regularly** - Best practice
4. **Use least privilege IAM policy** - Only grant needed S3 permissions
5. **Monitor AWS CloudTrail** - Track S3 access logs

## 🌐 Custom Domain (Optional)

To add a custom domain:

1. Go to Project Settings → Domains
2. Add your domain
3. Configure DNS records as instructed
4. Wait for SSL certificate provisioning

## 📊 Monitoring

After deployment:

1. **Vercel Logs**: Check function logs for errors
2. **AWS S3 Metrics**: Monitor bucket usage
3. **AWS CloudWatch**: Set up alerts for API errors

## 🔄 Redeploying After Changes

1. Push changes to GitHub:
   ```bash
   git add .
   git commit -m "Your changes"
   git push
   ```

2. Vercel auto-deploys on push

3. Or manually redeploy:
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Click "Redeploy"

## ⚡ Performance Tips

1. **Enable Edge Caching**: Files are automatically cached
2. **Use CloudFront**: Consider AWS CloudFront for S3 for better performance
3. **Optimize Images**: Consider image optimization for thumbnails
4. **Enable Vercel Analytics**: (optional) Monitor performance

## 🆘 Getting Help

If you encounter issues:

1. Check Vercel function logs
2. Check AWS CloudTrail logs
3. Verify S3 bucket is accessible
4. Test AWS credentials locally first
5. Check bucket policy and IAM permissions

## 🎉 Success Checklist

After successful deployment:

- [ ] Site loads without errors
- [ ] Can create folders
- [ ] Can upload files
- [ ] Files show up in correct folders
- [ ] Can download files
- [ ] Can delete files
- [ ] Storage indicator shows correct usage
- [ ] Search works
- [ ] Breadcrumb navigation works

Your app should now be live at: `https://your-project-name.vercel.app`
