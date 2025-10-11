import { NextRequest, NextResponse } from "next/server"
import { StorageService } from "@/lib/storage-service"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helpers"

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await requireAuth()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { fileId } = body

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: "File ID is required" },
        { status: 400 }
      )
    }

    // Verify file belongs to user
    const { data: file, error: fetchError } = await supabaseAdmin
      .from("files")
      .select("*")
      .eq("s3_key", fileId)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !file) {
      return forbiddenResponse("File not found or access denied")
    }

    // Check if file already has a share token
    if (file.share_token) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
      const shareUrl = `${baseUrl}/share/${file.share_token}`
      
      return NextResponse.json({ 
        success: true, 
        shareUrl,
        shareToken: file.share_token 
      })
    }

    // Generate new share token
    const storageService = StorageService.getInstance()
    const shareToken = await storageService.generateShareToken(fileId)
    
    // Update database with share token
    const { error: updateError } = await supabaseAdmin
      .from("files")
      .update({ share_token: shareToken })
      .eq("s3_key", fileId)
      .eq("user_id", user.id)

    if (updateError) {
      console.error("[v0] Database update error:", updateError)
    }
    
    // Construct the shareable URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const shareUrl = `${baseUrl}/share/${shareToken}`

    return NextResponse.json({ 
      success: true, 
      shareUrl,
      shareToken 
    })
  } catch (error) {
    console.error("[v0] Share link generation error:", error)
    
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse()
    }
    
    return NextResponse.json(
      { success: false, error: "Failed to generate share link" },
      { status: 500 }
    )
  }
}
