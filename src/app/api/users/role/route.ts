import { NextResponse } from "next/server"
import { z } from "zod"

import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"

const bodySchema = z.object({
  userId: z.string().min(1),
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

    const json = await request.json()
    const parsed = bodySchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const { userId, role } = parsed.data

    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot change your own role." },
        { status: 400 },
      )
    }

    const { data: updated, error } = await supabaseAdmin
      .from('User')
      .update({
        role,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('id, name, email, role, "createdAt", "updatedAt"')
      .single()

    if (error) {
      console.error("users/role POST error:", error)
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        createdAt: new Date(updated.createdAt).toISOString(),
        updatedAt: updated.updatedAt
          ? new Date(updated.updatedAt).toISOString()
          : undefined,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("users/role POST error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

