import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"

type RouteContext = { params: { id: string; rowId: string } }

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

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = context.params?.id?.trim()
    const rowId = context.params?.rowId?.trim()
    if (!id || !rowId) {
      return NextResponse.json(
        { error: "Lead sheet id and row id are required" },
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

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { error: "Request body is required" },
        { status: 400 }
      )
    }

    const updates: { businessEmail?: string | null; websiteUrl?: string | null } = {}
    if (body.businessEmail !== undefined) {
      updates.businessEmail =
        typeof body.businessEmail === "string"
          ? body.businessEmail.trim() || null
          : null
    }
    if (body.websiteUrl !== undefined) {
      updates.websiteUrl =
        typeof body.websiteUrl === "string"
          ? body.websiteUrl.trim() || null
          : null
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Provide at least one field to update (businessEmail, websiteUrl)" },
        { status: 400 }
      )
    }

    const { data: row, error: updateError } = await supabaseAdmin
      .from("LeadsData")
      .update(updates)
      .eq("id", rowId)
      .eq("leadFileId", id)
      .select("id, rowIndex, businessEmail, websiteUrl")
      .single()

    if (updateError) {
      if (updateError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Row not found or access denied" },
          { status: 404 }
        )
      }
      console.error("lead-files/[id]/rows/[rowId] PATCH error:", updateError)
      return NextResponse.json(
        { error: "Failed to update row" },
        { status: 500 }
      )
    }

    return NextResponse.json(row, { status: 200 })
  } catch (error) {
    console.error("lead-files/[id]/rows/[rowId] PATCH error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
