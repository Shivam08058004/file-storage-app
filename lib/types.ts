export interface FileMetadata {
  id: string
  name: string
  size: number
  type: string
  url: string
  uploadedAt: Date
  thumbnail?: string
  isFolder?: boolean
  parentFolder?: string
  shareToken?: string
}

export interface ShareLinkResponse {
  success: boolean
  shareUrl?: string
  error?: string
}

export interface StorageStats {
  used: number
  total: number
}

export interface UploadResponse {
  success: boolean
  file?: FileMetadata
  error?: string
}

export interface DeleteResponse {
  success: boolean
  error?: string
}
