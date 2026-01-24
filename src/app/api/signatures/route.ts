import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"
import { sanitizeHtml } from "@/lib/sanitize-html"
import { generateId } from "@/lib/cuid"

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Try selecting all columns first to avoid column name issues
    const { data: signatures, error } = await supabaseAdmin
      .from('signatures')
      .select('*')
      .eq('userId', session.user.id)
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

    // Map the response to ensure consistent field names
    const mappedSignatures = (signatures || []).map((sig: any) => ({
      id: sig.id,
      name: sig.name,
      content: sig.content,
      createdAt: sig.createdAt || sig.createdat || sig['createdAt'],
      updatedAt: sig.updatedAt || sig.updatedat || sig['updatedAt'],
    }))

    return NextResponse.json(mappedSignatures, { status: 200 })
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

    let body
    try {
      body = await request.json()
    } catch (error) {
      console.error("signatures POST JSON parse error:", error)
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      )
    }

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
    // Note: sanitizeHtml will return empty string if input is invalid/null,
    // but will preserve valid HTML content
    const sanitizedContent = sanitizeHtml(rawContent)

    // Allow empty content (user might want to create signature later)
    // But ensure we have at least name
    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
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
      .select('*')
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

    // Map the response to ensure consistent field names
    const mappedSignature = signature ? {
      id: signature.id,
      name: signature.name,
      content: signature.content,
      createdAt: signature.createdAt || signature.createdat || signature['createdAt'],
      updatedAt: signature.updatedAt || signature.updatedat || signature['updatedAt'],
    } : null

    return NextResponse.json(mappedSignature, { status: 201 })
  } catch (error) {
    console.error("signatures POST error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch (error) {
      console.error("signatures PUT JSON parse error:", error)
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      )
    }

    if (!body || typeof body.id !== "string" || !body.id.trim()) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      )
    }

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

    const id = body.id.trim()
    const name = body.name.trim()
    const rawContent = body.content.trim()
    
    // Sanitize HTML content before storing
    const sanitizedContent = sanitizeHtml(rawContent)

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      )
    }

    // First verify the signature exists and belongs to the user
    const { data: existingSignature, error: fetchError } = await supabaseAdmin
      .from('signatures')
      .select('id, userId')
      .eq('id', id)
      .eq('userId', session.user.id)
      .single()

    if (fetchError || !existingSignature) {
      return NextResponse.json(
        { error: "Signature not found or access denied" },
        { status: 404 }
      )
    }

    // Update the signature
    const { data: signature, error } = await supabaseAdmin
      .from('signatures')
      .update({
        name,
        content: sanitizedContent,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('userId', session.user.id)
      .select('*')
      .single()

    if (error) {
      console.error("signatures PUT error:", error)
      console.error("Error details:", JSON.stringify(error, null, 2))
      return NextResponse.json(
        { error: "Internal server error", details: error.message },
        { status: 500 }
      )
    }

    // Map the response to ensure consistent field names
    const mappedSignature = signature ? {
      id: signature.id,
      name: signature.name,
      content: signature.content,
      createdAt: signature.createdAt || signature.createdat || signature['createdAt'],
      updatedAt: signature.updatedAt || signature.updatedat || signature['updatedAt'],
    } : null

    return NextResponse.json(mappedSignature, { status: 200 })
  } catch (error) {
    console.error("signatures PUT error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  // Alias to PUT for consistency
  return PUT(request)
}

export async function DELETE(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch (error) {
      console.error("signatures DELETE JSON parse error:", error)
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      )
    }

    // Support both single ID and array of IDs
    const ids = Array.isArray(body.ids) 
      ? body.ids 
      : body.id 
        ? [body.id] 
        : null

    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { error: "id or ids array is required" },
        { status: 400 }
      )
    }

    // Validate all IDs are strings
    const validIds = ids.filter((id: any) => typeof id === "string" && id.trim())
    if (validIds.length === 0) {
      return NextResponse.json(
        { error: "Valid id(s) are required" },
        { status: 400 }
      )
    }

    // Verify all signatures belong to the user
    const { data: signatures, error: fetchError } = await supabaseAdmin
      .from('signatures')
      .select('id, userId')
      .in('id', validIds)
      .eq('userId', session.user.id)

    if (fetchError) {
      console.error("signatures DELETE fetch error:", fetchError)
      return NextResponse.json(
        { error: "Internal server error", details: fetchError.message },
        { status: 500 }
      )
    }

    if (!signatures || signatures.length === 0) {
      return NextResponse.json(
        { error: "No signatures found or access denied" },
        { status: 404 }
      )
    }

    // Only delete signatures that belong to the user
    const userSignatureIds = signatures.map((sig: any) => sig.id)

    // Delete the signatures
    const { error } = await supabaseAdmin
      .from('signatures')
      .delete()
      .in('id', userSignatureIds)
      .eq('userId', session.user.id)

    if (error) {
      console.error("signatures DELETE error:", error)
      console.error("Error details:", JSON.stringify(error, null, 2))
      return NextResponse.json(
        { error: "Internal server error", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        success: true, 
        deletedCount: userSignatureIds.length,
        message: `Successfully deleted ${userSignatureIds.length} signature(s)` 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("signatures DELETE error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
