import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: leadFiles } = await supabaseAdmin
      .from('LeadFile')
      .select(`
        id,
        fileName,
        uploadedAt,
        signature:signatures(name)
      `)
      .eq('userId', session.user.id)
      .order('uploadedAt', { ascending: false })

    return NextResponse.json(
      (leadFiles || []).map((file: any) => ({
        id: file.id,
        fileName: file.fileName,
        uploadedAt: file.uploadedAt,
        signatureName: file.signature?.name ?? null,
      })),
      { status: 200 },
    )
  } catch (error) {
    console.error("leads GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

