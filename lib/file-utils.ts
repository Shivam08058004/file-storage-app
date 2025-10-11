/**
 * Format file size to human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

/**
 * Get file icon type based on file type
 */
export function getFileIconType(type: string): string {
  if (type.startsWith("image/")) return "image"
  if (type.startsWith("video/")) return "video"
  if (type.includes("pdf")) return "document"
  if (type.includes("spreadsheet") || type.includes("excel")) return "spreadsheet"
  if (type.includes("presentation") || type.includes("powerpoint")) return "presentation"
  if (type.includes("zip") || type.includes("rar")) return "folder"
  if (type.includes("word") || type.includes("text")) return "document"

  return "document"
}

/**
 * Validate file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 100 * 1024 * 1024 // 100 MB

  if (file.size > maxSize) {
    return {
      valid: false,
      error: "File size exceeds 100 MB limit",
    }
  }

  return { valid: true }
}
