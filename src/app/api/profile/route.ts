import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"
import { z } from "zod"
import { generateId } from "@/lib/cuid"

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

    const { data: user, error } = await supabaseAdmin
      .from('User')
      .select('id, name, "fullName", email, phone, "jobTitle", country, timezone, image, "avatarUrl", "createdAt", "updatedAt"')
      .eq('id', session.user.id)
      .single()

    if (error) {
      console.error("profile GET error:", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }

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
      userUpdateData.updatedAt = new Date().toISOString()
      await supabaseAdmin
        .from('User')
        .update(userUpdateData)
        .eq('id', session.user.id)
    }

    // Store in WebsiteSubmission.extractedData as: [{ company_intelligence: { ... } }]
    const extractedData = [{ company_intelligence }]

    const { data: latestSubmission } = await supabaseAdmin
      .from('WebsiteSubmission')
      .select('id')
      .eq('userId', session.user.id)
      .order('createdAt', { ascending: false })
      .limit(1)
      .single()

    let websiteSubmission
    if (latestSubmission) {
      const { data } = await supabaseAdmin
        .from('WebsiteSubmission')
        .update({
          websiteName,
          websiteUrl,
          extractedData,
        })
        .eq('id', latestSubmission.id)
        .select()
        .single()
      websiteSubmission = data
    } else {
      const { data } = await supabaseAdmin
        .from('WebsiteSubmission')
        .insert({
          id: generateId(),
          userId: session.user.id,
          websiteName,
          websiteUrl,
          extractedData,
          createdAt: new Date().toISOString(),
        })
        .select()
        .single()
      websiteSubmission = data
    }

    // Keep my_company_info table in sync for dashboard use
    const { data: latestCompany } = await supabaseAdmin
      .from('my_company_info')
      .select('id')
      .eq('userId', session.user.id)
      .order('createdAt', { ascending: false })
      .limit(1)
      .single()

    const serviceCatalog = company_intelligence.service_catalog ?? undefined
    const industryExpertise = company_intelligence.industry_expertise ?? undefined
    const fullTechSummary = company_intelligence.full_tech_summary ?? undefined
    const brandTone = company_intelligence.brand_tone ?? undefined

    let myCompanyInfo
    if (latestCompany) {
      const { data } = await supabaseAdmin
        .from('my_company_info')
        .update({
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
          updatedAt: new Date().toISOString(),
        })
        .eq('id', latestCompany.id)
        .select()
        .single()
      myCompanyInfo = data
    } else {
      const { data } = await supabaseAdmin
        .from('my_company_info')
        .insert({
          id: generateId(),
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single()
      myCompanyInfo = data
    }

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

