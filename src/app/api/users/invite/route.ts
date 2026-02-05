import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import crypto from "crypto"

import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"
import { generateId } from "@/lib/cuid"
import { sendEmail, getPasswordResetEmailHtml } from "@/lib/email"

const inviteSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["ADMIN", "CLIENT"]),
})

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const parsed = inviteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const name = parsed.data.name.trim()
    const email = parsed.data.email.trim().toLowerCase()
    const role = parsed.data.role

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from("User")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists." },
        { status: 400 }
      )
    }

    // Create user with a random temporary password
    const tempPassword = crypto.randomBytes(16).toString("hex")
    const hashedPassword = await bcrypt.hash(tempPassword, 10)

    const now = new Date().toISOString()
    const newUserId = generateId()

    const { data: insertedUser, error: insertError } = await supabaseAdmin
      .from("User")
      .insert({
        id: newUserId,
        name,
        fullName: name,
        email,
        password: hashedPassword,
        role,
        emailVerified: null,
        createdAt: now,
        updatedAt: now,
      })
      .select('id, name, email, role, "createdAt", "updatedAt"')
      .single()

    if (insertError || !insertedUser) {
      console.error("users/invite insert error:", insertError)
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      )
    }

    // Create a password reset token so the invited user can set their password
    const resetToken = crypto.randomBytes(32).toString("hex")
    const expires = new Date()
    expires.setHours(expires.getHours() + 24) // Invitation link valid for 24 hours

    // Remove existing tokens for this user, if any
    await supabaseAdmin
      .from("PasswordResetToken")
      .delete()
      .eq("userId", insertedUser.id)

    await supabaseAdmin.from("PasswordResetToken").insert({
      id: generateId(),
      userId: insertedUser.id,
      token: resetToken,
      expires: expires.toISOString(),
      createdAt: now,
    })

    const appUrl =
      process.env.APP_URL || process.env.AUTH_URL || "http://localhost:3000"
    const resetUrl = `${appUrl}/auth/reset-password?token=${resetToken}`

    const inviteHtml = getPasswordResetEmailHtml(resetUrl).replace(
      "Password Reset Request",
      "You’ve been invited"
    )

    // Send invitation email (reusing the reset-password template for simplicity)
    const emailSent = await sendEmail({
      to: insertedUser.email!,
      subject: "You’ve been invited to access the admin panel",
      html: inviteHtml,
    })

    if (!emailSent) {
      console.error("Failed to send invitation email to:", email)
      // Continue anyway; the admin can resend manually via forgot-password
    }

    return NextResponse.json(
      {
        id: insertedUser.id,
        name: insertedUser.name,
        email: insertedUser.email,
        role: insertedUser.role,
        createdAt: new Date(insertedUser.createdAt).toISOString(),
        updatedAt: insertedUser.updatedAt
          ? new Date(insertedUser.updatedAt).toISOString()
          : undefined,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("users/invite POST error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

