/**
 * Email Utility Functions
 * Uses Nodemailer with Gmail for sending transactional emails
 */

import nodemailer from "nodemailer"

// Initialize Gmail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

/**
 * Generate a secure random verification token
 */
export function generateVerificationToken(): string {
  return crypto.randomUUID()
}

/**
 * Get verification token expiration time (24 hours from now)
 */
export function getVerificationTokenExpiry(): Date {
  const expiry = new Date()
  expiry.setHours(expiry.getHours() + 24) // 24 hours
  return expiry
}

/**
 * Send verification email to user
 * @param email - User's email address
 * @param token - Verification token
 * @param userName - User's name (optional)
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  userName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3001"
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${token}`

    const msg = {
      to: email,
      from: process.env.EMAIL_FROM || "your-verified-email@example.com",
      subject: "Verify your email address",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to File Storage App!</h1>
            </div>
            
            <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">
                ${userName ? `Hi ${userName},` : "Hi there,"}
              </p>
              
              <p style="font-size: 16px; margin-bottom: 30px;">
                Thank you for signing up! Please verify your email address to complete your registration and start using your 10GB storage space.
              </p>
              
              <div style="text-align: center; margin: 40px 0;">
                <a href="${verificationUrl}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 14px 40px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          font-size: 16px; 
                          font-weight: 600;
                          display: inline-block;
                          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  Verify Email Address
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="font-size: 13px; color: #667eea; word-break: break-all; background: #f5f5f5; padding: 12px; border-radius: 6px;">
                ${verificationUrl}
              </p>
              
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
              
              <p style="font-size: 13px; color: #999; margin-bottom: 10px;">
                This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
              </p>
              
              <p style="font-size: 13px; color: #999;">
                Questions? Contact us at support@yourdomain.com
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding: 20px; color: #999; font-size: 12px;">
              <p style="margin: 5px 0;">© ${new Date().getFullYear()} File Storage App. All rights reserved.</p>
              <p style="margin: 5px 0;">Secure cloud storage for your files</p>
            </div>
          </body>
        </html>
      `,
    }

    await transporter.sendMail(msg)
    console.log("[v0] Verification email sent to:", email)
    return { success: true }
  } catch (error) {
    console.error("[v0] Email sending error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    }
  }
}

/**
 * Send email verification reminder
 * @param email - User's email address
 * @param token - New verification token
 */
export async function sendVerificationReminder(
  email: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3001"
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${token}`

    const msg = {
      to: email,
      from: process.env.EMAIL_FROM || "your-verified-email@example.com",
      subject: "Reminder: Verify your email address",
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #667eea; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Email Verification Reminder</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px;">
                We noticed you haven't verified your email address yet. Please click the button below to verify and start using File Storage App.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="background: #667eea; color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block;">
                  Verify Email Now
                </a>
              </div>
              
              <p style="font-size: 13px; color: #999; margin-top: 30px;">
                This link will expire in 24 hours.
              </p>
            </div>
          </body>
        </html>
      `,
    }

    await transporter.sendMail(msg)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    }
  }
}
