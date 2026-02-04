import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"
import { generateId } from "@/lib/cuid"
import * as XLSX from "xlsx"
import {
  MAPPABLE_IMPORT_FIELDS,
  findHeaderIndex as resolveHeaderIndex,
} from "@/config/lead-import"
import {
  classifyLeadRow,
  emptyRejectedByReason,
  type RejectReason,
} from "@/lib/lead-import-filters"

const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"]

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
  const sheetNameRaw = formData.get("sheetName") as string | null
  const signatureIdRaw = formData.get("signatureId") as string | null
  const mappingRaw = formData.get("mapping") as string | null

  if (!file || typeof file === "string") {
    return NextResponse.json(
      { error: "file is required and must be a file" },
      { status: 400 }
    )
  }

  const sourceFileName = file.name.trim()
  const ext = sourceFileName.toLowerCase().slice(sourceFileName.lastIndexOf("."))
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json(
      { error: "Invalid file type. Use .csv, .xls, or .xlsx" },
      { status: 400 }
    )
  }

  const sourceFileExtension = ext.slice(1).toUpperCase()

  if (!option || (option !== "new" && option !== "add")) {
    return NextResponse.json(
      { error: "option is required and must be 'new' or 'add'" },
      { status: 400 }
    )
  }

  if (option === "new") {
    const sheetName = typeof sheetNameRaw === "string" ? sheetNameRaw.trim() : ""
    if (!sheetName) {
      return NextResponse.json(
        { error: "sheetName is required when creating a new lead sheet" },
        { status: 400 }
      )
    }
    if (sheetName.length > 255) {
      return NextResponse.json(
        { error: "Sheet name must be 255 characters or less" },
        { status: 400 }
      )
    }
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

  let leadSheetId: string

  if (option === "new") {
    const sheetName = (sheetNameRaw && typeof sheetNameRaw === "string" ? sheetNameRaw.trim() : "") as string
    leadSheetId = generateId()
    const { error: insertError } = await supabaseAdmin.from("LeadSheets").insert({
      id: leadSheetId,
      userId: session.user.id,
      sheetName,
      sourceFileExtension,
      ...(signatureId ? { signatureId } : {}),
      uploadedAt: new Date().toISOString(),
    })
    if (insertError) {
      console.error("lead-files/import LeadSheets insert error:", insertError)
      return NextResponse.json(
        { error: "Failed to create lead sheet" },
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
      .from("LeadSheets")
      .select("id")
      .eq("id", tid)
      .eq("userId", session.user.id)
      .single()
    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Target lead sheet not found or access denied" },
        { status: 404 }
      )
    }
    leadSheetId = existing.id
  }

  const buffer = await file.arrayBuffer()
  let headers: string[]
  let dataRows: (string | null)[][]
  try {
    const parsed = parseFile(buffer, sourceFileName)
    headers = parsed.headers
    dataRows = parsed.rows
  } catch (e) {
      console.error("lead-files/import parse error:", e)
      return NextResponse.json(
        { error: "Failed to parse file" },
        { status: 400 }
      )
    }

  let mapping: Record<string, string> = {}
  if (mappingRaw) {
    try {
      mapping = JSON.parse(mappingRaw) as Record<string, string>
    } catch {
      // use empty mapping, fall back to aliases below
    }
  }
  const columnIndices: Record<string, number> = {}
  for (const field of MAPPABLE_IMPORT_FIELDS) {
    columnIndices[field.key] = resolveHeaderIndex(
      headers,
      field.aliases,
      mapping[field.key]
    )
  }
  const businessEmailIdx = columnIndices.businessEmail ?? -1
  const websiteUrlIdx = columnIndices.websiteUrl ?? -1

  let startIndex: number
  if (option === "new") {
    startIndex = 0
  } else {
    const { data: maxRow } = await supabaseAdmin
      .from("LeadsData")
      .select("rowIndex")
      .eq("leadSheetId", leadSheetId)
      .order("rowIndex", { ascending: false })
      .limit(1)
      .single()
    startIndex = (maxRow?.rowIndex ?? -1) + 1
  }

  // Get sheetName for insert: from form when new, from LeadSheets when add
  let sheetNameForRows: string
  if (option === "new") {
    sheetNameForRows = (sheetNameRaw && typeof sheetNameRaw === "string" ? sheetNameRaw.trim() : "") as string
  } else {
    const { data: existingSheet } = await supabaseAdmin
      .from("LeadSheets")
      .select("sheetName")
      .eq("id", leadSheetId)
      .single()
    sheetNameForRows = existingSheet?.sheetName ?? ""
  }

  const rejectedByReason = emptyRejectedByReason()
  const toInsert: {
    id: string
    leadSheetId: string
    userId: string
    sheetName: string
    rowIndex: number
    businessEmail: string | null
    websiteUrl: string | null
    emailStatus: string
    hasReplied: "YES" | "NO" | null
  }[] = []
  let eligibleIndex = 0
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
    const { eligible, reason } = classifyLeadRow({ businessEmail, websiteUrl })
    if (eligible) {
      toInsert.push({
        id: generateId(),
        leadSheetId: leadSheetId,
        userId: session.user.id,
        sheetName: sheetNameForRows,
        rowIndex: startIndex + eligibleIndex,
        businessEmail,
        websiteUrl,
        emailStatus: "Pending",
        hasReplied: null,
      })
      eligibleIndex++
    } else if (reason) {
      rejectedByReason[reason as RejectReason]++
    }
  }

  const CHUNK = 100
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const chunk = toInsert.slice(i, i + CHUNK)
    const { error: rowError } = await supabaseAdmin
      .from("LeadsData")
      .insert(chunk)
    if (rowError) {
      console.error("lead-files/import LeadsData insert error:", rowError)
      return NextResponse.json(
        { error: "Failed to save rows" },
        { status: 500 }
      )
    }
  }

  const sheetName = option === "new"
    ? (sheetNameRaw && typeof sheetNameRaw === "string" ? sheetNameRaw.trim() : "")
    : null
  const totalRows = dataRows.length
  const rejected = totalRows - toInsert.length

  const responseBody = {
    id: leadSheetId,
    sheetName: sheetName ?? undefined,
    rowCount: toInsert.length,
    totalRows,
    rejected,
    rejectedByReason,
  }
  return NextResponse.json(responseBody, { status: 201 })
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
