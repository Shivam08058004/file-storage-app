# Cloud Storage App - AI Agent Instructions

## Project Overview
A Next.js 15 file storage application using AWS S3 for storage, shadcn/ui components, and TypeScript. This is a client-side focused app with minimal backend logic.

## Architecture Pattern

### Service Layer (Singleton Pattern)
- **`lib/storage-service.ts`** - Centralized storage abstraction using singleton pattern
- All storage operations (upload, delete, list, stats) go through `StorageService.getInstance()`
- Currently implements AWS S3, but designed for easy provider swapping
- **Never call S3 SDK directly** - always use the StorageService methods
- Files uploaded with timestamp prefix: `${timestamp}-${filename}` for uniqueness

### API Routes Structure
```
app/api/files/
  ├── upload/route.ts    - POST: multipart/form-data
  ├── delete/route.ts    - DELETE: JSON body with {url}
  ├── list/route.ts      - GET: returns {success, files[]}
  └── stats/route.ts     - GET: returns {success, stats: {used, total}}
```

All routes follow consistent response pattern:
```typescript
{ success: boolean, data?: T, error?: string }
```

### Component Organization
- **`components/ui/`** - shadcn/ui primitives (DO NOT modify manually)
- **`components/`** - Application components (file-card, file-grid, upload-dialog, etc.)
- All components use `"use client"` directive - this is a client-side app
- UI components configured via `components.json` (shadcn style: "new-york")

### Type System
- **`lib/types.ts`** - Central type definitions
- Key types: `FileMetadata`, `StorageStats`, `UploadResponse`, `DeleteResponse`
- All API responses and props should use these types

## Key Conventions

### Import Aliases (tsconfig.json paths)
```typescript
import { Button } from "@/components/ui/button"
import { StorageService } from "@/lib/storage-service"
import type { FileMetadata } from "@/lib/types"
```

### Console Logging
All logs prefixed with `[v0]` tag:
```typescript
console.error("[v0] Upload error:", error)
```

### File Validation
- Max file size: 100 MB (defined in `lib/file-utils.ts`)
- Use `validateFile(file)` before upload in API routes
- Returns `{ valid: boolean, error?: string }`

### State Management Pattern
Main page (`app/page.tsx`) manages state for:
- Files list (with filtered view for search)
- Storage stats (used/total bytes)
- Fetches data via client-side API calls on mount and after mutations

Refresh pattern after mutations:
```typescript
const handleUploadComplete = () => {
  fetchFiles()    // Refresh file list
  fetchStats()    // Refresh storage stats
}
```

## Development Workflow

### Running Locally
```bash
pnpm dev          # Start dev server (port 3000)
pnpm build        # Production build
pnpm start        # Run production build
```

### Environment Setup
Requires AWS S3 credentials in `.env.local`:
- `AWS_ACCESS_KEY_ID` - IAM user access key
- `AWS_SECRET_ACCESS_KEY` - IAM user secret key
- `AWS_S3_BUCKET_NAME` - S3 bucket name
- `AWS_REGION` - AWS region (default: us-east-1)

### Build Configuration
- TypeScript/ESLint errors ignored during builds (`next.config.mjs`)
- This is intentional for rapid prototyping - **fix errors but don't remove ignore flags**

### Adding UI Components
Use shadcn/ui CLI (components managed via `components.json`):
```bash
npx shadcn@latest add [component-name]
```

## Important Gotchas

1. **AWS S3 Integration**: Upload/delete operations require valid AWS credentials and proper S3 bucket permissions. If operations fail, check:
   - Environment variables are set correctly
   - S3 bucket exists and is accessible
   - IAM user has s3:PutObject, s3:GetObject, s3:DeleteObject, s3:ListBucket permissions
   - Bucket policy allows public read access for file URLs to work

2. **Client-Side Only**: All components are client-side (`"use client"`). No server components pattern used.

3. **File Icons**: `getFileIconType()` in `file-utils.ts` determines icon display. Images show thumbnails; others show categorized icons (document, video, spreadsheet, etc.).

4. **Storage Limit**: Hardcoded 100 GB limit in `storage-service.ts` - not enforced by backend, purely UI display.

5. **Type Inference**: When file.type is from S3, it may be incomplete. Helper function reconstructs type from pathname extension.

## When Adding Features

- **New storage operations**: Add to `StorageService` class, expose via API route
- **New file types**: Update `getFileType()` and `getFileIconType()` in `file-utils.ts`
- **New UI patterns**: Check `components/ui/` first - extensive shadcn component library available
- **State updates**: Follow the fetch-display-mutate-refetch pattern in `page.tsx`
