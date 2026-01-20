import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const websiteInfoSchema = z.object({
  websiteName: z.string().min(1, "Website name is required"),
  websiteUrl: z.string().url("Invalid URL format"),
})

const N8N_WEBHOOK_URL = "https://n8n.srv1248804.hstgr.cloud/webhook/get-own-data"

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const parsed = websiteInfoSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { 
          error: "Invalid input",
          details: parsed.error.errors
        },
        { status: 400 }
      )
    }

    const { websiteName, websiteUrl } = parsed.data

    // Forward request to n8n webhook
    let extractedData: any
    try {
      const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          websiteName,
          websiteUrl,
        }),
      })

      if (!n8nResponse.ok) {
        throw new Error(`n8n webhook returned status ${n8nResponse.status}`)
      }

      const n8nData = await n8nResponse.json()
      console.log("n8n webhook raw response:", JSON.stringify(n8nData, null, 2))
      extractedData = n8nData.data || n8nData

      // Normalize to the expected format: [{ company_intelligence: { ... } }]
      // Your n8n currently returns: { company_intelligence: { ... } }
      if (extractedData && !Array.isArray(extractedData) && typeof extractedData === "object") {
        if ("company_intelligence" in extractedData || "companyIntelligence" in extractedData) {
          extractedData = [extractedData]
        }
      }
      console.log("Extracted data structure:", JSON.stringify(extractedData, null, 2))
    } catch (error) {
      console.error("n8n webhook error:", error)
      return NextResponse.json(
        { 
          error: "Failed to fetch website data",
          message: error instanceof Error ? error.message : "Unknown error"
        },
        { status: 502 }
      )
    }

    // Store in database
    const websiteSubmission = await prisma.websiteSubmission.create({
      data: {
        userId: session.user.id,
        websiteName,
        websiteUrl,
        extractedData,
      },
    })

    // Return both the submission and the extracted data in expected format
    return NextResponse.json(
      {
        submission: websiteSubmission,
        data: extractedData, // Normalized to: [{ company_intelligence: { ... } }]
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Website info API error:", error)
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
