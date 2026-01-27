import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"
import { generateId } from "@/lib/cuid"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: integrations, error } = await supabaseAdmin
      .from('integrations')
      .select('id, "platformName", "isConnected", "createdAt", "updatedAt", credentials, metadata')
      .eq('userId', session.user.id)

    if (error) {
      console.error("integrations GET error:", error)
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      )
    }

    return NextResponse.json(integrations || [], { status: 200 })
  } catch (error) {
    console.error("integrations GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)

    if (!body || typeof body.platformName !== "string" || !body.platformName.trim()) {
      return NextResponse.json(
        { error: "platformName is required" },
        { status: 400 }
      )
    }

    if (!body.credentials || typeof body.credentials !== "object") {
      return NextResponse.json(
        { error: "credentials is required and must be an object" },
        { status: 400 }
      )
    }

    const { clientId, clientSecret, tenantId } = body.credentials

    if (typeof clientId !== "string" || !clientId.trim()) {
      return NextResponse.json(
        { error: "credentials.clientId is required" },
        { status: 400 }
      )
    }

    if (typeof clientSecret !== "string" || !clientSecret.trim()) {
      return NextResponse.json(
        { error: "credentials.clientSecret is required" },
        { status: 400 }
      )
    }

    if (typeof tenantId !== "string" || !tenantId.trim()) {
      return NextResponse.json(
        { error: "credentials.tenantId is required" },
        { status: 400 }
      )
    }

    const platformName = body.platformName.trim().toLowerCase()
    const credentials = {
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      tenantId: tenantId.trim(),
    }

    // Check if integration already exists for this user and platform
    const { data: existingIntegration } = await supabaseAdmin
      .from('integrations')
      .select('id')
      .eq('userId', session.user.id)
      .eq('platformName', platformName)
      .single()

    let integration
    if (existingIntegration) {
      const { data } = await supabaseAdmin
        .from('integrations')
        .update({
          credentials,
          isConnected: true,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', existingIntegration.id)
        .select()
        .single()
      integration = data
    } else {
      const { data } = await supabaseAdmin
        .from('integrations')
        .insert({
          id: generateId(),
          userId: session.user.id,
          platformName,
          credentials,
          isConnected: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single()
      integration = data
    }

    // Return success without credentials
    return NextResponse.json(
      {
        success: true,
        id: integration.id,
        platformName: integration.platformName,
        isConnected: integration.isConnected,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("integrations POST error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)

    if (!body || typeof body.platformName !== "string" || !body.platformName.trim()) {
      return NextResponse.json(
        { error: "platformName is required" },
        { status: 400 }
      )
    }

    const platformName = body.platformName.trim().toLowerCase()

    // Find the integration for this user and platform
    const { data: integration } = await supabaseAdmin
      .from('integrations')
      .select('id')
      .eq('userId', session.user.id)
      .eq('platformName', platformName)
      .single()

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      )
    }

    // Delete the integration
    await supabaseAdmin
      .from('integrations')
      .delete()
      .eq('id', integration.id)

    return NextResponse.json(
      { success: true, message: "Integration disconnected successfully" },
      { status: 200 }
    )
  } catch (error) {
    console.error("integrations DELETE error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
