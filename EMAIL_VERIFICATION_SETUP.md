# 📧 Email Verification Setup Guide

## Overview
This guide explains how to set up email verification for your file storage app using Resend.

## What's Been Implemented

### ✅ Database Changes
- Added `verification_token` column to store unique verification tokens
- Added `verification_token_expires` column for token expiration (24 hours)
- Updated `supabase-schema.sql` with new columns
- OAuth users (Google) are automatically marked as verified

### ✅ Email Service (Resend)
- Professional transactional email service
- Beautiful HTML email templates
- 24-hour token expiration
- Resend verification email functionality

### ✅ API Routes
- **`/api/auth/verify-email` (GET)** - Verify email with token
- **`/api/auth/verify-email` (POST)** - Resend verification email
- Updated `/api/auth/signup` to generate and send verification emails

### ✅ User Interface
- Email verification page (`/auth/verify-email`)
- Updated signup flow to show verification message
- Updated signin flow to redirect unverified users
- Resend verification email option

### ✅ Authentication Updates
- `requireAuth()` now checks email verification status
- Session includes `emailVerified` boolean
- OAuth users bypass verification requirement

## Setup Steps

### 1. Update Supabase Database

Run this SQL in your Supabase SQL Editor:

```sql
-- Add verification columns to existing users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS verification_token TEXT,
ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMPTZ;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_users_verification_token 
ON users(verification_token) WHERE verification_token IS NOT NULL;

-- Mark existing OAuth users as verified
UPDATE users 
SET email_verified = true 
WHERE provider = 'google' AND email_verified = false;
```

Or run the migration file:
```bash
# In Supabase SQL Editor, copy and paste contents of:
supabase-migration-email-verification.sql
```

### 2. Create Resend Account

1. Go to https://resend.com
2. Sign up for a free account (100 emails/day free)
3. Verify your email address
4. Go to **API Keys** section
5. Click **Create API Key**
6. Copy the API key (starts with `re_`)

### 3. Set Up Email Domain (Optional but Recommended)

**For Production:**
1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the DNS records to your domain provider
5. Wait for verification (usually 5-10 minutes)
6. Use `noreply@yourdomain.com` or `hello@yourdomain.com`

**For Testing:**
- Use `onboarding@resend.dev` (default, works out of the box)
- Can only send to the email you signed up with

### 4. Update Environment Variables

Add to your `.env.local`:

```bash
# Resend Email Configuration
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=onboarding@resend.dev  # or your custom domain email
```

**For Vercel Production:**
1. Go to your Vercel project
2. Settings → Environment Variables
3. Add:
   - `RESEND_API_KEY` = your resend API key
   - `EMAIL_FROM` = `onboarding@resend.dev` (or custom domain)

### 5. Test Email Verification

**Local Testing:**
```bash
pnpm dev
```

1. Go to http://localhost:3001/auth/signup
2. Create a new account
3. Check your email inbox
4. Click verification link
5. Should redirect to signin page

**Production Testing:**
1. Deploy to Vercel with environment variables set
2. Sign up with a real email address
3. Check email and click verification link
4. Confirm you can sign in and access files

## User Flow

### New User Signup
1. User fills signup form
2. Account created with `email_verified = false`
3. Verification email sent with unique token
4. User sees "Check your email" message
5. Redirected to `/auth/verify-email`

### Email Verification
1. User clicks link in email
2. Token validated (check expiration)
3. `email_verified` set to `true`
4. Redirected to signin page
5. Can now sign in and use app

### Unverified User Signin
1. User tries to sign in
2. Credentials valid but email not verified
3. Redirected to `/auth/verify-email`
4. Can request new verification email

### Verified User Signin
1. User signs in with verified email
2. Session includes `emailVerified: true`
3. Access granted to all features
4. Can upload files, create folders, etc.

## Protected Routes

All file operations require email verification:
- ✅ Upload files
- ✅ Delete files
- ✅ Create folders
- ✅ Share files
- ✅ View storage stats

Unverified users will get:
```json
{
  "success": false,
  "error": "Please verify your email address before using this feature.",
  "emailVerified": false
}
```

## Email Templates

### Verification Email Features
- ✅ Beautiful gradient design
- ✅ Clear call-to-action button
- ✅ Fallback text link
- ✅ Expiration warning (24 hours)
- ✅ Company branding
- ✅ Mobile responsive

### Customization
Edit `lib/email.ts` to customize:
- Email colors and branding
- Button text and styling
- Footer information
- Support email address

## Troubleshooting

### Issue: Emails Not Sending

**Check:**
1. `RESEND_API_KEY` is set correctly in environment variables
2. API key is active in Resend dashboard
3. Check Vercel deployment logs for errors
4. Verify `EMAIL_FROM` matches your domain or use default

**Solution:**
```bash
# Test API key locally
curl -X POST https://api.resend.com/emails \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "onboarding@resend.dev",
    "to": "your-email@example.com",
    "subject": "Test",
    "html": "<p>Test email</p>"
  }'
```

### Issue: Verification Link Expired

**User Action:**
1. Go to `/auth/verify-email`
2. Enter email address
3. Click "Send Verification Email"
4. New token generated with fresh 24-hour expiration

### Issue: Already Verified

If user clicks verification link multiple times:
- Shows "Email already verified" message
- No error, just confirmation
- Can proceed to sign in

### Issue: Google Users Not Working

**Check:**
1. Google OAuth users are automatically marked as `email_verified = true`
2. No verification email sent for OAuth signups
3. Check `signIn` callback in `lib/auth.ts`

## Monitoring

### Resend Dashboard
- View sent emails
- Check delivery status
- Monitor API usage
- Track bounce/spam rates

### Supabase Queries
```sql
-- Check verification status
SELECT 
  email, 
  email_verified, 
  provider,
  verification_token_expires,
  created_at
FROM users
ORDER BY created_at DESC;

-- Count unverified users
SELECT COUNT(*) as unverified_count
FROM users
WHERE email_verified = false AND provider = 'email';

-- Find expired tokens
SELECT email, verification_token_expires
FROM users
WHERE verification_token_expires < NOW()
AND email_verified = false;
```

## Security Features

- ✅ Unique UUID tokens (impossible to guess)
- ✅ 24-hour token expiration
- ✅ Tokens deleted after use
- ✅ Rate limiting via Resend (100/day free tier)
- ✅ HTTPS only in production
- ✅ No email address enumeration (generic responses)

## Cost Estimate

### Resend Pricing
- **Free Tier**: 100 emails/day, 3,000/month
- **Pro Tier**: $20/month for 50,000 emails
- **Business**: Custom pricing

### For Most Apps
Free tier is sufficient unless:
- 100+ signups per day
- Sending reminder emails
- High verification email resend rate

## Next Steps (Optional Enhancements)

1. **Welcome Email** - Send after verification
2. **Reminder Emails** - Nudge unverified users after 24 hours
3. **Email Templates** - Use React Email for better templates
4. **Analytics** - Track verification rates
5. **Admin Dashboard** - View unverified users
6. **Bulk Actions** - Resend verification to multiple users

## Files Modified/Created

### Created
- ✅ `lib/email.ts` - Email utility functions
- ✅ `app/api/auth/verify-email/route.ts` - Verification API
- ✅ `app/auth/verify-email/page.tsx` - Verification UI
- ✅ `supabase-migration-email-verification.sql` - DB migration

### Modified
- ✅ `supabase-schema.sql` - Added verification columns
- ✅ `lib/auth-helpers.ts` - Added email verification check
- ✅ `lib/auth.ts` - Added emailVerified to session
- ✅ `types/next-auth.d.ts` - Added emailVerified type
- ✅ `app/api/auth/signup/route.ts` - Send verification email
- ✅ `app/auth/signup/page.tsx` - Show verification message
- ✅ `app/auth/signin/page.tsx` - Redirect unverified users
- ✅ `package.json` - Added `resend` dependency

---

🎉 **Email verification is now fully implemented!** Users must verify their email before accessing file storage features.
