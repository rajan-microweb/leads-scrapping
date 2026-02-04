import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
}

interface IntegrationRow {
  id: string
  userId: string
  platformName: string
  isConnected: boolean
  credentials?: unknown
  metadata?: unknown
  graphSubscription?: unknown
  createdAt?: string
  updatedAt?: string
}

interface JsonResponse {
  success: boolean
  error?: string
  hint?: string
  integration?: IntegrationRow | null
}

function jsonResponse(data: JsonResponse, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
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

    let userIdRaw: unknown = null
    let subscriptionIdRaw: unknown = null

    if (req.method === "GET") {
      const url = new URL(req.url)
      userIdRaw = url.searchParams.get("userId")
      subscriptionIdRaw = url.searchParams.get("subscriptionId")
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
      userIdRaw = body.userId
      subscriptionIdRaw = body.subscriptionId
    }

    const userId =
      typeof userIdRaw === "string" && userIdRaw.trim() !== "" ? userIdRaw.trim() : null
    const subscriptionId =
      typeof subscriptionIdRaw === "string" && subscriptionIdRaw.trim() !== ""
        ? subscriptionIdRaw.trim()
        : null

    const providedConditions = [userId, subscriptionId].filter((v) => v !== null).length

    if (providedConditions === 0) {
      return jsonResponse(
        {
          success: false,
          error: "At least one condition is required",
          hint: "Provide exactly one of: userId, subscriptionId",
        },
        400
      )
    }

    if (providedConditions > 1) {
      return jsonResponse(
        {
          success: false,
          error: "Only one condition is allowed per request",
          hint: "Provide either userId or subscriptionId, but not both",
        },
        400
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let query = supabase
      .from("integrations")
      .select(
        "id, userId, platformName, isConnected, credentials, metadata, graphSubscription, createdAt, updatedAt"
      )
      .limit(1)

    if (userId) {
      query = query.eq("userId", userId)
    } else if (subscriptionId) {
      // Match subscriptionId inside the JSON structure of graphSubscription
      // Uses PostgreSQL JSON path operator; handles non-existent keys by returning no rows.
      query = query.filter("graphSubscription->>subscriptionId", "eq", subscriptionId)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === "PGRST116" || error.details?.includes("Results contain 0 rows")) {
        // No rows found
        return jsonResponse({ success: true, integration: null }, 200)
      }

      console.error("get-integration query error:", error)
      return jsonResponse(
        {
          success: false,
          error: "Failed to fetch integration",
        },
        500
      )
    }

    if (!data) {
      return jsonResponse({ success: true, integration: null }, 200)
    }

    const integration: IntegrationRow = {
      id: data.id as string,
      userId: data.userId as string,
      platformName: data.platformName as string,
      isConnected: Boolean(data.isConnected),
      credentials: (data as Record<string, unknown>)?.credentials,
      metadata: (data as Record<string, unknown>)?.metadata,
      graphSubscription: (data as Record<string, unknown>)?.graphSubscription,
      createdAt: (data as Record<string, unknown>)?.createdAt as string | undefined,
      updatedAt: (data as Record<string, unknown>)?.updatedAt as string | undefined,
    }

    return jsonResponse({ success: true, integration }, 200)
  } catch (err) {
    console.error("get-integration error:", err)
    return jsonResponse(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal server error",
      },
      500
    )
  }
})

