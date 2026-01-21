import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sanitizeHtml } from "@/lib/sanitize-html"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const signatures = await prisma.signature.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        content: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    })

    return NextResponse.json(signatures, { status: 200 })
  } catch (error) {
    console.error("signatures GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)

    if (!body || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      )
    }

    if (!body || typeof body.content !== "string" || !body.content.trim()) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      )
    }

    const name = body.name.trim()
    const rawContent = body.content.trim()
    
    // Sanitize HTML content before storing
    const sanitizedContent = sanitizeHtml(rawContent)

    if (!sanitizedContent) {
      return NextResponse.json(
        { error: "Invalid HTML content" },
        { status: 400 }
      )
    }

    const signature = await prisma.signature.create({
      data: {
        userId: session.user.id,
        name,
        content: sanitizedContent,
      },
      select: {
        id: true,
        name: true,
        content: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(signature, { status: 201 })
  } catch (error) {
    console.error("signatures POST error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
