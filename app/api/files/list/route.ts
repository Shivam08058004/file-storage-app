import { StorageService } from "@/lib/storage-service"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth, unauthorizedResponse } from "@/lib/auth-helpers"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Check authentication
    const user = await requireAuth()
    if (!user) {
      return unauthorizedResponse()
    }

    // Get files from database (more efficient than listing S3)
    const { data: files, error } = await supabaseAdmin
      .from("files")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    // Transform database files to FileMetadata format
    const fileMetadata = files.map((file) => ({
      id: file.s3_key,
      name: file.name,
      size: file.size,
      type: file.type,
      url: file.s3_url,
      uploadedAt: file.created_at,
      isFolder: file.is_folder,
      parentFolder: file.parent_folder,
      shareToken: file.share_token,
    }))

    return NextResponse.json({
      success: true,
      files: fileMetadata,
    })
  } catch (error) {
    console.error("[v0] List error:", error)
    
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse()
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list files",
      },
      { status: 500 },
    )
  }
}
