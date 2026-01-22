import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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
    const personal = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        fullName: true,
        email: true,
        phone: true,
        jobTitle: true,
        country: true,
        timezone: true,
        image: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!personal) {
      return NextResponse.json(
        { error: "User not found" },
        { 
          status: 404,
          headers: corsHeaders,
        }
      )
    }

    // Fetch company details
    const company = await prisma.myCompanyInfo.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    })

    // Fetch integration details
    const integrations = await prisma.integration.findMany({
      where: { userId },
      select: {
        id: true,
        platformName: true,
        isConnected: true,
        credentials: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(
      {
        personal,
        company,
        integrations,
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
    const personal = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        fullName: true,
        email: true,
        phone: true,
        jobTitle: true,
        country: true,
        timezone: true,
        image: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!personal) {
      return NextResponse.json(
        { error: "User not found" },
        { 
          status: 404,
          headers: corsHeaders,
        }
      )
    }

    // Fetch company details
    const company = await prisma.myCompanyInfo.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    })

    // Fetch integration details
    const integrations = await prisma.integration.findMany({
      where: { userId },
      select: {
        id: true,
        platformName: true,
        isConnected: true,
        credentials: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(
      {
        personal,
        company,
        integrations,
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
