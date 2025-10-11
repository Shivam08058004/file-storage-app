export interface FileMetadata {
  id: string
  name: string
  size: number
  type: string
  url: string
  uploadedAt: string
  isFolder?: boolean
  parentFolder?: string | null
  shareToken?: string | null
}

// Database types
export interface User {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  email_verified: boolean
  password_hash: string | null
  provider: string
  storage_used: number
  storage_limit: number
  created_at: string
  updated_at: string
}

export interface DbFile {
  id: string
  user_id: string
  name: string
  size: number
  type: string
  s3_key: string
  s3_url: string
  parent_folder: string | null
  is_folder: boolean
  share_token: string | null
  created_at: string
  updated_at: string
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
