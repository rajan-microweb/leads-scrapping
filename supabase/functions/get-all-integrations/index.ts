import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
}

/** Extensible filters for integrations query. Only platform is implemented initially. */
interface Filters {
  platform?: string
  // Future: userId?: string; isConnected?: boolean; createdAfter?: string; createdBefore?: string;
}

function jsonResponse(
  data: { success: boolean; error?: string; hint?: string; integrations?: unknown[]; count?: number },
  status: number
) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function normalizePlatform(value: unknown): string {
  if (typeof value !== "string") return ""
  return value.trim().toLowerCase()
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

    let platform = ""

    if (req.method === "GET") {
      const url = new URL(req.url)
      platform = normalizePlatform(url.searchParams.get("platform") ?? "")
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
      platform = normalizePlatform(body.platform ?? "")
    }

    const filters: Filters = platform ? { platform } : {}

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let query = supabase
      .from("integrations")
      .select(
        "id, userId, platformName, isConnected, metadata, graphSubscription, createdAt, updatedAt, credentials"
      )
      .order("createdAt", { ascending: false })

    if (filters.platform) {
      query = query.eq("platformName", filters.platform)
    }
    // Future: if (filters.userId) query = query.eq("userId", filters.userId);
    // Future: if (filters.isConnected !== undefined) query = query.eq("isConnected", filters.isConnected);
    // Future: if (filters.createdAfter) query = query.gte("createdAt", filters.createdAfter);
    // Future: if (filters.createdBefore) query = query.lte("createdAt", filters.createdBefore);

    const { data: rows, error } = await query

    if (error) {
      console.error("get-all-integrations query error:", error)
      return jsonResponse({ success: false, error: "Failed to fetch integrations" }, 500)
    }

    const list = Array.isArray(rows) ? rows : []

    const integrations = list.map((row: Record<string, unknown>) => ({
      id: row.id,
      userId: row.userId,
      platformName: row.platformName,
      isConnected: row.isConnected,
      metadata: row.metadata ?? null,
      graphSubscription: row.graphSubscription ?? null,
      credentials: row.credentials ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }))

    return jsonResponse(
      { success: true, integrations, count: integrations.length },
      200
    )
  } catch (err) {
    console.error("get-all-integrations error:", err)
    return jsonResponse(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      500
    )
  }
})
