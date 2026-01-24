import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"
import { randomUUID } from "crypto"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("image") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 })
    }

    // Prepare file for upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Generate unique filename using UUID and timestamp
    const fileExt = file.name.split(".").pop() || "png"
    const sanitizedExt = fileExt.toLowerCase().split("?")[0]
    const uniqueFileName = `${randomUUID()}-${Date.now()}.${sanitizedExt}`
    
    // Upload to signatures/{userId}/{uniqueFileName}
    const filePath = `${session.user.id}/${uniqueFileName}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from("signatures")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false, // Don't overwrite existing files
      })

    if (uploadError) {
      console.error("Supabase Storage upload error:", uploadError)
      return NextResponse.json(
        { error: "Failed to upload image", details: uploadError.message },
        { status: 500 }
      )
    }

    // Get the public URL for the uploaded file
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("signatures").getPublicUrl(filePath)

    return NextResponse.json(
      {
        success: true,
        url: publicUrl,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Signature image upload error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
