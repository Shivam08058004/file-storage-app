# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click **"New Project"**
4. Fill in project details:
   - **Name**: `file-storage-app` (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to you (e.g., `us-east-1`)
   - **Pricing Plan**: Free (sufficient for development)
5. Click **"Create new project"**
6. Wait 1-2 minutes for project to be provisioned

## Step 2: Run Database Schema

1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Copy the entire contents of `supabase-schema.sql` from your project root
4. Paste it into the SQL editor
5. Click **"Run"** or press `Ctrl+Enter`
6. You should see: "Database schema created successfully!"

## Step 3: Get API Credentials

1. In Supabase dashboard, click **"Settings"** (gear icon) in the left sidebar
2. Click **"API"** in the settings menu
3. You'll see two important values:

   **Project URL:**
   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```

   **API Keys:**
   - `anon` `public` key (safe to use in browser)
   - `service_role` `secret` key (NEVER expose to browser)

## Step 4: Update Environment Variables

1. Open your `.env.local` file in the project root
2. Add these new variables (keep your existing AWS variables):

```env
# Existing AWS S3 variables (keep these)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET_NAME=your_bucket_name
AWS_REGION=us-east-1

# New Supabase variables (add these)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...
```

3. Replace:
   - `NEXT_PUBLIC_SUPABASE_URL` with your Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` with your `anon` public key
   - `SUPABASE_SERVICE_ROLE_KEY` with your `service_role` secret key

4. Save the file

## Step 5: Verify Setup

You can test the database connection by running this query in Supabase SQL Editor:

```sql
-- Check if tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Should show: users, files

-- Check user count
SELECT COUNT(*) as user_count FROM users;

-- Check files count
SELECT COUNT(*) as file_count FROM files;
```

## Step 6: View Your Database

1. Click **"Table Editor"** in the left sidebar
2. You should see two tables:
   - `users` - stores user accounts
   - `files` - stores file metadata

3. Click on `users` table to see the structure:
   - id, email, name, avatar_url
   - storage_used, storage_limit
   - created_at, updated_at

## Database Features Explained

### 🔐 Row Level Security (RLS)
- Users can only access their own files
- Shared files are publicly accessible via share token
- Database enforces access control automatically

### 📊 Automatic Storage Tracking
- When you upload a file → storage_used increases
- When you delete a file → storage_used decreases
- Trigger handles this automatically

### 🔄 Auto-Update Timestamps
- `created_at` set automatically on insert
- `updated_at` updated automatically on any change

## Next Steps

After completing this setup:
1. ✅ Database is ready
2. ➡️ Next: Install and configure NextAuth.js
3. ➡️ Then: Update API routes to use database
4. ➡️ Finally: Create login/signup UI

## Troubleshooting

**Problem: "relation 'users' does not exist"**
- Solution: Make sure you ran the SQL schema in Step 2

**Problem: "permission denied for table users"**
- Solution: RLS policies are active. This is expected - authentication will handle it

**Problem: Can't see API keys**
- Solution: Make sure you're in Settings > API section

**Problem: "Invalid API key"**
- Solution: Check that you copied the full key (they're very long ~200 characters)

## Useful Supabase SQL Queries

```sql
-- View all users
SELECT id, email, name, storage_used, storage_limit, created_at
FROM users
ORDER BY created_at DESC;

-- View all files with user info
SELECT 
  f.name, 
  f.size, 
  f.type,
  u.email as owner_email,
  f.created_at
FROM files f
JOIN users u ON f.user_id = u.id
ORDER BY f.created_at DESC;

-- Check storage usage
SELECT 
  email,
  storage_used,
  storage_limit,
  ROUND((storage_used::numeric / storage_limit) * 100, 2) as usage_percent
FROM users
ORDER BY storage_used DESC;
```

## Security Notes

⚠️ **IMPORTANT:**
- `NEXT_PUBLIC_*` variables are exposed to the browser - that's OK for the anon key
- `SUPABASE_SERVICE_ROLE_KEY` is SECRET - never use it in client-side code
- Service role key bypasses RLS - only use in API routes
- Never commit `.env.local` to git (it's already in .gitignore)

## Cost Information

**Supabase Free Tier includes:**
- 500 MB database storage
- 1 GB file storage (we're using S3, so this doesn't matter)
- 2 GB bandwidth per month
- Unlimited API requests
- Automatic daily backups (7 days retention)

This is more than enough for thousands of users storing file metadata!
