import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"

const N8N_SEND_MAIL_WEBHOOK_URL = "https://n8n.srv1248804.hstgr.cloud/webhook/send-mail"

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

    let rowCount: number
    if (Array.isArray(body.rowIds) && body.rowIds.length > 0) {
      rowCount = Math.min(500, body.rowIds.filter((x: unknown) => typeof x === "string").length)
    } else if (typeof body.rowCount === "number" && body.rowCount > 0) {
      rowCount = Math.min(500, Math.floor(body.rowCount))
    } else {
      return NextResponse.json(
        { error: "Provide rowIds or rowCount to specify which rows to run" },
        { status: 400 }
      )
    }

    let signatureDetails: { id: string | null; name: string | null; content: string } = {
      id: null,
      name: null,
      content: "",
    }
    if (sheet.signatureId) {
      const { data: sig } = await supabaseAdmin
        .from("signatures")
        .select("id, name, content")
        .eq("id", sheet.signatureId)
        .eq("userId", session.user.id)
        .single()
      if (sig) {
        signatureDetails = {
          id: sig.id ?? null,
          name: typeof sig.name === "string" ? sig.name : null,
          content: typeof sig.content === "string" ? sig.content : "",
        }
      }
    }

    const n8nPayload = {
      userId: session.user.id,
      leadSheetId: id,
      rowCount,
      signature: signatureDetails,
    }

    try {
      const n8nRes = await fetch(N8N_SEND_MAIL_WEBHOOK_URL, {
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
      { ok: true },
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
