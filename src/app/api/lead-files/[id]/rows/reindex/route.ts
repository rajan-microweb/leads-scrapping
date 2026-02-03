import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"

type RouteContext = { params: { id: string } }

async function ensureLeadSheetAccess(leadSheetId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("LeadSheets")
    .select("id")
    .eq("id", leadSheetId)
    .eq("userId", userId)
    .single()
  if (error || !data) return null
  return data
}

/**
 * POST /api/lead-files/[id]/rows/reindex
 * Re-sequences rowIndex for all rows in the sheet to 0, 1, 2, ...
 * Call on lead sheet load to fix gaps (e.g. 1, 2, 6 → 1, 2, 3).
 */
export async function POST(_request: Request, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = context.params?.id?.trim()
    if (!id) {
      return NextResponse.json(
        { error: "Lead file id is required" },
        { status: 400 }
      )
    }

    const sheet = await ensureLeadSheetAccess(id, session.user.id)
    if (!sheet) {
      return NextResponse.json(
        { error: "Lead sheet not found or access denied" },
        { status: 404 }
      )
    }

    const { data: remaining, error: fetchError } = await supabaseAdmin
      .from("LeadsData")
      .select("id")
      .eq("leadSheetId", id)
      .order("rowIndex", { ascending: true })

    if (fetchError) {
      console.error("lead-files/[id]/rows/reindex fetch error:", fetchError)
      return NextResponse.json(
        { error: "Failed to load rows" },
        { status: 500 }
      )
    }

    if (!remaining || remaining.length === 0) {
      return NextResponse.json({ ok: true, updated: 0 }, { status: 200 })
    }

    const updateResults = await Promise.all(
      remaining.map((row, index) =>
        supabaseAdmin
          .from("LeadsData")
          .update({ rowIndex: index })
          .eq("id", row.id)
          .eq("leadSheetId", id)
      )
    )
    const reindexError = updateResults.find((r) => r.error)
    if (reindexError?.error) {
      console.error("lead-files/[id]/rows/reindex update error:", reindexError.error)
      return NextResponse.json(
        { error: "Failed to re-sequence row numbers" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { ok: true, updated: remaining.length },
      { status: 200 }
    )
  } catch (error) {
    console.error("lead-files/[id]/rows/reindex error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
