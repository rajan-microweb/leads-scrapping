import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"

type RouteContext = { params: { id: string; jobId: string } }

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = context.params?.id?.trim()
    const jobId = context.params?.jobId?.trim()

    if (!id || !jobId) {
      return NextResponse.json(
        { error: "Lead sheet id and job id are required" },
        { status: 400 }
      )
    }

    const { data: actionRun, error } = await supabaseAdmin
      .from("ActionRuns")
      .select("id, leadFileId, statuses, rowIds")
      .eq("id", jobId)
      .eq("leadFileId", id)
      .single()

    if (error || !actionRun) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      )
    }

    const { data: sheet } = await supabaseAdmin
      .from("LeadSheets")
      .select("userId")
      .eq("id", id)
      .single()

    if (!sheet || sheet.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Job not found or access denied" },
        { status: 404 }
      )
    }

    const statuses = (actionRun.statuses as Record<string, string>) ?? {}
    const rowIds = (actionRun.rowIds as string[]) ?? []
    const terminalStatuses = ["completed", "failed"]
    const isComplete = rowIds.every((rid) =>
      terminalStatuses.includes(statuses[rid] ?? "")
    )

    return NextResponse.json(
      { statuses, isComplete },
      { status: 200 }
    )
  } catch (error) {
    console.error("lead-files/[id]/run-status/[jobId] GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
