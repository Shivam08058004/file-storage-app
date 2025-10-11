import { StorageService } from "@/lib/storage-service"
import { type NextRequest, NextResponse } from "next/server"

export async function DELETE(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 })
    }

    // Delete using storage service
    const storage = StorageService.getInstance()
    await storage.deleteFile(url)

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error("[v0] Delete error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Delete failed",
      },
      { status: 500 },
    )
  }
}
