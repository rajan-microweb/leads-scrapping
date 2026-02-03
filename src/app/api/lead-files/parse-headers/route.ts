import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import * as XLSX from "xlsx"

const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"]

/**
 * POST /api/lead-files/parse-headers
 * Parses an uploaded file and returns only the first row (headers).
 * Used by the leads page for column mapping so xlsx is not loaded on the client.
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null

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

  try {
    const buffer = await file.arrayBuffer()
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
      return NextResponse.json(
        { error: "No sheet found in file" },
        { status: 400 }
      )
    }
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      raw: true,
    }) as (string | number)[][]
    const headers = (rows[0] ?? []).map((c) => String(c ?? "").trim())
    return NextResponse.json({ headers })
  } catch (e) {
    console.error("lead-files/parse-headers error:", e)
    return NextResponse.json(
      { error: "Failed to read file. Please choose another file." },
      { status: 400 }
    )
  }
}
