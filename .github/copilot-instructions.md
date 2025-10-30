# File Storage App - AI Agent Instructions

## Project Overview
Next.js 15 file storage application with NextAuth authentication (Google OAuth + email/password), Supabase PostgreSQL database, AWS S3 storage, and Docker deployment with Jenkins CI/CD pipeline. Built with shadcn/ui and TypeScript.

**Tech Stack:** Next.js 15 (App Router) • NextAuth.js • Supabase (PostgreSQL) • AWS S3 • Docker • Jenkins • shadcn/ui • TypeScript • pnpm

## Architecture: Dual Persistence Pattern

**Critical:** Files have dual persistence - S3 stores binary data, Supabase stores metadata. Both must stay in sync. This is the most important architectural constraint of the entire system.

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
│   ├── [...nextauth]/route.ts  - NextAuth handler (GET/POST)
│   ├── signup/route.ts         - Email signup with bcrypt (POST)
│   └── verify-email/route.ts   - Email verification (GET with token)
├── files/
│   ├── upload/route.ts         - POST: multipart/form-data, checks quota, S3→DB pipeline
│   ├── delete/route.ts         - DELETE: S3→DB removal (atomic, no rollback yet)
│   ├── list/route.ts           - GET: queries DB only (NOT S3!), filters by parent_folder
│   ├── stats/route.ts          - GET: aggregates SUM(size) from files table
│   ├── download/route.ts       - GET: proxies S3 download with auth check + correct MIME
│   └── share/route.ts          - POST: generates UUID share token, writes to files.share_token
├── folders/create/route.ts     - POST: creates .foldermarker in S3 + DB row with is_folder=true
└── share/[token]/route.ts      - GET: public access (no auth), validates share_token
```

**Standard Response Pattern:**
```typescript
{ success: boolean, data?: T, error?: string }
// Error responses use this + appropriate HTTP status (400/401/403/500)
```

### Authentication System
- **`lib/auth.ts`** - NextAuth config with SupabaseAdapter, Google + Credentials providers
- **`lib/auth-helpers.ts`** - `requireAuth()`, `checkStorageQuota()`, standard response helpers
- All file APIs use `requireAuth()` to get `user.id` for multi-tenancy
- Email verification: Gmail SMTP (`lib/email.ts`), tokens stored in `users.verification_token`
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

# Email (Gmail SMTP via Nodemailer)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourdomain.com

# Share links (used in share URL generation)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database Setup
1. Run `supabase-schema.sql` in Supabase SQL Editor
2. Run `supabase-migration-email-verification.sql` if adding to existing DB
3. Verify indexes created: `idx_files_user_id`, `idx_files_share_token`, `idx_files_parent_folder`

### Docker Deployment
- **Build Strategy**: Host builds (Node 20 + pnpm), then copies `.next` and `node_modules` to Alpine container
- **Rationale**: Faster rebuilds, smaller images (no build tools in container), consistent with Next.js 15 standalone mode
- `docker-compose.yml` orchestrates: Next.js app + Jenkins + optional Prometheus/Grafana monitoring stack
- Jenkins pipeline (`Jenkinsfile.simple`): 
  1. Git checkout (force pull from `main`)
  2. Install deps + build on host via NodeJS plugin
  3. Docker build (copies artifacts)
  4. Stop old container → Start new → Health check (curl localhost:3000)
  5. Cleanup old images
- **Config**: Container expects `.env` at `/home/ubuntu/app/.env` (mounted read-only in docker-compose)
- **User**: Runs as non-root `nextjs:nodejs` (UID/GID 1001) for security

### Adding shadcn Components
```bash
npx shadcn@latest add [component-name]
```

## Critical Gotchas

1. **Dual Persistence**: S3 upload success ≠ success. Must also write to Supabase. If DB write fails, uploaded file becomes orphan. **Known Issue**: No automatic S3 rollback on DB failure (see TODO in `app/api/files/upload/route.ts`). Consider implementing cleanup job or atomic transaction pattern.

2. **List Files Source**: `/api/files/list` queries **Supabase**, not S3. Direct S3 listing only used in `StorageService.listFiles()` (not exposed via API). The source of truth is the database - keep DB in sync with S3!

3. **User Isolation**: All S3 keys and DB queries scoped by `user.id`. Never forget `WHERE user_id = ?` clause or file path prefix `${userId}/`. Missing this = security vulnerability where users access others' files.

4. **Storage Quota**: Enforced in `/api/files/upload` via `checkStorageQuota()`. Quota comparison uses `users.storage_used` (updated on upload) + `users.storage_limit` (default 10GB). Stats endpoint aggregates `SUM(files.size)` - must match `storage_used`.

5. **Folder Implementation**: Folders are **not real S3 directories**. They're `.foldermarker` files in S3 + `is_folder: true` rows in DB. Navigation uses `parent_folder` column (string path, nullable for root). Parent-child relationships are path-based, not FK-based.

6. **Share Tokens**: UUID stored in `files.share_token` column. Public route `/share/[token]` bypasses auth entirely - only validates token exists. Tokens generated via `crypto.randomUUID()` in `StorageService.generateShareToken()`. No expiration implemented yet.

7. **File Type Recovery**: S3 may lose Content-Type metadata on upload. `StorageService.getFileType()` reconstructs MIME type from file extension as fallback. Always use this helper in download/preview routes.

8. **Build Config**: `next.config.mjs` sets `ignoreDuringBuilds: true` for TypeScript/ESLint. This is intentional for rapid prototyping. Fix errors but **don't remove these flags** - Jenkins pipeline depends on successful builds.

9. **Email Verification**: Users can sign in before verifying email, but `requireAuth(true)` blocks API access for unverified users. Google OAuth auto-verifies (`provider === 'google'`). Check both `email_verified` column and provider.

10. **PDF Thumbnails**: Uses `pdfjs-dist` with `canvas` package for Node compatibility. High memory usage for large PDFs. Webpack configured to externalize `canvas` in server bundle (`next.config.mjs`). See `lib/pdf-utils.ts` for rendering logic.

11. **Standalone Output**: Next.js configured with `output: 'standalone'` for Docker. This creates a self-contained `.next/standalone` directory with minimal dependencies. Jenkins copies entire `.next` folder + `node_modules` to container.

## When Adding Features

- **New storage operations**: Add to `StorageService`, expose via API route, update `files` table
- **New file metadata**: Add column to `files` table, update `DbFile` type, transform in API routes
- **New auth providers**: Add to `lib/auth.ts` providers array, handle in `jwt` callback
- **New file types**: Update `getFileIconType()` in `file-utils.ts`, add icon to `file-card.tsx`
- **State updates**: Follow fetch-display-mutate-refetch pattern in `page.tsx`

## Monitoring & DevOps
- **Prometheus**: Scrapes Node Exporter (system), cAdvisor (containers), app metrics (if added)
- **Jenkins**: Groovy pipeline in `Jenkinsfile.simple`, uses NodeJS 20 plugin
- **Health checks**: Dockerfile has `/` endpoint check, Docker Compose has 30s interval
- **Live Deployment**: Production runs on AWS EC2 at http://44.220.178.213:3000 (see README.md for current URL)
- **Jenkins Dashboard**: http://44.220.178.213:8080 - monitors CI/CD pipeline status
