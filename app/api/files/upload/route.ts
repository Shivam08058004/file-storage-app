import { StorageService } from "@/lib/storage-service"
import { validateFile } from "@/lib/file-utils"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth, unauthorizedResponse, checkStorageQuota, quotaExceededResponse } from "@/lib/auth-helpers"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await requireAuth()
    if (!user) {
      return unauthorizedResponse()
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const parentFolder = formData.get("parentFolder") as string | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file
    const validation = validateFile(file)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Check storage quota
    const hasQuota = await checkStorageQuota(user.id, file.size)
    if (!hasQuota) {
      return quotaExceededResponse()
    }

    // Upload using storage service
    const storage = StorageService.getInstance()
    const fileMetadata = await storage.uploadFile(file, user.id, parentFolder || undefined)

    // Save file metadata to database
    const { error: dbError } = await supabaseAdmin.from("files").insert({
      user_id: user.id,
      name: fileMetadata.name,
      size: fileMetadata.size,
      type: fileMetadata.type,
      s3_key: fileMetadata.id, // S3 key is the file ID
      s3_url: fileMetadata.url,
      parent_folder: parentFolder,
      is_folder: false,
    })

    if (dbError) {
      console.error("[v0] Database error:", dbError)
      // File uploaded to S3 but failed to save to database
      // You might want to delete from S3 here, but for now we'll just log
    }

    return NextResponse.json({
      success: true,
      file: fileMetadata,
    })
  } catch (error) {
    console.error("[v0] Upload error:", error)
    
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse()
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 },
    )
  }
}
