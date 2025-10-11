import { NextRequest, NextResponse } from "next/server"
import { StorageService } from "@/lib/storage-service"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth, unauthorizedResponse } from "@/lib/auth-helpers"

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await requireAuth()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { name, parentFolder } = body

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { success: false, error: "Folder name is required" },
        { status: 400 }
      )
    }

    const storageService = StorageService.getInstance()
    const folder = await storageService.createFolder(name, user.id, parentFolder)

    // Save folder metadata to database
    const { error: dbError } = await supabaseAdmin.from("files").insert({
      user_id: user.id,
      name: folder.name,
      size: 0,
      type: "folder",
      s3_key: folder.id,
      s3_url: "",
      parent_folder: parentFolder,
      is_folder: true,
    })

    if (dbError) {
      console.error("[v0] Database error:", dbError)
    }

    return NextResponse.json({ success: true, folder })
  } catch (error) {
    console.error("[v0] Folder creation error:", error)
    
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse()
    }
    
    return NextResponse.json(
      { success: false, error: "Failed to create folder" },
      { status: 500 }
    )
  }
}
