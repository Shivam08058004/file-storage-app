import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  HeadObjectCommand,
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
   */
  async uploadFile(file: File, parentFolder?: string): Promise<FileMetadata> {
    try {
      const timestamp = Date.now()
      // If parentFolder is provided, prefix the key with the folder path
      const fileName = `${timestamp}-${file.name}`
      const key = parentFolder ? `${parentFolder}/${fileName}` : fileName
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
        uploadedAt: new Date(),
        parentFolder: parentFolder,
      }
    } catch (error) {
      console.error("[v0] Upload error:", error)
      throw new Error("Failed to upload file")
    }
  }

  /**
   * List all files in storage
   */
  async listFiles(): Promise<FileMetadata[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
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
            uploadedAt: obj.LastModified || new Date(),
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
   */
  async createFolder(name: string, parentFolder?: string): Promise<FileMetadata> {
    try {
      // S3 doesn't have real folders, so we create a marker object
      const folderPath = parentFolder ? `${parentFolder}/${name}/` : `${name}/`
      const key = `${folderPath}.foldermarker`

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
        uploadedAt: new Date(),
        isFolder: true,
        parentFolder: parentFolder,
      }
    } catch (error) {
      console.error("[v0] Create folder error:", error)
      throw new Error("Failed to create folder")
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{ used: number; total: number }> {
    try {
      const files = await this.listFiles()
      const used = files.reduce((acc, file) => acc + file.size, 0)
      const total = 100 * 1024 * 1024 * 1024 // 100 GB in bytes

      return { used, total }
    } catch (error) {
      console.error("[v0] Stats error:", error)
      return { used: 0, total: 100 * 1024 * 1024 * 1024 }
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
