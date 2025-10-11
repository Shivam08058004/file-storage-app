import { NextRequest, NextResponse } from "next/server"
import { StorageService } from "@/lib/storage-service"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const url = searchParams.get("url")
    const filename = searchParams.get("filename") || "download"

    if (!url) {
      return NextResponse.json(
        { success: false, error: "Missing url parameter" },
        { status: 400 }
      )
    }

    // Fetch the file from S3
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error("Failed to fetch file from storage")
    }

    const blob = await response.blob()
    
    // Return the file with proper headers to trigger download
    return new NextResponse(blob, {
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": response.headers.get("Content-Type") || "application/octet-stream",
      },
    })
  } catch (error) {
    console.error("[v0] Download error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to download file" },
      { status: 500 }
    )
  }
}
