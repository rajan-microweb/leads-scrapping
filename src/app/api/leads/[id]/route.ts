import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = params?.id?.trim()
    if (!id) {
      return NextResponse.json({ error: "Lead sheet id is required" }, { status: 400 })
    }

    const { data: leadSheet, error } = await supabaseAdmin
      .from("LeadSheets")
      .select(`
        id,
        sheetName,
        uploadedAt,
        sourceFileExtension,
        signature:signatures(name)
      `)
      .eq("id", id)
      .eq("userId", session.user.id)
      .single()

    if (error || !leadSheet) {
      return NextResponse.json(
        { error: "Lead sheet not found" },
        { status: 404 }
      )
    }

    const signature = (leadSheet as { signature?: { name: string } | { name: string }[] | null }).signature
    const signatureName =
      Array.isArray(signature) && signature[0]
        ? signature[0].name
        : signature && typeof signature === "object" && "name" in signature
          ? (signature as { name: string }).name
          : null

    return NextResponse.json(
      {
        id: leadSheet.id,
        sheetName: leadSheet.sheetName,
        uploadedAt: leadSheet.uploadedAt,
        sourceFileExtension: leadSheet.sourceFileExtension ?? null,
        signatureName: signatureName ?? null,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("leads [id] GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
