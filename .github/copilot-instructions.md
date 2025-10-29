# File Storage App - AI Agent Instructions

## Project Overview
Next.js 15 file storage application with NextAuth authentication (Google OAuth + email/password), Supabase PostgreSQL database, AWS S3 storage, and Docker deployment with Jenkins CI/CD pipeline. Built with shadcn/ui and TypeScript.

## Architecture: Dual Persistence Pattern

**Critical:** Files have dual persistence - S3 stores binary data, Supabase stores metadata. Both must stay in sync.

### Storage Layer (Singleton)
- **`lib/storage-service.ts`** - S3 operations only (upload, delete, list)
- **Never call S3 SDK directly** - use `StorageService.getInstance()`
- File keys: `${userId}/${folderPath}${timestamp}-${filename}`
- Folder markers: `.foldermarker` files in S3 (`folder1/.foldermarker`)

### Database Layer (Supabase)
- **`lib/supabase.ts`** - Two clients: `supabase` (client), `supabaseAdmin` (server with service role)
- **`supabase-schema.sql`** - Schema definition with `users` and `files` tables
- Files table tracks: `s3_key`, `s3_url`, `parent_folder`, `is_folder`, `share_token`, `storage_used`
- Always update DB after S3 operations (see `app/api/files/upload/route.ts`)

### API Routes Structure
```
app/api/
├── auth/
│   ├── [...nextauth]/route.ts  - NextAuth handler
│   ├── signup/route.ts         - Email signup with bcrypt
│   └── verify-email/route.ts   - Email verification
├── files/
│   ├── upload/route.ts         - POST: multipart, checks quota, updates S3+DB
│   ├── delete/route.ts         - DELETE: removes from S3+DB
│   ├── list/route.ts           - GET: queries DB (not S3!)
│   ├── stats/route.ts          - GET: aggregates storage_used from DB
│   ├── download/route.ts       - Proxy downloads with proper headers
│   └── share/route.ts          - POST: generates share tokens
├── folders/create/route.ts     - Creates .foldermarker in S3
└── share/[token]/route.ts      - Public file access via token
```

**Response pattern:** `{ success: boolean, data?: T, error?: string }`

### Authentication System
- **`lib/auth.ts`** - NextAuth config with SupabaseAdapter, Google + Credentials providers
- **`lib/auth-helpers.ts`** - `requireAuth()`, `checkStorageQuota()`, standard response helpers
- All file APIs use `requireAuth()` to get `user.id` for multi-tenancy
- Email verification: Resend API (`lib/email.ts`), tokens stored in `users.verification_token`
- Session: JWT strategy, 30-day expiry

### Component Architecture
- **`components/ui/`** - shadcn/ui primitives (installed via CLI, don't hand-edit)
- **`components/`** - App components (all `"use client"`)
  - `file-card.tsx` - File item with download, delete, share dropdown
  - `file-grid.tsx` - Grid layout wrapper
  - `upload-dialog.tsx` - File upload modal
  - `create-folder-dialog.tsx` - Folder creation modal
  - `storage-indicator.tsx` - Quota display
  - `pdf-thumbnail.tsx` - PDF.js canvas rendering
- **`app/page.tsx`** - Main dashboard: auth gate → fetch files/stats → client-side filtering/search

### Type System
- **`lib/types.ts`** - `FileMetadata`, `DbFile`, `User`, `StorageStats`
- Database types (`DbFile`, `User`) use snake_case (PostgreSQL convention)
- API/component types (`FileMetadata`) use camelCase (TypeScript convention)
- Transform in API routes: `s3_key → id`, `created_at → uploadedAt`

## Key Conventions

### Import Aliases
```typescript
import { Button } from "@/components/ui/button"
import { requireAuth } from "@/lib/auth-helpers"
import { supabaseAdmin } from "@/lib/supabase"
import type { FileMetadata } from "@/lib/types"
```

### Console Logging
Prefix all logs with `[v0]`:
```typescript
console.error("[v0] Upload error:", error)
```

### Authentication Pattern (API Routes)
```typescript
// All protected routes start with this
const user = await requireAuth()
if (!user) return unauthorizedResponse()

// For uploads, also check quota
const hasQuota = await checkStorageQuota(user.id, file.size)
if (!hasQuota) return quotaExceededResponse()
```

### File Validation
```typescript
import { validateFile } from "@/lib/file-utils"
const validation = validateFile(file) // Max: 100 MB
if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 })
```

### State Refresh Pattern
After mutations, refresh both files and stats:
```typescript
const handleUploadComplete = () => {
  fetchFiles()  // Re-fetch from /api/files/list
  fetchStats()  // Re-fetch from /api/files/stats
}
```

## Development Workflow

### Local Development
```bash
pnpm dev          # Port 3000
pnpm build        # Production build
pnpm start        # Run production build
```

### Environment Variables (`.env.local`)
```bash
# Supabase (get from Supabase dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# AWS S3 (IAM user with PutObject/GetObject/DeleteObject/ListBucket)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_BUCKET_NAME=your-bucket
AWS_REGION=us-east-1

# NextAuth (generate: openssl rand -base64 32)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=xxx

# Google OAuth (Google Cloud Console)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx

# Email (Resend API - resend.com)
RESEND_API_KEY=re_xxx
EMAIL_FROM=noreply@yourdomain.com

# Share links (used in share URL generation)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database Setup
1. Run `supabase-schema.sql` in Supabase SQL Editor
2. Run `supabase-migration-email-verification.sql` if adding to existing DB
3. Verify indexes created: `idx_files_user_id`, `idx_files_share_token`, `idx_files_parent_folder`

### Docker Deployment
- **Build on host** (Node 20 + pnpm), copy `.next` and `node_modules` to container
- `docker-compose.yml` runs Next.js + Jenkins (+ optional Prometheus/Grafana stack)
- Jenkins pipeline (`Jenkinsfile.simple`): checkout → build → Docker build → deploy → health check
- Container expects `.env` file in `/home/ubuntu/app/.env` (mounted read-only)

### Adding shadcn Components
```bash
npx shadcn@latest add [component-name]
```

## Critical Gotchas

1. **Dual Persistence**: S3 upload success ≠ success. Must also write to Supabase. If DB write fails, uploaded file becomes orphan. Consider rollback or cleanup job.

2. **List Files Source**: `/api/files/list` queries **Supabase**, not S3. S3 listing only in `StorageService.listFiles()` (not exposed via API). Keep DB in sync!

3. **User Isolation**: All S3 keys and DB queries scoped by `user.id`. Never forget `WHERE user_id = ?` or attacker can access others' files.

4. **Storage Quota**: Enforced in `/api/files/upload` via `checkStorageQuota()`. Quota stored per-user in `users.storage_used`. Stats endpoint aggregates from `files.size` sum.

5. **Folder Implementation**: Folders are `.foldermarker` files in S3 + `is_folder: true` in DB. Not true directories. Path stored in `parent_folder` column.

6. **Share Tokens**: UUID stored in `files.share_token`. Public route `/share/[token]` bypasses auth. Token generation in `StorageService.generateShareToken()`.

7. **File Type Recovery**: S3 may lose Content-Type. `StorageService.getFileType()` reconstructs from extension. Always use this helper.

8. **Build Config**: `next.config.mjs` ignores TypeScript/ESLint errors (`ignoreDuringBuilds: true`). This is intentional for prototyping. Fix errors but don't remove flags.

9. **Email Verification**: Users can sign in before verifying, but `requireAuth(true)` blocks unverified users. Google OAuth bypasses this. Check `email_verified` or `provider === 'google'`.

10. **PDF Thumbnails**: Uses `pdfjs-dist` with `canvas` package (Node compatibility). Requires memory for large PDFs. See `lib/pdf-utils.ts` and `components/pdf-thumbnail.tsx`.

## When Adding Features

- **New storage operations**: Add to `StorageService`, expose via API route, update `files` table
- **New file metadata**: Add column to `files` table, update `DbFile` type, transform in API routes
- **New auth providers**: Add to `lib/auth.ts` providers array, handle in `jwt` callback
- **New file types**: Update `getFileIconType()` in `file-utils.ts`, add icon to `file-card.tsx`
- **State updates**: Follow fetch-display-mutate-refetch pattern in `page.tsx`

## Monitoring & DevOps
- **Prometheus**: Scrapes Node Exporter (system), cAdvisor (containers), app metrics (if added)
- **Grafana**: Pre-configured dashboards in `grafana/dashboards/system-overview.json`
- **Jenkins**: Groovy pipeline in `Jenkinsfile.simple`, uses NodeJS 20 plugin
- **Health checks**: Dockerfile has `/` endpoint check, Docker Compose has 30s interval
