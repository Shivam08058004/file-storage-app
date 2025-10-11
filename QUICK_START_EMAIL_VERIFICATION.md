# 🚀 Quick Start - Email Verification Testing

## Step 1: Get Resend API Key (2 minutes)

1. Go to https://resend.com
2. Click "Get Started" or "Sign Up"
3. Sign up with your email (the one you want to test with)
4. Verify your email
5. Go to **API Keys** in the dashboard
6. Click **Create API Key**
7. Give it a name like "File Storage App - Dev"
8. Copy the API key (starts with `re_`)

## Step 2: Add to .env.local

Open your `.env.local` file and add at the bottom:

```bash
# Resend Email Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxx  # Paste your API key here
EMAIL_FROM=onboarding@resend.dev
```

**Important:** With the free tier and `onboarding@resend.dev`, emails will only be sent to the email address you signed up with on Resend.

## Step 3: Update Supabase Database

1. Go to your Supabase project dashboard
2. Click **SQL Editor** (left sidebar)
3. Click **New query**
4. Copy and paste this:

```sql
-- Add verification columns to existing users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS verification_token TEXT,
ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_verification_token 
ON users(verification_token) WHERE verification_token IS NOT NULL;

-- Mark existing OAuth users as verified
UPDATE users 
SET email_verified = true 
WHERE provider = 'google' AND email_verified = false;
```

5. Click **Run** (or Ctrl+Enter)
6. Should see "Success. No rows returned"

## Step 4: Test Locally

```bash
pnpm dev
```

Go to http://localhost:3001/auth/signup

1. **Sign Up** with the email you used for Resend
2. You should see: "Account created successfully! Please check your email..."
3. **Check your email inbox** for verification email
4. **Click the verification link** in the email
5. Should redirect to signin page
6. **Sign in** with your credentials
7. Now you can access the dashboard and upload files!

## Testing Unverified User Flow

1. **Sign up** with a new account
2. **Don't click** the verification link yet
3. Try to **sign in** with the new account
4. You'll be redirected to `/auth/verify-email`
5. Can click "Send Verification Email" to get a new one

## Testing Resend Email

1. Go to http://localhost:3001/auth/verify-email
2. Enter your email address
3. Click "Send Verification Email"
4. Check your inbox for the new email

## What Happens for Unverified Users

If an unverified user tries to:
- Upload files → `403 Error: "Please verify your email address"`
- Delete files → `403 Error: "Please verify your email address"`
- Create folders → `403 Error: "Please verify your email address"`
- Share files → `403 Error: "Please verify your email address"`

## Verifying It Works

### Check Supabase Database
Run this query in Supabase SQL Editor:

```sql
SELECT 
  email, 
  email_verified, 
  provider,
  verification_token IS NOT NULL as has_token,
  verification_token_expires,
  created_at
FROM users
ORDER BY created_at DESC;
```

You should see:
- New users have `email_verified = false`
- After clicking link, `email_verified = true`
- Token is cleared after verification

### Check Resend Dashboard
1. Go to Resend dashboard
2. Click **Logs** or **Emails**
3. See all sent verification emails
4. Check delivery status

## Common Issues

### "Email sending failed"
- Check API key is correct in `.env.local`
- Restart dev server (`pnpm dev`)
- Check Resend dashboard for errors

### "Can't receive emails"
- Free tier only sends to your signup email
- Check spam folder
- Verify email in Resend dashboard

### "Token expired"
- Tokens expire after 24 hours
- Request new one at `/auth/verify-email`

## Production Deployment

When pushing to Vercel:

1. **Add Environment Variables in Vercel:**
   - `RESEND_API_KEY` = your API key
   - `EMAIL_FROM` = `onboarding@resend.dev`

2. **For Production Domain:**
   - Set up custom domain in Resend
   - Update `EMAIL_FROM` to your domain
   - Can send to any email address

3. **Redeploy:**
   ```bash
   git add .
   git commit -m "Add email verification"
   git push
   ```

---

✅ **You're all set!** Email verification is ready to test.
