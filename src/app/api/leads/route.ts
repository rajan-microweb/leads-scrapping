import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: leadSheets, error: fetchError } = await supabaseAdmin
      .from('LeadSheets')
      .select(`
        id,
        sheetName,
        uploadedAt,
        sourceFileExtension,
        signature:signatures(name)
      `)
      .eq('userId', session.user.id)
      .order('uploadedAt', { ascending: false })

    if (fetchError) {
      console.error("leads GET fetchError:", fetchError)
      return NextResponse.json(
        { error: "Failed to load lead sheets" },
        { status: 500 }
      )
    }

    const list = (leadSheets || []).map((sheet: any) => {
      const sig = sheet.signature
      const signatureName =
        Array.isArray(sig) && sig[0]?.name != null
          ? sig[0].name
          : sig && typeof sig === "object" && "name" in sig
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
    console.error("leads GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
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
      console.error("leads DELETE JSON parse error:", error)
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      )
    }

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
      console.error("leads DELETE fetch error:", fetchError)
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
      .in("leadFileId", userLeadSheetIds)

    const { error } = await supabaseAdmin
      .from("LeadSheets")
      .delete()
      .in("id", userLeadSheetIds)
      .eq("userId", session.user.id)

    if (error) {
      console.error("leads DELETE error:", error)
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
    console.error("leads DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

