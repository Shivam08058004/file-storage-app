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
