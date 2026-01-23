import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { generateId } from "@/lib/cuid"

const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    )
  }

  try {
    const parsed = signupSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      )
    }

    const { name, password } = parsed.data
    const email = parsed.data.email.trim().toLowerCase()

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('User')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const { error: insertError } = await supabaseAdmin
      .from('User')
      .insert({
        id: generateId(),
        name,
        fullName: name,
        email,
        password: hashedPassword,
        // Mark email as verified on signup for now. If you later add a real
        // email verification flow, this should be moved to the verification step.
        emailVerified: new Date().toISOString(),
        role: 'CLIENT',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

    if (insertError) {
      console.error("Signup error:", insertError)
      // Unique constraint violation (PostgreSQL error code 23505)
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: "User already exists" },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: "User created successfully" },
      { status: 201 }
    )
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
