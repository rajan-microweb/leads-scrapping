import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
}

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 1000

interface LeadRow {
  id: string
  leadSheetId: string
  sheetName: string
  rowIndex: number
  businessEmail: string | null
  websiteUrl: string | null
  emailStatus: string
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

function parseLimit(value: unknown): number {
  if (value === undefined || value === null) return DEFAULT_LIMIT
  const n = typeof value === "string" ? parseInt(value, 10) : Number(value)
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT
  return Math.min(Math.floor(n), MAX_LIMIT)
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

    let leadSheetId = ""
    let limit = DEFAULT_LIMIT
    let emailStatus: string | null = null

    if (req.method === "GET") {
      const url = new URL(req.url)
      leadSheetId = (url.searchParams.get("leadSheetId") ?? "").trim()
      limit = parseLimit(url.searchParams.get("limit"))
      const es = url.searchParams.get("emailStatus")
      emailStatus = typeof es === "string" && es.trim() !== "" ? es.trim() : null
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
      leadSheetId = typeof body.leadSheetId === "string" ? body.leadSheetId.trim() : ""
      limit = parseLimit(body.limit)
      const es = body.emailStatus
      emailStatus = typeof es === "string" && es.trim() !== "" ? es.trim() : null
    }

    if (!leadSheetId) {
      return jsonResponse(
        { success: false, error: "leadSheetId is required and must be a non-empty string" },
        400
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let query = supabase
      .from("LeadsData")
      .select("id, leadSheetId, sheetName, rowIndex, businessEmail, websiteUrl, emailStatus")
      .eq("leadSheetId", leadSheetId)
      .order("rowIndex", { ascending: true })
      .limit(limit)

    if (emailStatus !== null) {
      query = query.eq("emailStatus", emailStatus)
    }

    const { data: rows, error } = await query

    if (error) {
      console.error("get-leads query error:", error)
      return jsonResponse({ success: false, error: "Failed to fetch leads" }, 500)
    }

    const list = Array.isArray(rows) ? rows : []
    const leads: LeadRow[] = list.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      leadSheetId: row.leadSheetId as string,
      sheetName: (row.sheetName as string) ?? "",
      rowIndex: Number(row.rowIndex) ?? 0,
      businessEmail: row.businessEmail as string | null ?? null,
      websiteUrl: row.websiteUrl as string | null ?? null,
      emailStatus: (row.emailStatus as string) ?? "Pending",
    }))

    return jsonResponse(
      { success: true, leads, count: leads.length },
      200
    )
  } catch (err) {
    console.error("get-leads error:", err)
    return jsonResponse(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      500
    )
  }
})
