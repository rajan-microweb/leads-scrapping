import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"
import { generateId } from "@/lib/cuid"

type RouteContext = { params: { id: string } }

async function ensureLeadSheetAccess(leadSheetId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("LeadSheets")
    .select("id, sheetName, signatureId")
    .eq("id", leadSheetId)
    .eq("userId", userId)
    .single()
  if (error || !data) return null
  return data
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
        { error: "Lead sheet id is required" },
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

    const action = typeof body.action === "string" ? body.action.trim() : "send_mail"
    if (action !== "send_mail") {
      return NextResponse.json(
        { error: "Only send_mail action is supported" },
        { status: 400 }
      )
    }

    let rowIds: string[] = []
    if (Array.isArray(body.rowIds) && body.rowIds.length > 0) {
      rowIds = body.rowIds.filter((x: unknown) => typeof x === "string").slice(0, 500)
    } else if (typeof body.rowCount === "number" && body.rowCount > 0) {
      const count = Math.min(500, Math.floor(body.rowCount))
      const { data: rows } = await supabaseAdmin
        .from("LeadsData")
        .select("id")
        .eq("leadFileId", id)
        .order("rowIndex", { ascending: true })
        .limit(count)
      rowIds = (rows ?? []).map((r) => r.id)
    }

    if (rowIds.length === 0) {
      return NextResponse.json(
        { error: "Provide rowIds or rowCount to specify which rows to run" },
        { status: 400 }
      )
    }

    const { data: rows, error: rowsError } = await supabaseAdmin
      .from("LeadsData")
      .select("id, businessEmail, websiteUrl")
      .eq("leadFileId", id)
      .in("id", rowIds)
      .order("rowIndex", { ascending: true })

    if (rowsError || !rows || rows.length === 0) {
      return NextResponse.json(
        { error: "No matching rows found" },
        { status: 400 }
      )
    }

    let signatureContent = ""
    if (sheet.signatureId) {
      const { data: sig } = await supabaseAdmin
        .from("signatures")
        .select("content")
        .eq("id", sheet.signatureId)
        .eq("userId", session.user.id)
        .single()
      if (sig?.content) {
        signatureContent = typeof sig.content === "string" ? sig.content : ""
      }
    }

    const callbackToken = generateId()
    const statuses: Record<string, string> = {}
    for (const r of rows) {
      statuses[r.id] = "pending"
    }

    const { data: actionRun, error: insertError } = await supabaseAdmin
      .from("ActionRuns")
      .insert({
        id: generateId(),
        leadFileId: id,
        userId: session.user.id,
        action,
        rowIds: rows.map((r) => r.id),
        statuses,
        callbackToken,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (insertError) {
      console.error("run-action ActionRuns insert error:", insertError)
      return NextResponse.json(
        { error: "Failed to create action run" },
        { status: 500 }
      )
    }

    const appUrl = process.env.APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000"
    const callbackUrl = `${appUrl.replace(/\/$/, "")}/api/n8n-callback?token=${callbackToken}`

    const n8nWebhookUrl = process.env.N8N_LEADS_WEBHOOK_URL
    if (!n8nWebhookUrl) {
      console.error("N8N_LEADS_WEBHOOK_URL is not configured")
      return NextResponse.json(
        { error: "n8n webhook is not configured" },
        { status: 500 }
      )
    }

    const leadsPayload = rows.map((r) => ({
      row_id: r.id,
      "Business Emails": r.businessEmail ?? "",
      "Website URL": r.websiteUrl ?? "",
    }))

    const n8nPayload = {
      userId: session.user.id,
      callbackUrl,
      callbackToken,
      signatureContent,
      leads: leadsPayload,
    }

    try {
      const n8nRes = await fetch(n8nWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(n8nPayload),
      })

      if (!n8nRes.ok) {
        console.error("n8n webhook error:", n8nRes.status, await n8nRes.text())
        return NextResponse.json(
          { error: "Failed to trigger n8n workflow" },
          { status: 502 }
        )
      }
    } catch (fetchErr) {
      console.error("n8n webhook fetch error:", fetchErr)
      return NextResponse.json(
        { error: "Failed to trigger n8n workflow" },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { jobId: actionRun?.id, statuses },
      { status: 201 }
    )
  } catch (error) {
    console.error("lead-files/[id]/run-action POST error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
