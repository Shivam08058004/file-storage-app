import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import {
  generateVerificationToken,
  getVerificationTokenExpiry,
  sendVerificationEmail,
} from "@/lib/email"

/**
 * GET /api/auth/verify-email?token=xxx
 * Verify email address using token
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Verification token is required" },
        { status: 400 }
      )
    }

    // Find user with this verification token
    const { data: user, error: findError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("verification_token", token)
      .single()

    if (findError || !user) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired verification token" },
        { status: 400 }
      )
    }

    // Check if token is expired
    if (
      user.verification_token_expires &&
      new Date(user.verification_token_expires) < new Date()
    ) {
      return NextResponse.json(
        { success: false, error: "Verification token has expired", expired: true },
        { status: 400 }
      )
    }

    // Check if already verified
    if (user.email_verified) {
      return NextResponse.json({
        success: true,
        message: "Email already verified",
        alreadyVerified: true,
      })
    }

    // Update user to mark email as verified
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        email_verified: true,
        verification_token: null,
        verification_token_expires: null,
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("[v0] Email verification error:", updateError)
      return NextResponse.json(
        { success: false, error: "Failed to verify email" },
        { status: 500 }
      )
    }

    console.log(`[v0] Email verified for user: ${user.email}`)

    return NextResponse.json({
      success: true,
      message: "Email verified successfully! You can now sign in.",
    })
  } catch (error) {
    console.error("[v0] Email verification error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/auth/verify-email
 * Resend verification email
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      )
    }

    // Find user by email
    const { data: user, error: findError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("email", email)
      .single()

    if (findError || !user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        success: true,
        message: "If an account exists, a verification email has been sent",
      })
    }

    // Check if already verified
    if (user.email_verified) {
      return NextResponse.json(
        { success: false, error: "Email is already verified" },
        { status: 400 }
      )
    }

    // Generate new verification token
    const newToken = generateVerificationToken()
    const tokenExpiry = getVerificationTokenExpiry()

    // Update user with new token
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        verification_token: newToken,
        verification_token_expires: tokenExpiry.toISOString(),
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("[v0] Token generation error:", updateError)
      return NextResponse.json(
        { success: false, error: "Failed to generate verification token" },
        { status: 500 }
      )
    }

    // Send verification email
    const emailResult = await sendVerificationEmail(
      user.email,
      newToken,
      user.name
    )

    if (!emailResult.success) {
      return NextResponse.json(
        { success: false, error: "Failed to send verification email" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Verification email sent successfully",
    })
  } catch (error) {
    console.error("[v0] Resend verification error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
