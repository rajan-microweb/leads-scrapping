import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
      { status: 200 },
    )
  } catch (error) {
    console.error("leads GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

