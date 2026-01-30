import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"
import { generateId } from "@/lib/cuid"
import * as XLSX from "xlsx"

const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"]
const BUSINESS_EMAIL_ALIASES = [
  "Business Emails",
  "Email",
  "Business Email",
  "business_email",
  "business email",
]
const WEBSITE_URL_ALIASES = [
  "Website URLs",
  "Website",
  "URL",
  "Website URL",
  "website_url",
  "website url",
]

function findHeaderIndex(
  headers: string[],
  aliases: string[]
): number {
  const lower = headers.map((h) => (h ?? "").toString().trim().toLowerCase())
  for (const alias of aliases) {
    const idx = lower.indexOf(alias.toLowerCase())
    if (idx !== -1) return idx
  }
  return -1
}

function parseFile(
  buffer: ArrayBuffer,
  fileName: string
): { headers: string[]; rows: (string | null)[][] } {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf("."))
  const isCsv = ext === ".csv"
  let workbook: XLSX.WorkBook
  if (isCsv) {
    const str = new TextDecoder("utf-8").decode(buffer)
    workbook = XLSX.read(str, { type: "string", raw: true })
  } else {
    workbook = XLSX.read(new Uint8Array(buffer), { type: "array", raw: true })
  }
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) {
    return { headers: [], rows: [] }
  }
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
  }) as (string | number)[][]
  const headers = (rows[0] ?? []).map((c) => String(c ?? "").trim())
  const dataRows = rows.slice(1)
  const out: (string | null)[][] = []
  for (const row of dataRows) {
    out.push(
      (row ?? []).map((c) =>
        c === "" || c == null ? null : String(c).trim() || null
      )
    )
  }
  return { headers, rows: out }
}

async function handleImport(request: Request): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null
    const option = formData.get("option") as string | null
    const targetLeadFileId = formData.get("targetLeadFileId") as string | null
    const signatureIdRaw = formData.get("signatureId") as string | null
    const mappingRaw = formData.get("mapping") as string | null

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "file is required and must be a file" },
        { status: 400 }
      )
    }

    const fileName = file.name.trim()
    const ext = fileName.toLowerCase().slice(fileName.lastIndexOf("."))
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: "Invalid file type. Use .csv, .xls, or .xlsx" },
        { status: 400 }
      )
    }

    if (!option || (option !== "new" && option !== "add")) {
      return NextResponse.json(
        { error: "option is required and must be 'new' or 'add'" },
        { status: 400 }
      )
    }

    let signatureId: string | null = null
    if (signatureIdRaw && typeof signatureIdRaw === "string") {
      const raw = signatureIdRaw.trim()
      if (raw) {
        const { data: signature } = await supabaseAdmin
          .from("signatures")
          .select("id")
          .eq("id", raw)
          .eq("userId", session.user.id)
          .single()
        if (!signature) {
          return NextResponse.json(
            { error: "Invalid signature selected" },
            { status: 400 }
          )
        }
        signatureId = signature.id
      }
    }

    let leadFileId: string

    if (option === "new") {
      leadFileId = generateId()
      const { error: insertError } = await supabaseAdmin.from("LeadFile").insert({
        id: leadFileId,
        userId: session.user.id,
        fileName,
        ...(signatureId ? { signatureId } : {}),
        uploadedAt: new Date().toISOString(),
      })
      if (insertError) {
        console.error("lead-files/import LeadFile insert error:", insertError)
        return NextResponse.json(
          { error: "Failed to create lead file" },
          { status: 500 }
        )
      }
    } else {
      const tid = (targetLeadFileId ?? "").trim()
      if (!tid) {
        return NextResponse.json(
          { error: "targetLeadFileId is required when option is 'add'" },
          { status: 400 }
        )
      }
      const { data: existing, error: fetchError } = await supabaseAdmin
        .from("LeadFile")
        .select("id")
        .eq("id", tid)
        .eq("userId", session.user.id)
        .single()
      if (fetchError || !existing) {
        return NextResponse.json(
          { error: "Target lead file not found or access denied" },
          { status: 404 }
        )
      }
      leadFileId = existing.id
    }

    const buffer = await file.arrayBuffer()
    let headers: string[]
    let dataRows: (string | null)[][]
    try {
      const parsed = parseFile(buffer, fileName)
      headers = parsed.headers
      dataRows = parsed.rows
    } catch (e) {
      console.error("lead-files/import parse error:", e)
      return NextResponse.json(
        { error: "Failed to parse file" },
        { status: 400 }
      )
    }

    let businessEmailIdx: number
    let websiteUrlIdx: number
    if (mappingRaw) {
      try {
        const mapping = JSON.parse(mappingRaw) as Record<string, string>
        businessEmailIdx = headers.indexOf(mapping.businessEmail ?? "")
        websiteUrlIdx = headers.indexOf(mapping.websiteUrl ?? "")
        if (businessEmailIdx === -1) businessEmailIdx = findHeaderIndex(headers, BUSINESS_EMAIL_ALIASES)
        if (websiteUrlIdx === -1) websiteUrlIdx = findHeaderIndex(headers, WEBSITE_URL_ALIASES)
      } catch {
        businessEmailIdx = findHeaderIndex(headers, BUSINESS_EMAIL_ALIASES)
        websiteUrlIdx = findHeaderIndex(headers, WEBSITE_URL_ALIASES)
      }
    } else {
      businessEmailIdx = findHeaderIndex(headers, BUSINESS_EMAIL_ALIASES)
      websiteUrlIdx = findHeaderIndex(headers, WEBSITE_URL_ALIASES)
    }

    let startIndex: number
    if (option === "new") {
      startIndex = 0
    } else {
      const { data: maxRow } = await supabaseAdmin
        .from("LeadRow")
        .select("rowIndex")
        .eq("leadFileId", leadFileId)
        .order("rowIndex", { ascending: false })
        .limit(1)
        .single()
      startIndex = (maxRow?.rowIndex ?? -1) + 1
    }

    const toInsert: { id: string; leadFileId: string; rowIndex: number; businessEmail: string | null; websiteUrl: string | null }[] = []
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i] ?? []
      const businessEmail =
        businessEmailIdx >= 0 && row[businessEmailIdx] != null
          ? String(row[businessEmailIdx]).trim() || null
          : null
      const websiteUrl =
        websiteUrlIdx >= 0 && row[websiteUrlIdx] != null
          ? String(row[websiteUrlIdx]).trim() || null
          : null
      toInsert.push({
        id: generateId(),
        leadFileId,
        rowIndex: startIndex + i,
        businessEmail,
        websiteUrl,
      })
    }

    const CHUNK = 100
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const chunk = toInsert.slice(i, i + CHUNK)
      const { error: rowError } = await supabaseAdmin
        .from("LeadRow")
        .insert(chunk)
      if (rowError) {
        console.error("lead-files/import LeadRow insert error:", rowError)
        return NextResponse.json(
          { error: "Failed to save rows" },
          { status: 500 }
        )
      }
    }

  const responseBody = {
    id: leadFileId,
    fileName,
    rowCount: toInsert.length,
  };
  return NextResponse.json(responseBody, { status: 201 });
}

export async function POST(request: Request) {
  try {
    return await handleImport(request);
  } catch (error) {
    console.error("lead-files/import error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
