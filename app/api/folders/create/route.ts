import { NextRequest, NextResponse } from "next/server"
import { StorageService } from "@/lib/storage-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, parentFolder } = body

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { success: false, error: "Folder name is required" },
        { status: 400 }
      )
    }

    const storageService = StorageService.getInstance()
    const folder = await storageService.createFolder(name, parentFolder)

    return NextResponse.json({ success: true, folder })
  } catch (error) {
    console.error("[v0] Folder creation error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create folder" },
      { status: 500 }
    )
  }
}
