import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: latest } = await supabaseAdmin
      .from('WebsiteSubmission')
      .select('id')
      .eq('userId', session.user.id)
      .order('createdAt', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json(
      {
        hasProfile: !!latest,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("profile-status GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

