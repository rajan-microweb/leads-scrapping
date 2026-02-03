import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"
import { z } from "zod"
import bcrypt from "bcryptjs"

const bodySchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = String(session.user.id).trim()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Invalid input"
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const { currentPassword, newPassword } = parsed.data

    // Fetch user row including password hash (select * so we get the exact column from DB)
    const { data: user, error: fetchError } = await supabaseAdmin
      .from("User")
      .select("*")
      .eq("id", userId)
      .single()

    if (fetchError || !user) {
      console.error("change-password: user fetch error", fetchError)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const rawPassword = (user as Record<string, unknown>).password
    const storedPasswordHash: string | null =
      typeof rawPassword === "string" ? rawPassword : null

    if (!storedPasswordHash || storedPasswordHash.length === 0) {
      return NextResponse.json(
        { error: "No password set for this account. Use forgot password to set one." },
        { status: 400 }
      )
    }

    // 1. Check that the current password matches the one stored in the DB
    const currentPasswordMatches = await bcrypt.compare(currentPassword, storedPasswordHash)
    if (!currentPasswordMatches) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // 2. Update the new password in the database (same pattern as reset-password)
    const { data: updatedRow, error: updateError } = await supabaseAdmin
      .from("User")
      .update({
        password: hashedPassword,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("id")
      .single()

    if (updateError) {
      console.error("change-password: update error", updateError)
      return NextResponse.json({ error: "Failed to update password" }, { status: 500 })
    }

    if (!updatedRow) {
      console.error("change-password: no row updated for id", userId)
      return NextResponse.json({ error: "Failed to update password" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Password updated successfully" }, { status: 200 })
  } catch (err) {
    console.error("change-password error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
