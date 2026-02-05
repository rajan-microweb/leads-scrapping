import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"
import { generateId } from "@/lib/cuid"

/**
 * GET /api/lead-files – list lead sheets for the current user
 */
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: leadSheets, error: fetchError } = await supabaseAdmin
      .from("LeadSheets")
      .select(`
        id,
        sheetName,
        uploadedAt,
        sourceFileExtension,
        signature:signatures(name)
      `)
      .eq("userId", session.user.id)
      .order("uploadedAt", { ascending: false })

    if (fetchError) {
      console.error("lead-files GET fetchError:", fetchError)
      return NextResponse.json(
        { error: "Failed to load lead sheets" },
        { status: 500 }
      )
    }

    const list = (leadSheets || []).map((sheet: Record<string, unknown>) => {
      const sig = sheet.signature
      const signatureName =
        Array.isArray(sig) && sig[0] != null && typeof (sig[0] as Record<string, unknown>).name === "string"
          ? (sig[0] as { name: string }).name
          : sig && typeof sig === "object" && sig !== null && "name" in sig
            ? (sig as { name: string }).name
            : null
      return {
        id: sheet.id,
        sheetName: sheet.sheetName,
        uploadedAt: sheet.uploadedAt,
        sourceFileExtension: sheet.sourceFileExtension ?? null,
        signatureName: signatureName ?? null,
      }
    })

    return NextResponse.json(list, { status: 200 })
  } catch (error) {
    console.error("lead-files GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/lead-files – create a new (empty) lead sheet
 */
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)

    const sheetName = typeof body?.sheetName === "string" ? body.sheetName.trim() : ""
    if (!sheetName) {
      return NextResponse.json({ error: "sheetName is required" }, { status: 400 })
    }
    let signatureId: string | null = null

    if (body.signatureId && typeof body.signatureId === "string") {
      const rawSignatureId = body.signatureId.trim()

      if (rawSignatureId) {
        const { data: signature } = await supabaseAdmin
          .from("signatures")
          .select("id")
          .eq("id", rawSignatureId)
          .eq("userId", session.user.id)
          .single()

        if (!signature) {
          return NextResponse.json(
            { error: "Invalid signature selected" },
            { status: 400 }
          )
        }

        signatureId = signature.id
      }
    }

    await supabaseAdmin.from("LeadSheets").insert({
      id: generateId(),
      userId: session.user.id,
      sheetName,
      ...(signatureId ? { signatureId } : {}),
      uploadedAt: new Date().toISOString(),
    })

    const { data: leadSheets } = await supabaseAdmin
      .from("LeadSheets")
      .select(`
        id,
        sheetName,
        uploadedAt,
        signature:signatures(name)
      `)
      .eq("userId", session.user.id)
      .order("uploadedAt", { ascending: false })

    return NextResponse.json(
      (leadSheets || []).map((sheet: Record<string, unknown>) => {
        const sig = sheet.signature
        const signatureName =
          Array.isArray(sig) && sig[0] != null && typeof (sig[0] as Record<string, unknown>).name === "string"
            ? (sig[0] as { name: string }).name
            : sig && typeof sig === "object" && sig !== null && "name" in sig
              ? (sig as { name: string }).name
              : null
        return {
          id: sheet.id,
          sheetName: sheet.sheetName,
          uploadedAt: sheet.uploadedAt,
          signatureName: signatureName ?? null,
        }
      }),
      { status: 201 }
    )
  } catch (error) {
    console.error("lead-files POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * DELETE /api/lead-files – delete one or more lead sheets
 */
export async function DELETE(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body: { ids?: string[]; id?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      )
    }

    const ids = Array.isArray(body.ids)
      ? body.ids
      : typeof body.id === "string"
        ? [body.id]
        : null

    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { error: "id or ids array is required" },
        { status: 400 }
      )
    }

    const validIds = ids.filter((id: unknown) => typeof id === "string" && id.trim())
    if (validIds.length === 0) {
      return NextResponse.json(
        { error: "Valid id(s) are required" },
        { status: 400 }
      )
    }

    const { data: leadSheets, error: fetchError } = await supabaseAdmin
      .from("LeadSheets")
      .select("id, userId")
      .in("id", validIds)
      .eq("userId", session.user.id)

    if (fetchError) {
      console.error("lead-files DELETE fetch error:", fetchError)
      return NextResponse.json(
        { error: "Internal server error", details: fetchError.message },
        { status: 500 }
      )
    }

    if (!leadSheets || leadSheets.length === 0) {
      return NextResponse.json(
        { error: "No lead sheets found or access denied" },
        { status: 404 }
      )
    }

    const userLeadSheetIds = leadSheets.map((s: { id: string }) => s.id)

    await supabaseAdmin
      .from("LeadsData")
      .delete()
      .in("leadSheetId", userLeadSheetIds)

    const { error } = await supabaseAdmin
      .from("LeadSheets")
      .delete()
      .in("id", userLeadSheetIds)
      .eq("userId", session.user.id)

    if (error) {
      console.error("lead-files DELETE error:", error)
      return NextResponse.json(
        { error: "Internal server error", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        deletedCount: userLeadSheetIds.length,
        message: `Successfully deleted ${userLeadSheetIds.length} lead sheet(s)`,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("lead-files DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
