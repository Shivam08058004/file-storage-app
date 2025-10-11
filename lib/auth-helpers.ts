import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

/**
 * Get the current authenticated user session
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  return session?.user || null
}

/**
 * Require authentication - throws error if not authenticated
 * Use this in API routes that need authentication
 */
export async function requireAuth() {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error("Unauthorized")
  }
  
  return user
}

/**
 * Check if user has enough storage space
 * Returns true if user can upload, false if quota exceeded
 */
export async function checkStorageQuota(userId: string, fileSize: number) {
  const { supabaseAdmin } = await import("@/lib/supabase")
  
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("storage_used, storage_limit")
    .eq("id", userId)
    .single()
  
  if (error || !user) {
    return false
  }
  
  return (user.storage_used + fileSize) <= user.storage_limit
}

/**
 * Create an unauthorized response
 */
export function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, error: "Unauthorized - Please sign in" },
    { status: 401 }
  )
}

/**
 * Create a forbidden response
 */
export function forbiddenResponse(message = "Access denied") {
  return NextResponse.json(
    { success: false, error: message },
    { status: 403 }
  )
}

/**
 * Create a quota exceeded response
 */
export function quotaExceededResponse() {
  return NextResponse.json(
    { success: false, error: "Storage quota exceeded. Please delete some files or upgrade your plan." },
    { status: 403 }
  )
}
