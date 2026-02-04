/**
 * Lead import eligibility filters.
 * Aligned with n8n send-mail workflow (personal domain blocklist).
 * Used at import time so only eligible rows are inserted; rejected counts are returned for the summary popup.
 */

/** Domains treated as personal (same as n8n If2). */
export const PERSONAL_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "aol.com",
  "protonmail.com",
] as const

const PERSONAL_DOMAIN_SET = new Set(
  PERSONAL_EMAIL_DOMAINS.map((d) => d.toLowerCase())
)

/** Reason a row was not imported (for API and UI). */
export type RejectReason =
  | "missing_or_invalid_email"
  | "personal_domain"

/** Human-readable labels for summary dialog. */
export const REJECT_REASON_LABELS: Record<RejectReason, string> = {
  missing_or_invalid_email: "Missing or invalid email",
  personal_domain: "Personal email domain",
}

/** Basic email format: local@domain.tld (single @, non-empty local and domain). */
const BASIC_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmail(value: string | null): boolean {
  if (value == null || typeof value !== "string") return false
  const trimmed = value.trim()
  if (trimmed.length === 0) return false
  return BASIC_EMAIL_REGEX.test(trimmed)
}

/** Returns true if domain is in the personal-email blocklist (case-insensitive). */
export function isPersonalEmailDomain(domain: string): boolean {
  if (!domain || typeof domain !== "string") return false
  return PERSONAL_DOMAIN_SET.has(domain.toLowerCase().trim())
}

export interface ClassifyLeadRowInput {
  businessEmail: string | null
  websiteUrl?: string | null
}

export interface ClassifyLeadRowResult {
  eligible: boolean
  reason: RejectReason | null
}

/**
 * Classify a single lead row for import eligibility.
 * Order: missing/invalid email first, then personal domain; otherwise eligible.
 */
export function classifyLeadRow(row: ClassifyLeadRowInput): ClassifyLeadRowResult {
  const { businessEmail } = row

  if (!isValidEmail(businessEmail)) {
    return { eligible: false, reason: "missing_or_invalid_email" }
  }

  const email = businessEmail!.trim()
  const atIndex = email.lastIndexOf("@")
  const domain = atIndex >= 0 ? email.slice(atIndex + 1) : ""

  if (isPersonalEmailDomain(domain)) {
    return { eligible: false, reason: "personal_domain" }
  }

  return { eligible: true, reason: null }
}

/** All reject reason keys (for initializing counts). */
export const REJECT_REASONS: RejectReason[] = [
  "missing_or_invalid_email",
  "personal_domain",
]

/** Empty rejection counts object. */
export function emptyRejectedByReason(): Record<RejectReason, number> {
  return {
    missing_or_invalid_email: 0,
    personal_domain: 0,
  }
}
