import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"
import { generateId } from "@/lib/cuid"

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
          .from('signatures')
          .select('id')
          .eq('id', rawSignatureId)
          .eq('userId', session.user.id)
          .single()

        if (!signature) {
          return NextResponse.json(
            { error: "Invalid signature selected" },
            { status: 400 },
          )
        }

        signatureId = signature.id
      }
    }

    await supabaseAdmin
      .from('LeadSheets')
      .insert({
        id: generateId(),
        userId: session.user.id,
        sheetName,
        ...(signatureId ? { signatureId } : {}),
        uploadedAt: new Date().toISOString(),
      })

    const { data: leadSheets } = await supabaseAdmin
      .from('LeadSheets')
      .select(`
        id,
        sheetName,
        uploadedAt,
        signature:signatures(name)
      `)
      .eq('userId', session.user.id)
      .order('uploadedAt', { ascending: false })

    return NextResponse.json(
      (leadSheets || []).map((sheet: any) => ({
        id: sheet.id,
        sheetName: sheet.sheetName,
        uploadedAt: sheet.uploadedAt,
        signatureName: sheet.signature?.name ?? null,
      })),
      { status: 201 },
    )
  } catch (error) {
    console.error("lead-file POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

