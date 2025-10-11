import { StorageService } from "@/lib/storage-service"
import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-helpers"
import { type NextRequest, NextResponse } from "next/server"

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const user = await requireAuth()
    if (!user) {
      return unauthorizedResponse()
    }

    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 })
    }

    // Extract S3 key from URL (or use directly if it's already a key)
    const s3Key = url.includes(".amazonaws.com/") 
      ? url.split(".amazonaws.com/")[1] 
      : url
    
    // Verify file/folder belongs to user
    const { data: file, error: fetchError } = await supabaseAdmin
      .from("files")
      .select("*")
      .eq("s3_key", s3Key)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !file) {
      return forbiddenResponse("File not found or access denied")
    }

    const storage = StorageService.getInstance()

    // If it's a folder, delete all contents recursively
    if (file.is_folder) {
      // Get folder path from s3_key (remove userId/ prefix and /.foldermarker suffix)
      // Example: "userId/folder1/.foldermarker" -> "folder1"
      const s3KeyParts = s3Key.replace("/.foldermarker", "").split("/")
      const folderPath = s3KeyParts.slice(1).join("/") // Remove userId prefix
      
      console.log(`[v0] Deleting folder: ${folderPath}`)
      
      // Find all files within this folder (exact match or nested)
      const { data: folderContents, error: listError } = await supabaseAdmin
        .from("files")
        .select("*")
        .eq("user_id", user.id)

      if (!listError && folderContents) {
        // Filter items that are in this folder or its subfolders
        const itemsToDelete = folderContents.filter(item => {
          if (!item.parent_folder) return false
          
          // Check if parent_folder matches exactly or is a subfolder
          return item.parent_folder === folderPath || 
                 item.parent_folder.startsWith(`${folderPath}/`)
        })

        console.log(`[v0] Found ${itemsToDelete.length} items to delete in folder`)

        // Delete each file/subfolder from S3 and database
        for (const item of itemsToDelete) {
          try {
            await storage.deleteFile(item.s3_key)
            await supabaseAdmin
              .from("files")
              .delete()
              .eq("id", item.id)
            
            console.log(`[v0] Deleted: ${item.name}`)
          } catch (err) {
            console.error(`[v0] Error deleting folder item: ${item.s3_key}`, err)
          }
        }
      }
    }

    // Delete the file/folder marker from S3
    await storage.deleteFile(s3Key)

    // Delete from database (storage_used will be updated automatically by trigger)
    const { error: dbError } = await supabaseAdmin
      .from("files")
      .delete()
      .eq("s3_key", s3Key)
      .eq("user_id", user.id)

    if (dbError) {
      console.error("[v0] Database delete error:", dbError)
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error("[v0] Delete error:", error)
    
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse()
    }
    
    if (error instanceof Error && error.message === "Email not verified") {
      return NextResponse.json(
        { success: false, error: "Please verify your email address before using this feature.", emailVerified: false },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Delete failed",
      },
      { status: 500 },
    )
  }
}
