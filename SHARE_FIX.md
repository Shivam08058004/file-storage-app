# File Sharing Fix Guide

## Issue Diagnosis

The file sharing functionality requires:
1. Files tracked in Supabase `files` table
2. `NEXT_PUBLIC_APP_URL` environment variable set
3. Database connection working properly

## Quick Fixes

### Fix 1: Add NEXT_PUBLIC_APP_URL to .env

On your EC2 instance, edit the `.env` file:

```bash
cd ~/app
nano .env
```

Add this line (replace with your actual public IP):
```env
NEXT_PUBLIC_APP_URL=http://54.89.157.18:3000/
```

Save and exit (Ctrl+X, Y, Enter).

### Fix 2: Verify Supabase Connection

Test database connectivity:
```bash
docker compose exec nextjs-app node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
supabase.from('files').select('count').then(r => console.log('DB OK:', r)).catch(e => console.error('DB Error:', e));
"
```

### Fix 3: Restart Application

After adding environment variable:
```bash
cd ~/app
docker compose down
docker compose up -d
```

### Fix 4: Check Database for Files

The sharing feature requires files to be in the database. If you uploaded files before the database tracking was fully implemented, they won't have database entries.

**Solution**: Re-upload a test file after the fix, then try sharing it.

## Testing Share Functionality

1. Upload a new file (after applying fixes)
2. Click the three-dot menu on the file card
3. Click "Share"
4. You should see "Share link created!" toast
5. The share link should be copied to clipboard
6. Open the share link in an incognito/private window to test

## Expected Share URL Format

```
http://YOUR_EC2_PUBLIC_IP:3000/share/1728735600000-abc123def456
```

## Troubleshooting

If sharing still doesn't work:

1. **Check Docker logs for errors:**
```bash
docker compose logs nextjs-app --tail=100 | grep -i share
```

2. **Check if file exists in database:**
```bash
# Get your user ID from Supabase dashboard, then check files table
```

3. **Test the share API directly:**
```bash
# From your local machine (need to be logged in first)
curl -X POST http://YOUR_EC2_PUBLIC_IP:3000/api/files/share \
  -H "Content-Type: application/json" \
  -d '{"fileId": "YOUR_FILE_S3_KEY"}'
```

## Common Issues

### Issue: "File not found or access denied"
- **Cause**: File not in database or belongs to different user
- **Fix**: Upload a new test file and try sharing that

### Issue: Share link shows 404
- **Cause**: Share token not created in S3 or database
- **Fix**: Check S3 for `.share/` folder, verify database has share_token

### Issue: "Failed to create share link"
- **Cause**: Missing NEXT_PUBLIC_APP_URL or database connection issue
- **Fix**: Add environment variable and restart containers
