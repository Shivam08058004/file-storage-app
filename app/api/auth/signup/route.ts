import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import bcrypt from "bcryptjs"
import {
  generateVerificationToken,
  getVerificationTokenExpiry,
  sendVerificationEmail,
} from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "User already exists" },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Generate verification token
    const verificationToken = generateVerificationToken()
    const tokenExpiry = getVerificationTokenExpiry()

    // Create user with verification token
    const { data: newUser, error } = await supabaseAdmin
      .from("users")
      .insert({
        email,
        name: name || null,
        password_hash: hashedPassword,
        provider: "email",
        email_verified: false,
        verification_token: verificationToken,
        verification_token_expires: tokenExpiry.toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Signup error:", error)
      return NextResponse.json(
        { success: false, error: "Failed to create user" },
        { status: 500 }
      )
    }

    // Send verification email
    const emailResult = await sendVerificationEmail(
      email,
      verificationToken,
      name
    )

    if (!emailResult.success) {
      console.error("[v0] Email sending failed:", emailResult.error)
      // User created but email failed - they can resend later
      return NextResponse.json({
        success: true,
        message:
          "Account created! We had trouble sending the verification email. Please check your email or request a new verification link.",
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
        },
        emailSent: false,
      })
    }

    console.log(`[v0] User created and verification email sent: ${email}`)

    return NextResponse.json({
      success: true,
      message:
        "Account created successfully! Please check your email to verify your account.",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
      emailSent: true,
    })
  } catch (error) {
    console.error("[v0] Signup error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
