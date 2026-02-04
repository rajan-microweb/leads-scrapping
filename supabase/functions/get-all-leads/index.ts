import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
}

interface LeadRow {
  id: string
  userId: string
  leadSheetId: string
  sheetName: string
  rowIndex: number
  businessEmail: string | null
  websiteUrl: string | null
  emailStatus: string
  hasReplied: "YES" | "NO" | null
  metadata?: unknown
}

function jsonResponse(
  data: {
    success: boolean
    error?: string
    hint?: string
    leads?: LeadRow[]
    count?: number
  },
  status: number
) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function normalizeHasReplied(
  value: unknown
): { filter: "YES" | "NO" | null; error?: string } {
  if (value === undefined || value === null) {
    return { filter: null }
  }

  if (typeof value !== "string") {
    return {
      filter: null,
      error: "hasReplied must be a string when provided",
    }
  }

  const normalized = value.trim().toUpperCase()
  if (!normalized) {
    return { filter: null }
  }

  if (normalized !== "YES" && normalized !== "NO") {
    return {
      filter: null,
      error: "hasReplied must be either 'YES' or 'NO' when provided",
    }
  }

  return { filter: normalized as "YES" | "NO" }
}

function normalizeEmailStatus(value: unknown): { filter: string | null; error?: string } {
  if (value === undefined || value === null) {
    return { filter: null }
  }

  if (typeof value !== "string") {
    return {
      filter: null,
      error: "emailStatus must be a string when provided",
    }
  }

  const normalized = value.trim()
  if (!normalized) {
    return { filter: null }
  }

  return { filter: normalized }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonResponse({ success: false, error: "Missing Supabase configuration" }, 500)
    }

    const expectedToken = Deno.env.get("N8N_SECRET")?.trim() ?? ""
    if (!expectedToken) {
      return jsonResponse(
        { success: false, error: "Server configuration error: N8N_SECRET not configured" },
        500
      )
    }

    const authHeader = req.headers.get("Authorization")
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : null

    if (!bearerToken) {
      return jsonResponse({ success: false, error: "Unauthorized. Bearer token required." }, 401)
    }

    if (bearerToken !== expectedToken) {
      return jsonResponse(
        {
          success: false,
          error: "Unauthorized. Invalid token.",
          hint: "Send header: Authorization: Bearer <N8N_SECRET>. Ensure the key has no extra spaces or newlines.",
        },
        401
      )
    }

    let hasRepliedRaw: unknown = null
    let emailStatusRaw: unknown = null

    if (req.method === "GET") {
      const url = new URL(req.url)
      hasRepliedRaw = url.searchParams.get("hasReplied")
      emailStatusRaw = url.searchParams.get("emailStatus")
    } else {
      let body: Record<string, unknown>
      try {
        const parsed = await req.json()
        if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
          return jsonResponse({ success: false, error: "Request body must be a JSON object" }, 400)
        }
        body = parsed as Record<string, unknown>
      } catch {
        return jsonResponse({ success: false, error: "Invalid JSON in request body" }, 400)
      }
      hasRepliedRaw = body.hasReplied
      emailStatusRaw = body.emailStatus
    }

    const { filter: hasRepliedFilter, error: filterError } = normalizeHasReplied(hasRepliedRaw)

    if (filterError) {
      return jsonResponse({ success: false, error: filterError }, 400)
    }

    const { filter: emailStatusFilter, error: emailStatusError } =
      normalizeEmailStatus(emailStatusRaw)

    if (emailStatusError) {
      return jsonResponse({ success: false, error: emailStatusError }, 400)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let query = supabase
      .from("LeadsData")
      .select(
        "id, userId, leadSheetId, sheetName, rowIndex, businessEmail, websiteUrl, emailStatus, hasReplied, metadata"
      )
      .order("rowIndex", { ascending: true })

    if (hasRepliedFilter !== null) {
      query = query.eq("hasReplied", hasRepliedFilter)
    }

    if (emailStatusFilter !== null) {
      query = query.eq("emailStatus", emailStatusFilter)
    }

    const { data: rows, error } = await query

    if (error) {
      console.error("get-all-leads query error:", error)
      return jsonResponse({ success: false, error: "Failed to fetch leads" }, 500)
    }

    const list = Array.isArray(rows) ? rows : []

    const leads: LeadRow[] = list.map((row: Record<string, unknown>) => {
      const hasReplied = (row.hasReplied as "YES" | "NO" | null) ?? null

      return {
        id: row.id as string,
        userId: row.userId as string,
        leadSheetId: row.leadSheetId as string,
        sheetName: (row.sheetName as string) ?? "",
        rowIndex: Number(row.rowIndex) ?? 0,
        businessEmail: (row.businessEmail as string | null) ?? null,
        websiteUrl: (row.websiteUrl as string | null) ?? null,
        emailStatus: row.emailStatus as string,
        hasReplied,
        metadata: (row as Record<string, unknown>)?.metadata,
      }
    })

    return jsonResponse(
      {
        success: true,
        leads,
        count: leads.length,
      },
      200
    )
  } catch (err) {
    console.error("get-all-leads error:", err)
    return jsonResponse(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      500
    )
  }
})

