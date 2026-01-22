import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

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

    const latest = await prisma.myCompanyInfo.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    })

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

    const latest = await prisma.myCompanyInfo.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    })

    const saved = latest
      ? await prisma.myCompanyInfo.update({
          where: { id: latest.id },
          data: {
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
          },
        })
      : await prisma.myCompanyInfo.create({
          data: {
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
          },
        })

    return NextResponse.json(saved, { status: latest ? 200 : 201 })
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }
    console.error("my-company-info POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

