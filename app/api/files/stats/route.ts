import { supabaseAdmin } from "@/lib/supabase"
import { requireAuth, unauthorizedResponse } from "@/lib/auth-helpers"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Check authentication
    const user = await requireAuth()
    if (!user) {
      return unauthorizedResponse()
    }

    // Get user storage stats from database
    const { data: userData, error } = await supabaseAdmin
      .from("users")
      .select("storage_used, storage_limit")
      .eq("id", user.id)
      .single()

    if (error || !userData) {
      throw new Error("Failed to get user storage stats")
    }

    return NextResponse.json({
      success: true,
      stats: {
        used: userData.storage_used,
        total: userData.storage_limit,
      },
    })
  } catch (error) {
    console.error("[v0] Stats error:", error)
    
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse()
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get stats",
      },
      { status: 500 },
    )
  }
}
