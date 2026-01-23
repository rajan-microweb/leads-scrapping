import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"

// CORS headers helper
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { 
          status: 400,
          headers: corsHeaders,
        }
      )
    }

    // Fetch personal details
    const { data: personal, error: personalError } = await supabaseAdmin
      .from('User')
      .select('id, name, "fullName", email, phone, "jobTitle", country, timezone, image, "avatarUrl", "createdAt", "updatedAt"')
      .eq('id', userId)
      .single()

    if (personalError || !personal) {
      return NextResponse.json(
        { error: "User not found" },
        { 
          status: 404,
          headers: corsHeaders,
        }
      )
    }

    // Fetch company details
    const { data: company } = await supabaseAdmin
      .from('my_company_info')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
      .limit(1)
      .single()

    // Fetch integration details
    const { data: integrations } = await supabaseAdmin
      .from('integrations')
      .select('id, "platformName", "isConnected", credentials, "createdAt", "updatedAt"')
      .eq('userId', userId)

    return NextResponse.json(
      {
        personal,
        company: company || null,
        integrations: integrations || [],
      },
      { 
        status: 200,
        headers: corsHeaders,
      }
    )
  } catch (error) {
    console.error("user-data GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { 
        status: 500,
        headers: corsHeaders,
      }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const userId = body?.userId

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "userId is required in request body" },
        { 
          status: 400,
          headers: corsHeaders,
        }
      )
    }

    // Fetch personal details
    const { data: personal, error: personalError } = await supabaseAdmin
      .from('User')
      .select('id, name, "fullName", email, phone, "jobTitle", country, timezone, image, "avatarUrl", "createdAt", "updatedAt"')
      .eq('id', userId)
      .single()

    if (personalError || !personal) {
      return NextResponse.json(
        { error: "User not found" },
        { 
          status: 404,
          headers: corsHeaders,
        }
      )
    }

    // Fetch company details
    const { data: company } = await supabaseAdmin
      .from('my_company_info')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
      .limit(1)
      .single()

    // Fetch integration details
    const { data: integrations } = await supabaseAdmin
      .from('integrations')
      .select('id, "platformName", "isConnected", credentials, "createdAt", "updatedAt"')
      .eq('userId', userId)

    return NextResponse.json(
      {
        personal,
        company: company || null,
        integrations: integrations || [],
      },
      { 
        status: 200,
        headers: corsHeaders,
      }
    )
  } catch (error) {
    console.error("user-data POST error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { 
        status: 500,
        headers: corsHeaders,
      }
    )
  }
}
