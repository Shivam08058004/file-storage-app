import { StorageService } from "@/lib/storage-service"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const storage = StorageService.getInstance()
    const stats = await storage.getStorageStats()

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error("[v0] Stats error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get stats",
      },
      { status: 500 },
    )
  }
}
