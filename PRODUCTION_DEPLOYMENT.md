# 🚀 Production Deployment Guide

## Prerequisites Checklist
- ✅ Next.js 15 app with authentication
- ✅ Supabase database configured
- ✅ AWS S3 bucket set up
- ✅ NextAuth.js configured
- ✅ All features tested locally

## Deployment Platform Options

### Option 1: Vercel (Recommended - Easiest)

**Why Vercel?**
- Built by Next.js creators
- Zero-config deployment
- Automatic HTTPS
- Environment variables UI
- Free tier available

**Steps:**

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Production ready: Multi-user file storage with authentication"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to https://vercel.com
   - Click "Import Project"
   - Select your GitHub repo
   - Vercel auto-detects Next.js

3. **Set Environment Variables in Vercel**
   Go to Project Settings → Environment Variables and add:
   
   ```
   AWS_ACCESS_KEY_ID=<your_value>
   AWS_SECRET_ACCESS_KEY=<your_value>
   AWS_S3_BUCKET_NAME=<your_value>
   AWS_REGION=us-east-1
   
   NEXT_PUBLIC_SUPABASE_URL=<your_value>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_value>
   SUPABASE_SERVICE_ROLE_KEY=<your_value>
   
   NEXTAUTH_URL=https://your-app.vercel.app
   NEXTAUTH_SECRET=<your_value>
   
   GOOGLE_CLIENT_ID=<your_value> (optional)
   GOOGLE_CLIENT_SECRET=<your_value> (optional)
   ```
   
   ⚠️ **IMPORTANT:** Update `NEXTAUTH_URL` to your actual Vercel domain after first deploy

4. **Update Google OAuth (if using)**
   - Go to Google Cloud Console
   - Add `https://your-app.vercel.app/api/auth/callback/google` to Authorized redirect URIs

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your app is live! 🎉

### Option 2: Railway

**Steps:**
1. Go to https://railway.app
2. "New Project" → "Deploy from GitHub"
3. Select your repo
4. Add environment variables (same as Vercel)
5. Update `NEXTAUTH_URL` to Railway domain
6. Deploy

### Option 3: AWS Amplify

**Steps:**
1. Go to AWS Amplify Console
2. "New App" → "Host web app"
3. Connect GitHub repo
4. Add environment variables
5. Build settings (auto-detected for Next.js)
6. Deploy

### Option 4: Self-Hosted (VPS)

**Requirements:**
- Ubuntu/Debian server
- Node.js 18+
- PM2 or systemd for process management
- Nginx for reverse proxy
- SSL certificate (Let's Encrypt)

**Quick Setup:**
```bash
# On your server
git clone <your-repo>
cd file-storage-app
npm install
npm run build

# Set environment variables
nano .env.local
# (Add all variables)

# Start with PM2
npm install -g pm2
pm2 start npm --name "file-storage-app" -- start
pm2 save
pm2 startup

# Configure Nginx reverse proxy
# Point to localhost:3000
```

## Post-Deployment Steps

### 1. Verify Deployment
- [ ] Visit your production URL
- [ ] Sign up new account
- [ ] Upload a file
- [ ] Verify file appears in S3 bucket with userId prefix
- [ ] Check Supabase database for user and file records
- [ ] Test file download
- [ ] Test file sharing link
- [ ] Test PDF thumbnail generation
- [ ] Test logout and signin
- [ ] Verify storage stats update

### 2. Database Check (Supabase)
Go to Supabase SQL Editor and verify:
```sql
-- Check users table
SELECT id, email, storage_used, storage_limit, created_at 
FROM users;

-- Check files table
SELECT id, user_id, name, size, is_folder, created_at 
FROM files;

-- Verify RLS is working (should only see your files)
SELECT * FROM files;
```

### 3. S3 Bucket Security
Verify in AWS S3 Console:
- [ ] Bucket has proper CORS configuration
- [ ] Public read access for files (or signed URLs)
- [ ] Versioning enabled (optional but recommended)
- [ ] Lifecycle rules for old files (optional)

### 4. Monitoring Setup (Optional)
- [ ] Set up Vercel Analytics
- [ ] Configure Supabase database monitoring
- [ ] Set up AWS CloudWatch for S3 usage
- [ ] Add error tracking (Sentry, LogRocket, etc.)

### 5. Performance Optimization (Optional)
- [ ] Enable Next.js Image Optimization
- [ ] Add CDN for static assets
- [ ] Implement caching strategy
- [ ] Add loading skeletons for better UX

## Security Checklist

- [ ] ✅ `.env.local` in `.gitignore` (DO NOT commit secrets)
- [ ] ✅ Supabase RLS policies enabled
- [ ] ✅ NextAuth secret is strong (32+ characters)
- [ ] ✅ AWS IAM user has minimal permissions (S3 only)
- [ ] ✅ HTTPS enabled in production
- [ ] ✅ Session cookies httpOnly and secure
- [ ] ✅ File ownership verification on delete/share
- [ ] ✅ Storage quota enforcement active

## Environment Variables Reference

| Variable | Where to Get | Required |
|----------|--------------|----------|
| `AWS_ACCESS_KEY_ID` | AWS IAM Console | ✅ |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM Console | ✅ |
| `AWS_S3_BUCKET_NAME` | AWS S3 Console | ✅ |
| `AWS_REGION` | AWS S3 Console | ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project Settings | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Project Settings | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Project Settings | ✅ |
| `NEXTAUTH_URL` | Your production domain | ✅ |
| `NEXTAUTH_SECRET` | Generate with crypto | ✅ |
| `GOOGLE_CLIENT_ID` | Google Cloud Console | ❌ Optional |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console | ❌ Optional |

## Troubleshooting

### Issue: 500 Error on Production
- Check Vercel logs (Dashboard → Deployments → Click deployment → Logs)
- Verify all environment variables are set
- Check `NEXTAUTH_URL` matches your domain

### Issue: Authentication Not Working
- Verify `NEXTAUTH_URL` is production domain (not localhost)
- Check `NEXTAUTH_SECRET` is set
- For Google OAuth: Verify redirect URI in Google Console

### Issue: Files Not Uploading
- Check AWS credentials are correct
- Verify S3 bucket name matches
- Check S3 bucket permissions (PutObject allowed)
- Verify storage quota not exceeded

### Issue: Database Errors
- Check Supabase service role key is correct
- Verify RLS policies are enabled
- Check database tables exist (run supabase-schema.sql if needed)

## Rollback Plan

If something goes wrong:
1. Vercel: Click "Rollback" on previous deployment
2. Railway: Redeploy previous commit
3. Check Vercel logs for specific errors
4. Verify environment variables unchanged

## Support Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Vercel Support**: https://vercel.com/support
- **Supabase Docs**: https://supabase.com/docs
- **NextAuth.js Docs**: https://next-auth.js.org/getting-started/introduction
- **AWS S3 Docs**: https://docs.aws.amazon.com/s3/

## Success Criteria

Your deployment is successful when:
- ✅ Users can sign up and sign in
- ✅ Files upload successfully with userId isolation
- ✅ Storage stats show correct usage
- ✅ Shared links work and display PDF thumbnails
- ✅ Users can only see/manage their own files
- ✅ Storage quota (10GB) is enforced
- ✅ Logout works and redirects to signin
- ✅ Database and S3 stay in sync

---

🎉 **You're ready for production!** Follow the Vercel deployment steps above for the easiest path to going live.
