import { StorageService } from "@/lib/storage-service"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helpers"
import { type NextRequest, NextResponse } from "next/server"

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const user = await requireAuth()
    if (!user) {
      return unauthorizedResponse()
    }

    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 })
    }

    // Extract S3 key from URL
    const s3Key = url.split(".amazonaws.com/")[1]
    
    // Verify file belongs to user
    const { data: file, error: fetchError } = await supabaseAdmin
      .from("files")
      .select("*")
      .eq("s3_key", s3Key)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !file) {
      return forbiddenResponse("File not found or access denied")
    }

    // Delete from S3
    const storage = StorageService.getInstance()
    await storage.deleteFile(url)

    // Delete from database (storage_used will be updated automatically by trigger)
    const { error: dbError } = await supabaseAdmin
      .from("files")
      .delete()
      .eq("s3_key", s3Key)
      .eq("user_id", user.id)

    if (dbError) {
      console.error("[v0] Database delete error:", dbError)
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error("[v0] Delete error:", error)
    
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse()
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Delete failed",
      },
      { status: 500 },
    )
  }
}
