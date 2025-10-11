# File Sharing Feature Documentation

## 🔗 Overview

The file sharing feature allows users to generate unique, shareable links for any file in their storage. Recipients can view and download files without needing an account.

## ✨ Features

### 1. **Generate Share Links**
- Click the "Share" button on any file
- Automatically generates a unique, secure share token
- Link is instantly copied to clipboard
- Share link format: `https://your-domain.com/share/{token}`

### 2. **Shared File Page**
- Clean, user-friendly view page
- File preview for images, videos, and PDFs
- Download button for recipients
- Shows file name, size, and upload date
- No login required to access

### 3. **Security**
- Each share link has a unique token
- Tokens are stored securely in S3
- Links are permanent (can be extended to add expiration in future)

## 🎯 How It Works

### For File Owners:

1. **Create Share Link**
   - Navigate to your files
   - Click the three-dot menu (⋮) on any file
   - Click "Share"
   - Link is automatically copied to clipboard
   - Share the link via email, chat, or any platform

2. **Copy Existing Link**
   - If you already created a share link
   - Click the menu again
   - Click "Copy Link" to copy again

### For Recipients:

1. **Access Shared File**
   - Click the shared link
   - View file preview (images, videos, PDFs)
   - Click "Download File" button
   - File downloads to their device

## 🏗️ Technical Architecture

### Share Token Generation
```typescript
// Format: timestamp-randomString
const shareToken = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
```

### Storage Structure in S3
```
Files:               timestamp-filename.ext
Share Markers:       .share/{shareToken}
Marker Content:      {fileId}
```

### API Endpoints

#### POST `/api/files/share`
Creates a share link for a file.

**Request:**
```json
{
  "fileId": "1234567890-document.pdf"
}
```

**Response:**
```json
{
  "success": true,
  "shareUrl": "https://your-app.com/share/1234567890-abc123xyz",
  "shareToken": "1234567890-abc123xyz"
}
```

#### GET `/api/share/[token]`
Retrieves file metadata by share token.

**Response:**
```json
{
  "success": true,
  "file": {
    "id": "1234567890-document.pdf",
    "name": "document.pdf",
    "size": 1024000,
    "type": "application/pdf",
    "url": "https://bucket.s3.amazonaws.com/...",
    "uploadedAt": "2025-10-11T...",
    "shareToken": "1234567890-abc123xyz"
  }
}
```

### Components

#### FileCard Enhancement
- Added "Share" button in dropdown menu
- Toast notifications for user feedback
- Copy to clipboard functionality
- Visual feedback (checkmark) when copied

#### Shared File Page
- `/app/share/[token]/page.tsx`
- Responsive design
- File preview for supported types
- Download functionality
- Error handling for invalid/expired links

## 📊 File Previews Supported

| File Type | Preview | Download |
|-----------|---------|----------|
| Images (JPG, PNG, GIF, etc.) | ✅ Full preview | ✅ |
| Videos (MP4, WebM, etc.) | ✅ Video player | ✅ |
| PDFs | ✅ Embedded viewer | ✅ |
| Documents (DOCX, XLSX, etc.) | ❌ | ✅ |
| Other files | ❌ | ✅ |

## 🔐 Security Considerations

### Current Implementation:
- Unique share tokens prevent guessing
- Tokens stored securely in S3
- No authentication required (by design)
- Anyone with the link can access

### Future Enhancements:
- [ ] Password protection for shared links
- [ ] Expiration dates for links
- [ ] View count/analytics
- [ ] Revoke share links
- [ ] Share link management dashboard

## 🚀 Usage Examples

### Example 1: Share an Image
```typescript
// User clicks "Share" on photo.jpg
// System generates: https://app.com/share/1699999999-xyz789
// Recipient opens link → sees image preview → can download
```

### Example 2: Share a Document
```typescript
// User clicks "Share" on report.pdf
// System generates: https://app.com/share/1699999999-abc123
// Recipient opens link → PDF preview → can download
```

### Example 3: Share a Video
```typescript
// User clicks "Share" on video.mp4
// System generates: https://app.com/share/1699999999-def456
// Recipient opens link → video player → can watch or download
```

## 🎨 UI/UX Features

### Toast Notifications
- "Share link created! Link copied to clipboard"
- "Copied! Share link copied to clipboard"
- Error messages for failed operations

### Visual Feedback
- Checkmark icon when link is copied
- Loading states while generating link
- Disabled states for folders (can't share folders)

### Responsive Design
- Mobile-friendly share page
- Touch-friendly download buttons
- Adaptive layout for different screen sizes

## 🔧 Configuration

### Environment Variables
No additional environment variables needed! Uses existing AWS S3 configuration:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET_NAME`
- `AWS_REGION`

### Optional Configuration
```env
# Optional: Set custom app URL for share links
NEXT_PUBLIC_APP_URL=https://your-custom-domain.com
```

If not set, uses the request origin automatically.

## 🐛 Troubleshooting

### Issue: "Failed to create share link"
**Cause:** AWS S3 permissions issue
**Fix:** Ensure IAM user has `s3:PutObject` permission

### Issue: "File not found or link expired"
**Cause:** Share token doesn't exist or file was deleted
**Fix:** Generate a new share link

### Issue: Preview not working
**Cause:** CORS or file type not supported
**Fix:** Check S3 CORS configuration, verify file type

## 📈 Future Roadmap

### Phase 2 Features:
1. **Link Expiration**
   - Set expiration dates for share links
   - Automatic cleanup of expired links

2. **Password Protection**
   - Optional password for shared links
   - Encrypted password storage

3. **Analytics**
   - Track link views
   - Download statistics
   - Access logs

4. **Link Management**
   - View all active share links
   - Revoke links
   - Edit link settings

5. **Bulk Sharing**
   - Share multiple files at once
   - Create zip archives for download

6. **Custom Share Pages**
   - Branded share pages
   - Custom messages
   - Watermarks for images

## 🎉 Benefits

✅ **Easy Sharing** - One click to generate shareable links
✅ **No Account Required** - Recipients don't need to sign up
✅ **Secure** - Unique tokens prevent unauthorized access
✅ **Universal** - Works with any file type
✅ **Preview** - See before downloading
✅ **Mobile Friendly** - Works on all devices

## 📝 Notes

- Share links are permanent (until file is deleted)
- Deleting a file invalidates its share links
- Folders cannot be shared (only individual files)
- Each "Share" click generates the same link (idempotent)
- Links are stored in `.share/` prefix in S3
