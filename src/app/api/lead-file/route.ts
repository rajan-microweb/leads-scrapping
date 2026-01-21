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
    let signatureId: string | null = null

    if (body.signatureId && typeof body.signatureId === "string") {
      const rawSignatureId = body.signatureId.trim()

      if (rawSignatureId) {
        const signature = await prisma.signature.findFirst({
          where: {
            id: rawSignatureId,
            userId: session.user.id,
          },
          select: {
            id: true,
          },
        })

        if (!signature) {
          return NextResponse.json(
            { error: "Invalid signature selected" },
            { status: 400 },
          )
        }

        signatureId = signature.id
      }
    }

    await prisma.leadFile.create({
      data: {
        userId: session.user.id,
        fileName,
        ...(signatureId ? { signatureId } : {}),
      },
    })

    const leadFiles = await prisma.leadFile.findMany({
      where: { userId: session.user.id },
      orderBy: { uploadedAt: "desc" },
      select: {
        id: true,
        fileName: true,
        uploadedAt: true,
        signature: {
          select: {
            name: true,
          },
        },
      },
    })

    return NextResponse.json(
      leadFiles.map((file) => ({
        id: file.id,
        fileName: file.fileName,
        uploadedAt: file.uploadedAt,
        signatureName: file.signature?.name ?? null,
      })),
      { status: 201 },
    )
  } catch (error) {
    console.error("lead-file POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

