import { StorageService } from "@/lib/storage-service"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const storage = StorageService.getInstance()
    const files = await storage.listFiles()

    return NextResponse.json({
      success: true,
      files,
    })
  } catch (error) {
    console.error("[v0] List error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list files",
      },
      { status: 500 },
    )
  }
}
