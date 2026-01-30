import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: leadFiles, error: fetchError } = await supabaseAdmin
      .from('LeadFile')
      .select(`
        id,
        fileName,
        uploadedAt,
        signature:signatures(name)
      `)
      .eq('userId', session.user.id)
      .order('uploadedAt', { ascending: false })

    if (fetchError) {
      console.error("leads GET fetchError:", fetchError)
      return NextResponse.json(
        { error: "Failed to load lead files" },
        { status: 500 }
      )
    }

    const list = (leadFiles || []).map((file: any) => {
      const sig = file.signature
      const signatureName =
        Array.isArray(sig) && sig[0]?.name != null
          ? sig[0].name
          : sig && typeof sig === "object" && "name" in sig
            ? (sig as { name: string }).name
            : null
      return {
        id: file.id,
        fileName: file.fileName,
        uploadedAt: file.uploadedAt,
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

    const { data: leadFiles, error: fetchError } = await supabaseAdmin
      .from("LeadFile")
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

    if (!leadFiles || leadFiles.length === 0) {
      return NextResponse.json(
        { error: "No lead files found or access denied" },
        { status: 404 }
      )
    }

    const userLeadFileIds = leadFiles.map((f: { id: string }) => f.id)

    await supabaseAdmin
      .from("LeadRow")
      .delete()
      .in("leadFileId", userLeadFileIds)

    const { error } = await supabaseAdmin
      .from("LeadFile")
      .delete()
      .in("id", userLeadFileIds)
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
        deletedCount: userLeadFileIds.length,
        message: `Successfully deleted ${userLeadFileIds.length} lead file(s)`,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("leads DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

