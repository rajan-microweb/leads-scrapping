import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { sendEmail, getPasswordResetEmailHtml } from "@/lib/email"
import crypto from "crypto"

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = forgotPasswordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      )
    }

    const email = parsed.data.email.trim().toLowerCase()

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (user) {
      // Generate reset token
      const token = crypto.randomBytes(32).toString("hex")
      const expires = new Date()
      expires.setHours(expires.getHours() + 1) // Token expires in 1 hour

      // Delete any existing reset tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      })

      // Create new reset token
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token,
          expires,
        },
      })

      // Generate reset URL
      const appUrl = process.env.APP_URL || process.env.AUTH_URL || "http://localhost:3000"
      const resetUrl = `${appUrl}/auth/reset-password?token=${token}`

      // Send email
      const emailSent = await sendEmail({
        to: user.email!,
        subject: "Reset Your Password",
        html: getPasswordResetEmailHtml(resetUrl),
      })

      if (!emailSent) {
        console.error("Failed to send password reset email to:", email)
        // Still return success to prevent information leakage
      }
    }

    // Always return the same success message
    return NextResponse.json(
      { message: "If an account with that email exists, we've sent a password reset link." },
      { status: 200 }
    )
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
