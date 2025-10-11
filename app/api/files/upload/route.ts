import { StorageService } from "@/lib/storage-service"
import { validateFile } from "@/lib/file-utils"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
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

    // Upload using storage service
    const storage = StorageService.getInstance()
    const fileMetadata = await storage.uploadFile(file, parentFolder || undefined)

    return NextResponse.json({
      success: true,
      file: fileMetadata,
    })
  } catch (error) {
    console.error("[v0] Upload error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 },
    )
  }
}
