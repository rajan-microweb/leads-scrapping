import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const companyIntelligenceSchema = z.object({
  company_name: z.string().optional().nullable(),
  company_type: z.string().optional().nullable(),
  industry_expertise: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  full_tech_summary: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  service_catalog: z.array(z.string()).optional().nullable(),
  the_hook: z.string().optional().nullable(),
  what_they_do: z.string().optional().nullable(),
  value_prop: z.string().optional().nullable(),
  brand_tone: z.array(z.string()).optional().nullable(),
})

const bodySchema = z.object({
  // Personal info
  fullName: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  location: z.string().optional().nullable(),

  // Website & company info
  websiteName: z.string().min(1),
  websiteUrl: z.string().url(),
  company_intelligence: companyIntelligenceSchema,
})

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
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

    return NextResponse.json(user ?? null, { status: 200 })
  } catch (error) {
    console.error("profile GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const { fullName, email, phone, location, websiteName, websiteUrl, company_intelligence } =
      parsed.data

    const userUpdateData: Record<string, any> = {}
    if (typeof fullName !== "undefined") userUpdateData.fullName = fullName
    if (typeof phone !== "undefined") userUpdateData.phone = phone
    if (typeof location !== "undefined") userUpdateData.country = location

    // Email is managed by auth; ignore if provided
    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: userUpdateData,
      })
    }

    // Store in WebsiteSubmission.extractedData as: [{ company_intelligence: { ... } }]
    const extractedData = [{ company_intelligence }]

    const latestSubmission = await prisma.websiteSubmission.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    })

    const websiteSubmission = latestSubmission
      ? await prisma.websiteSubmission.update({
          where: { id: latestSubmission.id },
          data: {
            websiteName,
            websiteUrl,
            extractedData,
          },
        })
      : await prisma.websiteSubmission.create({
          data: {
            userId: session.user.id,
            websiteName,
            websiteUrl,
            extractedData,
          },
        })

    // Keep my_company_info table in sync for dashboard use
    const latestCompany = await prisma.myCompanyInfo.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    })

    const serviceCatalog = company_intelligence.service_catalog ?? null
    const industryExpertise = company_intelligence.industry_expertise ?? null
    const fullTechSummary = company_intelligence.full_tech_summary ?? null
    const brandTone = company_intelligence.brand_tone ?? null

    const myCompanyInfo = latestCompany
      ? await prisma.myCompanyInfo.update({
          where: { id: latestCompany.id },
          data: {
            websiteName,
            websiteUrl,
            companyName: company_intelligence.company_name ?? null,
            companyType: company_intelligence.company_type ?? null,
            industryExpertise,
            fullTechSummary,
            serviceCatalog,
            theHook: company_intelligence.the_hook ?? null,
            whatTheyDo: company_intelligence.what_they_do ?? null,
            valueProposition: company_intelligence.value_prop ?? null,
            brandTone,
          },
        })
      : await prisma.myCompanyInfo.create({
          data: {
            userId: session.user.id,
            websiteName,
            websiteUrl,
            companyName: company_intelligence.company_name ?? null,
            companyType: company_intelligence.company_type ?? null,
            industryExpertise,
            fullTechSummary,
            serviceCatalog,
            theHook: company_intelligence.the_hook ?? null,
            whatTheyDo: company_intelligence.what_they_do ?? null,
            valueProposition: company_intelligence.value_prop ?? null,
            brandTone,
          },
        })

    return NextResponse.json(
      {
        success: true,
        websiteSubmission,
        myCompanyInfo,
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }
    console.error("profile POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

