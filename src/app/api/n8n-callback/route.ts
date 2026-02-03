import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"

export async function POST(request: Request) {
  try {
    const url = new URL(request.url)
    const token = url.searchParams.get("token")?.trim()

    if (!token) {
      return NextResponse.json(
        { error: "Missing token" },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body.rowId !== "string" || typeof body.status !== "string") {
      return NextResponse.json(
        { error: "Body must include rowId (string) and status (string)" },
        { status: 400 }
      )
    }

    const { rowId, status } = body
    const validStatuses = ["completed", "failed"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "status must be 'completed' or 'failed'" },
        { status: 400 }
      )
    }

    const { data: actionRun, error: fetchError } = await supabaseAdmin
      .from("ActionRuns")
      .select("id, statuses")
      .eq("callbackToken", token)
      .single()

    if (fetchError || !actionRun) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 404 }
      )
    }

    const currentStatuses = (actionRun.statuses as Record<string, string>) ?? {}
    const updatedStatuses = { ...currentStatuses, [rowId]: status }

    const { error: updateError } = await supabaseAdmin
      .from("ActionRuns")
      .update({
        statuses: updatedStatuses,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", actionRun.id)

    if (updateError) {
      console.error("n8n-callback update error:", updateError)
      return NextResponse.json(
        { error: "Failed to update status" },
        { status: 500 }
      )
    }

    // Keep LeadsData.emailStatus in sync when n8n reports completed/failed
    const { error: leadsUpdateError } = await supabaseAdmin
      .from("LeadsData")
      .update({ emailStatus: status === "completed" ? "Completed" : "Failed" })
      .eq("id", rowId)

    if (leadsUpdateError) {
      console.error("n8n-callback LeadsData update error:", leadsUpdateError)
      // Don't fail the request - ActionRuns was updated successfully
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error("n8n-callback error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
