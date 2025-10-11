import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3"
import { Upload } from "@aws-sdk/lib-storage"
import type { FileMetadata } from "./types"

/**
 * Storage Service Abstraction Layer
 * This class provides a unified interface for file storage operations.
 * Currently uses AWS S3 for storage.
 */
export class StorageService {
  private static instance: StorageService
  private s3Client: S3Client
  private bucketName: string
  private region: string

  private constructor() {
    this.bucketName = process.env.AWS_S3_BUCKET_NAME || ""
    this.region = process.env.AWS_REGION || "us-east-1"
    
    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    })
  }

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService()
    }
    return StorageService.instance
  }

  /**
   * Upload a file to storage
   * @param file - File to upload
   * @param userId - User ID for S3 path organization
   * @param parentFolder - Optional parent folder path (relative to user's root)
   */
  async uploadFile(file: File, userId: string, parentFolder?: string): Promise<FileMetadata> {
    try {
      const timestamp = Date.now()
      // Construct S3 key: userId/parentFolder?/timestamp-filename
      const fileName = `${timestamp}-${file.name}`
      const folderPath = parentFolder ? `${parentFolder}/` : ""
      const key = `${userId}/${folderPath}${fileName}`
      const buffer = Buffer.from(await file.arrayBuffer())

      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: file.type,
          ContentDisposition: `attachment; filename="${file.name}"`,
        },
      })

      await upload.done()

      const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`

      return {
        id: key,
        name: file.name,
        size: file.size,
        type: file.type,
        url: url,
        uploadedAt: new Date().toISOString(),
        parentFolder: parentFolder,
      }
    } catch (error) {
      console.error("[v0] Upload error:", error)
      throw new Error("Failed to upload file")
    }
  }

  /**
   * List all files for a specific user
   * @param userId - User ID to filter files
   */
  async listFiles(userId: string): Promise<FileMetadata[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: `${userId}/`, // Only list files under user's folder
      })

      const response = await this.s3Client.send(command)

      if (!response.Contents) {
        return []
      }

      const files = await Promise.all(
        response.Contents.map(async (obj) => {
          const key = obj.Key || ""
          const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`
          
          // Check if it's a folder marker
          const isFolder = key.endsWith(".foldermarker")
          
          let name: string
          let parentFolder: string | undefined
          
          if (isFolder) {
            // Extract folder name from path like "folder1/.foldermarker" or "parent/child/.foldermarker"
            const pathParts = key.replace("/.foldermarker", "").split("/")
            name = pathParts[pathParts.length - 1]
            parentFolder = pathParts.length > 1 ? pathParts.slice(0, -1).join("/") : undefined
          } else {
            // Check if file is in a folder (key contains /)
            const keyParts = key.split("/")
            if (keyParts.length > 1) {
              // File is in a folder: "folder1/timestamp-file.txt"
              parentFolder = keyParts.slice(0, -1).join("/")
              const fileNameWithTimestamp = keyParts[keyParts.length - 1]
              // Extract original filename (remove timestamp prefix)
              name = fileNameWithTimestamp.split("-").slice(1).join("-") || fileNameWithTimestamp
            } else {
              // File is in root: "timestamp-file.txt"
              name = key.split("-").slice(1).join("-") || key
              parentFolder = undefined
            }
          }

          return {
            id: key,
            name: name,
            size: obj.Size || 0,
            type: isFolder ? "folder" : this.getFileType(key),
            url: isFolder ? "" : url,
            uploadedAt: obj.LastModified?.toISOString() || new Date().toISOString(),
            isFolder,
            parentFolder,
          }
        })
      )

      return files
    } catch (error) {
      console.error("[v0] List error:", error)
      throw new Error("Failed to list files")
    }
  }

  /**
   * Delete a file from storage
   * @param url - Can be either the full URL or just the key
   */
  async deleteFile(url: string): Promise<void> {
    try {
      // Extract key from URL if full URL is provided
      const key = url.includes("amazonaws.com")
        ? url.split(".amazonaws.com/")[1]
        : url

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })

      await this.s3Client.send(command)
    } catch (error) {
      console.error("[v0] Delete error:", error)
      throw new Error("Failed to delete file")
    }
  }

  /**
   * Create a folder (virtual folder in S3 using a marker file)
   * @param name - Folder name
   * @param userId - User ID for S3 path organization
   * @param parentFolder - Optional parent folder path (relative to user's root)
   */
  async createFolder(name: string, userId: string, parentFolder?: string): Promise<FileMetadata> {
    try {
      // S3 doesn't have real folders, so we create a marker object
      const folderPath = parentFolder ? `${parentFolder}/${name}/` : `${name}/`
      const key = `${userId}/${folderPath}.foldermarker`

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: "",
        ContentType: "application/x-directory",
      })

      await this.s3Client.send(command)

      return {
        id: key,
        name: name,
        size: 0,
        type: "folder",
        url: "",
        uploadedAt: new Date().toISOString(),
        isFolder: true,
        parentFolder: parentFolder,
      }
    } catch (error) {
      console.error("[v0] Create folder error:", error)
      throw new Error("Failed to create folder")
    }
  }

  /**
   * Generate a shareable token for a file
   */
  async generateShareToken(fileId: string): Promise<string> {
    try {
      // Generate a unique share token
      const shareToken = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
      
      // Store the mapping in S3 metadata (we'll use a marker file)
      const markerKey = `.share/${shareToken}`
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: markerKey,
        Body: fileId, // Store the file ID in the marker
        ContentType: "text/plain",
      })

      await this.s3Client.send(command)

      return shareToken
    } catch (error) {
      console.error("[v0] Generate share token error:", error)
      throw new Error("Failed to generate share token")
    }
  }

  /**
   * Get file metadata by share token
   */
  async getFileByShareToken(shareToken: string): Promise<FileMetadata | null> {
    try {
      // Get the file ID from the share marker
      const markerKey = `.share/${shareToken}`
      
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: markerKey,
      })

      // Check if share token exists
      try {
        await this.s3Client.send(command)
      } catch (err) {
        return null // Share token not found
      }

      // Get the file ID from the marker body
      const getCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: markerKey,
      })

      const response = await this.s3Client.send(getCommand)
      
      // Read the stream to get the file ID
      const stream = response.Body
      if (!stream) {
        return null
      }
      
      const chunks: Uint8Array[] = []
      for await (const chunk of stream as any) {
        chunks.push(chunk)
      }
      const fileId = Buffer.concat(chunks).toString('utf-8')

      if (!fileId) {
        return null
      }

      // fileId contains full S3 key (userId/path/to/file)
      // Fetch the file directly from S3
      const headCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: fileId,
      })

      const fileMetadata = await this.s3Client.send(headCommand)
      const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fileId}`
      
      // Extract filename from key
      const fileName = fileId.split('/').pop()?.replace(/^\d+-/, '') || fileId
      
      return {
        id: fileId,
        name: fileName,
        size: fileMetadata.ContentLength || 0,
        type: fileMetadata.ContentType || this.getFileType(fileId),
        url: url,
        uploadedAt: fileMetadata.LastModified?.toISOString() || new Date().toISOString(),
        shareToken,
      }
    } catch (error) {
      console.error("[v0] Get file by share token error:", error)
      return null
    }
  }

  /**
   * Get storage statistics for a user
   * @param userId - User ID to get stats for
   */
  async getStorageStats(userId: string): Promise<{ used: number; total: number }> {
    try {
      const files = await this.listFiles(userId)
      const used = files.reduce((acc, file) => acc + file.size, 0)
      const total = 10 * 1024 * 1024 * 1024 // 10 GB in bytes

      return { used, total }
    } catch (error) {
      console.error("[v0] Stats error:", error)
      return { used: 0, total: 10 * 1024 * 1024 * 1024 }
    }
  }

  /**
   * Helper to determine file type from filename
   */
  private getFileType(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase()

    const typeMap: Record<string, string> = {
      // Documents
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      txt: "text/plain",

      // Spreadsheets
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      csv: "text/csv",

      // Presentations
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",

      // Images
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      svg: "image/svg+xml",
      webp: "image/webp",

      // Videos
      mp4: "video/mp4",
      avi: "video/x-msvideo",
      mov: "video/quicktime",
      webm: "video/webm",

      // Archives
      zip: "application/zip",
      rar: "application/x-rar-compressed",
    }

    return typeMap[ext || ""] || "application/octet-stream"
  }
}
