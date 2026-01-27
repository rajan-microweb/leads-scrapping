import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { createId } from "https://esm.sh/@paralleldrive/cuid2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
}

interface RequestBody {
  userId?: string
  platformName?: string
  credentials?: unknown
  metadata?: unknown
}

function jsonResponse(
  data: {
    success: boolean
    error?: string
    hint?: string
    id?: string
    platformName?: string
    isConnected?: boolean
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

    const expectedToken = (
      Deno.env.get("STORE_INTEGRATION_SECRET") ??
      Deno.env.get("N8N_SECRET") ??
      Deno.env.get("SUPABASE_ANON_KEY") ??
      ""
    ).trim()
    if (!expectedToken) {
      return jsonResponse(
        { success: false, error: "Server configuration error: no authorization key configured" },
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
          error: "Unauthorized. Invalid authorization token.",
          hint: "Send header: Authorization: Bearer <key>. Use N8N_SECRET, STORE_INTEGRATION_SECRET, or SUPABASE_ANON_KEY. Ensure the key has no extra spaces, newlines, or a second 'Bearer ' prefix.",
        },
        401
      )
    }

    let body: RequestBody
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ success: false, error: "Invalid JSON in request body" }, 400)
    }

    if (!body || typeof body !== "object") {
      return jsonResponse({ success: false, error: "Invalid JSON in request body" }, 400)
    }

    const userId = typeof body.userId === "string" ? body.userId.trim() : ""
    if (!userId) {
      return jsonResponse(
        { success: false, error: "userId is required and must be a non-empty string" },
        400
      )
    }

    const platformNameRaw = typeof body.platformName === "string" ? body.platformName.trim() : ""
    if (!platformNameRaw) {
      return jsonResponse(
        { success: false, error: "platformName is required and must be a non-empty string" },
        400
      )
    }
    const platformName = platformNameRaw.toLowerCase()

    const credentials = body.credentials
    if (
      credentials === null ||
      typeof credentials !== "object" ||
      Array.isArray(credentials)
    ) {
      return jsonResponse(
        { success: false, error: "credentials is required and must be an object" },
        400
      )
    }

    if (
      body.metadata !== undefined &&
      (body.metadata === null || typeof body.metadata !== "object" || Array.isArray(body.metadata))
    ) {
      return jsonResponse(
        { success: false, error: "metadata must be an object when provided" },
        400
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: userRow, error: userError } = await supabase
      .from("User")
      .select("id")
      .eq("id", userId)
      .limit(1)
      .single()

    if (userError || !userRow) {
      return jsonResponse({ success: false, error: "User not found" }, 404)
    }

    const { data: existing } = await supabase
      .from("integrations")
      .select("id")
      .eq("userId", userId)
      .eq("platformName", platformName)
      .limit(1)
      .single()

    const now = new Date().toISOString()
    const updatePayload: Record<string, unknown> = {
      credentials,
      isConnected: true,
      updatedAt: now,
    }
    if (
      body.metadata !== undefined &&
      typeof body.metadata === "object" &&
      body.metadata !== null &&
      !Array.isArray(body.metadata)
    ) {
      updatePayload.metadata = body.metadata
    }

    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from("integrations")
        .update(updatePayload)
        .eq("id", existing.id)
        .select("id, platformName, isConnected")
        .single()

      if (updateError) {
        console.error("store-integration update error:", updateError)
        return jsonResponse({ success: false, error: "Failed to update integration" }, 500)
      }

      return jsonResponse(
        {
          success: true,
          id: updated!.id,
          platformName: updated!.platformName,
          isConnected: updated!.isConnected,
        },
        200
      )
    }

    const id = createId()
    const insertPayload: Record<string, unknown> = {
      id,
      userId,
      platformName,
      credentials,
      isConnected: true,
      createdAt: now,
      updatedAt: now,
    }
    if (
      body.metadata !== undefined &&
      typeof body.metadata === "object" &&
      body.metadata !== null &&
      !Array.isArray(body.metadata)
    ) {
      insertPayload.metadata = body.metadata
    }

    const { data: inserted, error: insertError } = await supabase
      .from("integrations")
      .insert(insertPayload)
      .select("id, platformName, isConnected")
      .single()

    if (insertError) {
      console.error("store-integration insert error:", insertError)
      return jsonResponse({ success: false, error: "Failed to create integration" }, 500)
    }

    return jsonResponse(
      {
        success: true,
        id: inserted!.id,
        platformName: inserted!.platformName,
        isConnected: inserted!.isConnected,
      },
      200
    )
  } catch (err) {
    console.error("store-integration error:", err)
    return jsonResponse(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      500
    )
  }
})
