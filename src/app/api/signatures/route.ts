import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"
import { sanitizeHtml } from "@/lib/sanitize-html"
import { generateId } from "@/lib/cuid"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: signatures, error } = await supabaseAdmin
      .from('signatures')
      .select('id, name, content, "createdAt", "updatedAt"')
      .eq('userId', session.user.id)
      // Note: Supabase order() may need unquoted column name for camelCase columns
      // If this fails, try: .order('updatedAt', { ascending: false })
      .order('updatedAt', { ascending: false })

    if (error) {
      console.error("signatures GET error:", error)
      console.error("Error details:", JSON.stringify(error, null, 2))
      console.error("Error code:", error.code)
      console.error("Error hint:", error.hint)
      return NextResponse.json(
        { error: "Internal server error", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(signatures || [], { status: 200 })
  } catch (error) {
    console.error("signatures GET error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("Error details:", errorMessage)
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)

    if (!body || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      )
    }

    if (!body || typeof body.content !== "string" || !body.content.trim()) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      )
    }

    const name = body.name.trim()
    const rawContent = body.content.trim()
    
    // Sanitize HTML content before storing
    const sanitizedContent = sanitizeHtml(rawContent)

    if (!sanitizedContent) {
      return NextResponse.json(
        { error: "Invalid HTML content" },
        { status: 400 }
      )
    }

    const { data: signature, error } = await supabaseAdmin
      .from('signatures')
      .insert({
        id: generateId(),
        userId: session.user.id,
        name,
        content: sanitizedContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select('id, name, content, "createdAt", "updatedAt"')
      .single()

    if (error) {
      console.error("signatures POST error:", error)
      console.error("Error details:", JSON.stringify(error, null, 2))
      console.error("Error code:", error.code)
      console.error("Error hint:", error.hint)
      return NextResponse.json(
        { error: "Internal server error", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(signature, { status: 201 })
  } catch (error) {
    console.error("signatures POST error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
