import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"
import { generateId } from "@/lib/cuid"

type RouteContext = { params: { id: string } }

async function ensureLeadFileAccess(leadFileId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("LeadFile")
    .select("id")
    .eq("id", leadFileId)
    .eq("userId", userId)
    .single()
  if (error || !data) return null
  return data
}

export async function GET(
  _request: Request,
  context: RouteContext
) {
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

    const file = await ensureLeadFileAccess(id, session.user.id)
    if (!file) {
      return NextResponse.json(
        { error: "Lead file not found or access denied" },
        { status: 404 }
      )
    }

    const url = new URL(_request.url)
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10))
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "50", 10))
    )
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data: rows, error: rowsError } = await supabaseAdmin
      .from("LeadRow")
      .select("id, rowIndex, businessEmail, websiteUrl")
      .eq("leadFileId", id)
      .order("rowIndex", { ascending: true })
      .range(from, to)

    if (rowsError) {
      console.error("lead-files/[id]/rows GET error:", rowsError)
      return NextResponse.json(
        { error: "Failed to load rows" },
        { status: 500 }
      )
    }

    const { count, error: countError } = await supabaseAdmin
      .from("LeadRow")
      .select("id", { count: "exact", head: true })
      .eq("leadFileId", id)

    if (countError) {
      return NextResponse.json(
        { rows: rows ?? [], total: (rows ?? []).length },
        { status: 200 }
      )
    }

    return NextResponse.json(
      {
        rows: rows ?? [],
        total: count ?? (rows ?? []).length,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("lead-files/[id]/rows GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  context: RouteContext
) {
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

    const file = await ensureLeadFileAccess(id, session.user.id)
    if (!file) {
      return NextResponse.json(
        { error: "Lead file not found or access denied" },
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

    const single = body.businessEmail !== undefined || body.websiteUrl !== undefined
    const items: { businessEmail?: string; websiteUrl?: string }[] = single
      ? [{ businessEmail: body.businessEmail, websiteUrl: body.websiteUrl }]
      : Array.isArray(body.rows)
        ? body.rows
        : Array.isArray(body)
          ? body
          : []

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Provide at least one row (businessEmail/websiteUrl) or rows array" },
        { status: 400 }
      )
    }

    const { data: maxRow } = await supabaseAdmin
      .from("LeadRow")
      .select("rowIndex")
      .eq("leadFileId", id)
      .order("rowIndex", { ascending: false })
      .limit(1)
      .single()

    let nextIndex = (maxRow?.rowIndex ?? -1) + 1
    const toInsert = items.map((item) => ({
      id: generateId(),
      leadFileId: id,
      rowIndex: nextIndex++,
      businessEmail:
        typeof item.businessEmail === "string"
          ? item.businessEmail.trim() || null
          : null,
      websiteUrl:
        typeof item.websiteUrl === "string"
          ? item.websiteUrl.trim() || null
          : null,
    }))

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("LeadRow")
      .insert(toInsert)
      .select("id, rowIndex, businessEmail, websiteUrl")

    if (insertError) {
      console.error("lead-files/[id]/rows POST error:", insertError)
      return NextResponse.json(
        { error: "Failed to add rows" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      single && inserted?.length === 1
        ? inserted[0]
        : { rows: inserted ?? [] },
      { status: 201 }
    )
  } catch (error) {
    console.error("lead-files/[id]/rows POST error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
