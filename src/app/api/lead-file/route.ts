import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)

    if (!body || typeof body.fileName !== "string" || !body.fileName.trim()) {
      return NextResponse.json({ error: "fileName is required" }, { status: 400 })
    }

    const fileName = body.fileName.trim()

    await prisma.leadFile.create({
      data: {
        userId: session.user.id,
        fileName,
      },
    })

    const leadFiles = await prisma.leadFile.findMany({
      where: { userId: session.user.id },
      orderBy: { uploadedAt: "desc" },
      select: {
        id: true,
        fileName: true,
        uploadedAt: true,
      },
    })

    return NextResponse.json(leadFiles, { status: 201 })
  } catch (error) {
    console.error("lead-file POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

