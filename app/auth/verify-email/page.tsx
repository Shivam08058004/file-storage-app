"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle2, XCircle, Loader2, Mail, Clock } from "lucide-react"
import Link from "next/link"

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get("token")

  const [status, setStatus] = useState<"loading" | "success" | "error" | "expired" | "resend">(
    token ? "loading" : "resend"
  )
  const [message, setMessage] = useState("")
  const [email, setEmail] = useState("")
  const [resendLoading, setResendLoading] = useState(false)

  // Verify token on mount if token exists
  useEffect(() => {
    if (token) {
      verifyEmail(token)
    }
  }, [token])

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await fetch(
        `/api/auth/verify-email?token=${verificationToken}`
      )
      const data = await response.json()

      if (data.success) {
        setStatus("success")
        setMessage(data.message)
        
        // Redirect to signin after 3 seconds
        setTimeout(() => {
          router.push("/auth/signin?verified=true")
        }, 3000)
      } else {
        if (data.expired) {
          setStatus("expired")
        } else {
          setStatus("error")
        }
        setMessage(data.error || "Verification failed")
      }
    } catch (error) {
      console.error("[v0] Verification error:", error)
      setStatus("error")
      setMessage("Something went wrong. Please try again.")
    }
  }

  const handleResendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      setMessage("Please enter your email address")
      return
    }

    setResendLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage("Verification email sent! Please check your inbox.")
        setEmail("")
      } else {
        setMessage(data.error || "Failed to send email")
      }
    } catch (error) {
      console.error("[v0] Resend error:", error)
      setMessage("Something went wrong. Please try again.")
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === "loading" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
              <CardTitle>Verifying Your Email</CardTitle>
              <CardDescription>Please wait while we verify your email address...</CardDescription>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>Email Verified!</CardTitle>
              <CardDescription>
                Your email has been successfully verified. Redirecting to sign in...
              </CardDescription>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle>Verification Failed</CardTitle>
              <CardDescription>{message}</CardDescription>
            </>
          )}

          {status === "expired" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
              <CardTitle>Link Expired</CardTitle>
              <CardDescription>
                Your verification link has expired. Please request a new one below.
              </CardDescription>
            </>
          )}

          {status === "resend" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle>Verify Your Email</CardTitle>
              <CardDescription>
                Enter your email address to receive a verification link
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {(status === "resend" || status === "expired") && (
            <form onSubmit={handleResendEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {message && (
                <p className="text-sm text-muted-foreground">{message}</p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={resendLoading}
              >
                {resendLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Verification Email"
                )}
              </Button>
            </form>
          )}

          {status === "success" && (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                You can now sign in to your account
              </p>
              <Button asChild className="w-full">
                <Link href="/auth/signin">Go to Sign In</Link>
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-3">
              <Button
                onClick={() => {
                  setStatus("resend")
                  setMessage("")
                }}
                className="w-full"
              >
                Request New Verification Link
              </Button>
            </div>
          )}

          <div className="pt-4 text-center">
            <Link
              href="/auth/signin"
              className="text-sm text-muted-foreground hover:underline"
            >
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
