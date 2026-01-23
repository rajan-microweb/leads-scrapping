import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"
import { z } from "zod"
import { generateId } from "@/lib/cuid"

const payloadSchema = z.object({
  websiteName: z.string().min(1),
  websiteUrl: z.string().url(),

  companyName: z.string().optional().nullable(),
  companyType: z.string().optional().nullable(),
  industryExpertise: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  fullTechSummary: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  serviceCatalog: z.array(z.string()).optional().nullable(),
  theHook: z.string().optional().nullable(),
  whatTheyDo: z.string().optional().nullable(),
  valueProposition: z.string().optional().nullable(),
  brandTone: z.array(z.string()).optional().nullable(),
})

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: latest } = await supabaseAdmin
      .from('my_company_info')
      .select('*')
      .eq('userId', session.user.id)
      .order('createdAt', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json(latest ?? null, { status: 200 })
  } catch (error) {
    console.error("my-company-info GET error:", error)
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
    const parsed = payloadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const d = parsed.data

    const { data: latest } = await supabaseAdmin
      .from('my_company_info')
      .select('id')
      .eq('userId', session.user.id)
      .order('createdAt', { ascending: false })
      .limit(1)
      .single()

    let saved
    if (latest) {
      const { data } = await supabaseAdmin
        .from('my_company_info')
        .update({
          websiteName: d.websiteName,
          websiteUrl: d.websiteUrl,
          companyName: d.companyName ?? null,
          companyType: d.companyType ?? null,
          industryExpertise: d.industryExpertise ?? undefined,
          fullTechSummary: d.fullTechSummary ?? undefined,
          serviceCatalog: d.serviceCatalog ?? undefined,
          theHook: d.theHook ?? null,
          whatTheyDo: d.whatTheyDo ?? null,
          valueProposition: d.valueProposition ?? null,
          brandTone: d.brandTone ?? undefined,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', latest.id)
        .select()
        .single()
      saved = data
    } else {
      const { data } = await supabaseAdmin
        .from('my_company_info')
        .insert({
          id: generateId(),
          userId: session.user.id,
          websiteName: d.websiteName,
          websiteUrl: d.websiteUrl,
          companyName: d.companyName ?? null,
          companyType: d.companyType ?? null,
          industryExpertise: d.industryExpertise ?? undefined,
          fullTechSummary: d.fullTechSummary ?? undefined,
          serviceCatalog: d.serviceCatalog ?? undefined,
          theHook: d.theHook ?? null,
          whatTheyDo: d.whatTheyDo ?? null,
          valueProposition: d.valueProposition ?? null,
          brandTone: d.brandTone ?? undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single()
      saved = data
    }

    return NextResponse.json(saved, { status: latest ? 200 : 201 })
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }
    console.error("my-company-info POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

