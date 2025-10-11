import { NextRequest, NextResponse } from "next/server"
import { StorageService } from "@/lib/storage-service"

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Share token is required" },
        { status: 400 }
      )
    }

    const storageService = StorageService.getInstance()
    const fileMetadata = await storageService.getFileByShareToken(token)

    if (!fileMetadata) {
      return NextResponse.json(
        { success: false, error: "File not found or link expired" },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      file: fileMetadata 
    })
  } catch (error) {
    console.error("[v0] Get shared file error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to retrieve shared file" },
      { status: 500 }
    )
  }
}
