import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"
import { generateId } from "@/lib/cuid"

type RouteContext = { params: { id: string } }

async function ensureLeadSheetAccess(leadSheetId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("LeadSheets")
    .select("id, sheetName")
    .eq("id", leadSheetId)
    .eq("userId", userId)
    .single()
  if (error || !data) return null
  return data
}

const ALLOWED_SORT_COLUMNS = ["rowIndex", "businessEmail", "websiteUrl"] as const

function sanitizeSearch(q: string): string {
  return q
    .trim()
    .slice(0, 200)
    .replace(/[%_\\]/g, "")
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

    const sheet = await ensureLeadSheetAccess(id, session.user.id)
    if (!sheet) {
      return NextResponse.json(
        { error: "Lead sheet not found or access denied" },
        { status: 404 }
      )
    }

    const url = new URL(_request.url)
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10))
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "50", 10))
    )
    const searchParam =
      url.searchParams.get("search") ?? url.searchParams.get("q") ?? ""
    const searchTerm = sanitizeSearch(searchParam)
    const sortByParam = url.searchParams.get("sortBy") ?? "rowIndex"
    const sortBy = ALLOWED_SORT_COLUMNS.includes(sortByParam as (typeof ALLOWED_SORT_COLUMNS)[number])
      ? (sortByParam as (typeof ALLOWED_SORT_COLUMNS)[number])
      : "rowIndex"
    const sortOrder =
      url.searchParams.get("sortOrder") === "desc" ? "desc" : "asc"
    const hasEmail = url.searchParams.get("hasEmail")
    const hasUrl = url.searchParams.get("hasUrl")

    let query = supabaseAdmin
      .from("LeadsData")
      .select("id, rowIndex, businessEmail, websiteUrl, sheetName", {
        count: "exact",
      })
      .eq("leadFileId", id)

    if (searchTerm) {
      query = query.or(
        `businessEmail.ilike.%${searchTerm}%,websiteUrl.ilike.%${searchTerm}%`
      )
    }
    if (hasEmail === "true") {
      query = query.not("businessEmail", "is", null)
    }
    if (hasEmail === "false") {
      query = query.is("businessEmail", null)
    }
    if (hasUrl === "true") {
      query = query.not("websiteUrl", "is", null)
    }
    if (hasUrl === "false") {
      query = query.is("websiteUrl", null)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data: rows, error: rowsError, count } = await query
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(from, to)

    if (rowsError) {
      console.error("lead-files/[id]/rows GET error:", rowsError)
      return NextResponse.json(
        { error: "Failed to load rows" },
        { status: 500 }
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
      .from("LeadsData")
      .select("rowIndex")
      .eq("leadFileId", id)
      .order("rowIndex", { ascending: false })
      .limit(1)
      .single()

    const sheetName = sheet?.sheetName ?? ""
    let nextIndex = (maxRow?.rowIndex ?? -1) + 1
    const toInsert = items.map((item) => ({
      id: generateId(),
      leadFileId: id,
      sheetName,
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
      .from("LeadsData")
      .insert(toInsert)
      .select("id, rowIndex, businessEmail, websiteUrl, sheetName")

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

export async function DELETE(
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

    const sheet = await ensureLeadSheetAccess(id, session.user.id)
    if (!sheet) {
      return NextResponse.json(
        { error: "Lead sheet not found or access denied" },
        { status: 404 }
      )
    }

    const body = await request.json().catch(() => null)
    if (!body || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json(
        { error: "Request body must include ids (array of row ids)" },
        { status: 400 }
      )
    }

    const ids = body.ids as string[]
    const uniqueIds = [...new Set(ids)]

    const { data: existingRows, error: fetchError } = await supabaseAdmin
      .from("LeadsData")
      .select("id")
      .eq("leadFileId", id)
      .in("id", uniqueIds)

    if (fetchError) {
      console.error("lead-files/[id]/rows DELETE fetch error:", fetchError)
      return NextResponse.json(
        { error: "Failed to verify rows" },
        { status: 500 }
      )
    }

    const idsToDelete = (existingRows ?? []).map((r) => r.id)
    if (idsToDelete.length === 0) {
      return NextResponse.json({ deleted: 0 }, { status: 200 })
    }

    const { error: deleteError } = await supabaseAdmin
      .from("LeadsData")
      .delete()
      .in("id", idsToDelete)
      .eq("leadFileId", id)

    if (deleteError) {
      console.error("lead-files/[id]/rows DELETE error:", deleteError)
      return NextResponse.json(
        { error: "Failed to delete rows" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { deleted: idsToDelete.length },
      { status: 200 }
    )
  } catch (error) {
    console.error("lead-files/[id]/rows DELETE error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
