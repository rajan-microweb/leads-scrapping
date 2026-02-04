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
      hasReplied: "YES" | "NO" | null
      metadata?: unknown
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

    const leadId =
      typeof body.leadId === "string" && body.leadId.trim() !== "" ? body.leadId.trim() : ""
    const conversationId =
      typeof body.conversationId === "string" && body.conversationId.trim() !== ""
        ? body.conversationId.trim()
        : ""

    if (!leadId && !conversationId) {
      return jsonResponse(
        {
          success: false,
          error: "At least one identifier is required",
          hint: "Provide leadId or conversationId (non-empty string).",
        },
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
          {
            success: false,
            error: "emailStatus must be a non-empty string when provided",
          },
          400
        )
      }
      payload.emailStatus = status
    }

    if (body.hasReplied !== undefined) {
      if (typeof body.hasReplied !== "string") {
        return jsonResponse(
          { success: false, error: "hasReplied must be a string when provided" },
          400
        )
      }
      const hr = String(body.hasReplied).trim().toUpperCase()
      if (hr !== "YES" && hr !== "NO") {
        return jsonResponse(
          {
            success: false,
            error: "hasReplied must be either 'YES' or 'NO' when provided",
          },
          400
        )
      }
      payload.hasReplied = hr
    }

    // metadata: arbitrary JSON object (stored as JSONB)
    // - null clears metadata
    // - object shallow-merges into existing metadata
    if (body.metadata !== undefined) {
      if (
        body.metadata !== null &&
        (typeof body.metadata !== "object" || Array.isArray(body.metadata))
      ) {
        return jsonResponse(
          { success: false, error: "metadata must be a JSON object or null when provided" },
          400
        )
      }
    }

    if (Object.keys(payload).length === 0) {
      return jsonResponse(
        {
          success: false,
          error: "At least one updatable field is required",
          hint: "Provide one or more of: businessEmail, websiteUrl, emailStatus, metadata",
        },
        400
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let existingQuery = supabase.from("LeadsData").select("id, metadata")

    if (leadId) {
      existingQuery = existingQuery.eq("id", leadId)
    } else {
      // Match conversationId inside the JSON structure of metadata as metadata->>'conversation_id'
      existingQuery = existingQuery.filter("metadata->>conversation_id", "eq", conversationId)
    }

    const { data: existing, error: existErr } = await existingQuery.single()

    if (existErr || !existing) {
      return jsonResponse({ success: false, error: "Lead not found" }, 404)
    }

    if (body.metadata !== undefined) {
      if (body.metadata === null) {
        payload.metadata = null
      } else {
        const existingMetadata =
          existing && typeof (existing as Record<string, unknown>).metadata === "object" &&
          (existing as Record<string, unknown>).metadata !== null &&
          !Array.isArray((existing as Record<string, unknown>).metadata)
            ? ((existing as Record<string, unknown>).metadata as Record<string, unknown>)
            : {}

        payload.metadata = {
          ...existingMetadata,
          ...(body.metadata as Record<string, unknown>),
        }
      }
    }

    let updateQuery = supabase.from("LeadsData").update(payload)

    if (leadId) {
      updateQuery = updateQuery.eq("id", leadId)
    } else {
      // Match conversationId inside metadata JSON, same as for the existence check
      updateQuery = updateQuery.filter("metadata->>conversation_id", "eq", conversationId)
    }

    const { data: updated, error: updateErr } = await updateQuery
      .select("id, rowIndex, businessEmail, websiteUrl, emailStatus, hasReplied, metadata")
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
          emailStatus: updated!.emailStatus as string,
          hasReplied: (updated!.hasReplied as "YES" | "NO" | null) ?? null,
          metadata: (updated as Record<string, unknown>)?.metadata,
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
