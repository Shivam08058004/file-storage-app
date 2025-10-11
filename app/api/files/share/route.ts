import { NextRequest, NextResponse } from "next/server"
import { StorageService } from "@/lib/storage-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fileId } = body

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: "File ID is required" },
        { status: 400 }
      )
    }

    const storageService = StorageService.getInstance()
    const shareToken = await storageService.generateShareToken(fileId)
    
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
    return NextResponse.json(
      { success: false, error: "Failed to generate share link" },
      { status: 500 }
    )
  }
}
