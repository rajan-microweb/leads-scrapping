/**
 * Config for lead import column mapping.
 * Shared by the import API (server) and the leads page (client) for aliases and auto-suggest.
 */

export interface MappableImportField {
  key: string
  label: string
  aliases: string[]
}

export const MAPPABLE_IMPORT_FIELDS: MappableImportField[] = [
  {
    key: "businessEmail",
    label: "Business email",
    aliases: [
      "Business Emails",
      "Email",
      "Business Email",
      "business_email",
      "business email",
    ],
  },
  {
    key: "websiteUrl",
    label: "Website URL",
    aliases: [
      "Website URLs",
      "Website",
      "URL",
      "Website URL",
      "website_url",
      "website url",
    ],
  },
]

/**
 * For each mappable field, finds the first file header that matches any of its aliases (case-insensitive).
 * Returns a record of field key -> matched header name (or "" if no match).
 */
export function suggestMapping(headers: string[]): Record<string, string> {
  const lower = headers.map((h) => (h ?? "").toString().trim().toLowerCase())
  const result: Record<string, string> = {}
  for (const field of MAPPABLE_IMPORT_FIELDS) {
    let matched = ""
    for (const alias of field.aliases) {
      const idx = lower.indexOf(alias.toLowerCase())
      if (idx !== -1) {
        matched = headers[idx] ?? ""
        break
      }
    }
    result[field.key] = matched
  }
  return result
}

/**
 * Resolves the column index for a field given headers and an optional explicit header name.
 * Used by the import API. Returns -1 if not found.
 */
export function findHeaderIndex(
  headers: string[],
  aliases: string[],
  explicitHeader?: string
): number {
  if (explicitHeader != null && explicitHeader.trim() !== "") {
    const idx = headers.findIndex(
      (h) => (h ?? "").toString().trim().toLowerCase() === explicitHeader.trim().toLowerCase()
    )
    if (idx !== -1) return idx
  }
  const lower = headers.map((h) => (h ?? "").toString().trim().toLowerCase())
  for (const alias of aliases) {
    const idx = lower.indexOf(alias.toLowerCase())
    if (idx !== -1) return idx
  }
  return -1
}
