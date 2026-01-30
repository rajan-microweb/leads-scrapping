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
      return NextResponse.json({ error: "Lead file id is required" }, { status: 400 })
    }

    const { data: leadFile, error } = await supabaseAdmin
      .from("LeadFile")
      .select(`
        id,
        fileName,
        uploadedAt,
        signature:signatures(name)
      `)
      .eq("id", id)
      .eq("userId", session.user.id)
      .single()

    if (error || !leadFile) {
      return NextResponse.json(
        { error: "Lead file not found" },
        { status: 404 }
      )
    }

    const signature = (leadFile as { signature?: { name: string } | { name: string }[] | null }).signature
    const signatureName =
      Array.isArray(signature) && signature[0]
        ? signature[0].name
        : signature && typeof signature === "object" && "name" in signature
          ? (signature as { name: string }).name
          : null

    return NextResponse.json(
      {
        id: leadFile.id,
        fileName: leadFile.fileName,
        uploadedAt: leadFile.uploadedAt,
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
