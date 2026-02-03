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
    lead?: {
      id: string
      rowIndex: number
      businessEmail: string | null
      websiteUrl: string | null
      emailStatus: string
    }
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

  if (req.method !== "POST" && req.method !== "PATCH") {
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

    const leadId = typeof body.leadId === "string" ? body.leadId.trim() : ""
    if (!leadId) {
      return jsonResponse(
        { success: false, error: "leadId is required and must be a non-empty string" },
        400
      )
    }

    const payload: Record<string, unknown> = {}

    if (body.businessEmail !== undefined) {
      if (body.businessEmail !== null && typeof body.businessEmail !== "string") {
        return jsonResponse(
          { success: false, error: "businessEmail must be a string or null when provided" },
          400
        )
      }
      payload.businessEmail = body.businessEmail === null ? null : String(body.businessEmail).trim() || null
    }

    if (body.websiteUrl !== undefined) {
      if (body.websiteUrl !== null && typeof body.websiteUrl !== "string") {
        return jsonResponse(
          { success: false, error: "websiteUrl must be a string or null when provided" },
          400
        )
      }
      payload.websiteUrl = body.websiteUrl === null ? null : String(body.websiteUrl).trim() || null
    }

    if (body.emailStatus !== undefined) {
      if (typeof body.emailStatus !== "string") {
        return jsonResponse(
          { success: false, error: "emailStatus must be a string when provided" },
          400
        )
      }
      const status = String(body.emailStatus).trim()
      if (!status) {
        return jsonResponse(
          { success: false, error: "emailStatus must be a non-empty string when provided" },
          400
        )
      }
      payload.emailStatus = status
    }

    if (Object.keys(payload).length === 0) {
      return jsonResponse(
        {
          success: false,
          error: "At least one updatable field is required",
          hint: "Provide one or more of: businessEmail, websiteUrl, emailStatus",
        },
        400
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: existing, error: existErr } = await supabase
      .from("LeadsData")
      .select("id")
      .eq("id", leadId)
      .single()

    if (existErr || !existing) {
      return jsonResponse({ success: false, error: "Lead not found" }, 404)
    }

    const { data: updated, error: updateErr } = await supabase
      .from("LeadsData")
      .update(payload)
      .eq("id", leadId)
      .select("id, rowIndex, businessEmail, websiteUrl, emailStatus")
      .single()

    if (updateErr) {
      console.error("update-leads update error:", updateErr)
      return jsonResponse({ success: false, error: "Failed to update lead" }, 500)
    }

    return jsonResponse(
      {
        success: true,
        lead: {
          id: updated!.id,
          rowIndex: updated!.rowIndex,
          businessEmail: updated!.businessEmail ?? null,
          websiteUrl: updated!.websiteUrl ?? null,
          emailStatus: updated!.emailStatus ?? "Pending",
        },
      },
      200
    )
  } catch (err) {
    console.error("update-leads error:", err)
    return jsonResponse(
      { success: false, error: err instanceof Error ? err.message : "Internal server error" },
      500
    )
  }
})
