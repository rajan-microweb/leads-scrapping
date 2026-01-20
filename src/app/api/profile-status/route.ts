import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const latest = await prisma.websiteSubmission.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    })

    return NextResponse.json(
      {
        hasProfile: !!latest,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("profile-status GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

