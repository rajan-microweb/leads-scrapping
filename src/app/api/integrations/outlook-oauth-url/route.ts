import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

const OUTLOOK_OAUTH_BASE = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
const OUTLOOK_CLIENT_ID = "63dc14b3-d64e-40e0-833f-51c8c8eedce8"
const OUTLOOK_REDIRECT_URI = "https://n8n.srv1248804.hstgr.cloud/webhook/outlook-oauth-callback"
const OUTLOOK_SCOPE = "offline_access Mail.Send User.Read"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const params = new URLSearchParams({
      client_id: OUTLOOK_CLIENT_ID,
      response_type: "code",
      redirect_uri: OUTLOOK_REDIRECT_URI,
      response_mode: "query",
      scope: OUTLOOK_SCOPE,
      state: session.user.id,
    })

    const url = `${OUTLOOK_OAUTH_BASE}?${params.toString()}`
    return NextResponse.json({ url })
  } catch (error) {
    console.error("outlook-oauth-url GET error:", error)
    return NextResponse.json(
      { error: "Failed to get authorization URL" },
      { status: 500 }
    )
  }
}
