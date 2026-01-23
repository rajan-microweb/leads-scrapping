import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import { z } from "zod"
import bcrypt from "bcryptjs"

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
})

// GET endpoint to validate token
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        { valid: false, error: "Token is required" },
        { status: 400 }
      )
    }

    // Find token in database
    const { data: resetToken } = await supabaseAdmin
      .from('PasswordResetToken')
      .select('*, User(*)')
      .eq('token', token)
      .single()

    if (!resetToken) {
      return NextResponse.json(
        { valid: false, error: "Invalid token" },
        { status: 400 }
      )
    }

    // Check if token is expired
    if (new Date(resetToken.expires) < new Date()) {
      // Delete expired token
      await supabaseAdmin
        .from('PasswordResetToken')
        .delete()
        .eq('id', resetToken.id)
      return NextResponse.json(
        { valid: false, error: "Token has expired" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { valid: true },
      { status: 200 }
    )
  } catch (error) {
    console.error("Token validation error:", error)
    return NextResponse.json(
      { valid: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST endpoint to reset password
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = resetPasswordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input. Password must be at least 6 characters." },
        { status: 400 }
      )
    }

    const { token, password } = parsed.data

    // Find token in database
    const { data: resetToken } = await supabaseAdmin
      .from('PasswordResetToken')
      .select('*, User(*)')
      .eq('token', token)
      .single()

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      )
    }

    // Check if token is expired
    if (new Date(resetToken.expires) < new Date()) {
      // Delete expired token
      await supabaseAdmin
        .from('PasswordResetToken')
        .delete()
        .eq('id', resetToken.id)
      return NextResponse.json(
        { error: "Reset token has expired. Please request a new one." },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Update user password
    await supabaseAdmin
      .from('User')
      .update({
        password: hashedPassword,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', resetToken.userId)

    // Delete the used token
    await supabaseAdmin
      .from('PasswordResetToken')
      .delete()
      .eq('id', resetToken.id)

    return NextResponse.json(
      { message: "Password reset successfully" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Reset password error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
