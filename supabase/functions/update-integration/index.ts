import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
}

function jsonResponse(
  data: {
    success: boolean
    error?: string
    hint?: string
    id?: string
    platformName?: string
    isConnected?: boolean
    metadata?: unknown
    updatedAt?: string
  },
  status: number
) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
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

    const integrationId = typeof body.integrationId === "string" ? body.integrationId.trim() : ""
    if (!integrationId) {
      return jsonResponse(
        { success: false, error: "integrationId is required and must be a non-empty string" },
        400
      )
    }

    const payload: Record<string, unknown> = {}

    if (body.credentials !== undefined) {
      const credentials = body.credentials
      if (
        typeof credentials !== "object" ||
        credentials === null ||
        Array.isArray(credentials)
      ) {
        return jsonResponse(
          { success: false, error: "credentials must be an object when provided" },
          400
        )
      }
      payload.credentials = credentials
    }

    if (body.metadata !== undefined) {
      const metadata = body.metadata
      if (metadata !== null && (typeof metadata !== "object" || Array.isArray(metadata))) {
        return jsonResponse(
          { success: false, error: "metadata must be an object or null when provided" },
          400
        )
      }
      payload.metadata = metadata
    }

    if (body.isConnected !== undefined) {
      if (typeof body.isConnected !== "boolean") {
        return jsonResponse(
          { success: false, error: "isConnected must be a boolean when provided" },
          400
        )
      }
      payload.isConnected = body.isConnected
    }

    if (body.graphSubscription !== undefined) {
      const graphSubscription = body.graphSubscription
      if (
        graphSubscription === null ||
        typeof graphSubscription !== "object" ||
        Array.isArray(graphSubscription)
      ) {
        return jsonResponse(
          { success: false, error: "graphSubscription must be an object when provided" },
          400
        )
      }
      payload.graphSubscription = graphSubscription
    }

    if (Object.keys(payload).length === 0) {
      return jsonResponse(
        {
          success: false,
          error:
            "At least one of credentials, metadata, isConnected, or graphSubscription is required",
        },
        400
      )
    }

    payload.updatedAt = new Date().toISOString()

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: existing, error: existErr } = await supabase
      .from("integrations")
      .select("id")
      .eq("id", integrationId)
      .single()

    if (existErr || !existing) {
      return jsonResponse({ success: false, error: "Integration not found" }, 404)
    }

    const { data: updated, error: updateErr } = await supabase
      .from("integrations")
      .update(payload)
      .eq("id", integrationId)
      .select("id, platformName, isConnected, metadata, updatedAt")
      .single()

    if (updateErr) {
      console.error("update-integration update error:", updateErr)
      return jsonResponse({ success: false, error: "Failed to update integration" }, 500)
    }

    return jsonResponse(
      {
        success: true,
        id: updated!.id,
        platformName: updated!.platformName,
        isConnected: updated!.isConnected,
        metadata: updated!.metadata ?? null,
        updatedAt: updated!.updatedAt,
      },
      200
    )
  } catch (err) {
    console.error("update-integration error:", err)
    return jsonResponse(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      500
    )
  }
})
