"use client"

const ALLOWED_KEYS = [
  { key: "email", label: "Email" },
  { key: "name", label: "Name" },
  { key: "displayName", label: "Display name" },
  { key: "accountId", label: "Account ID" },
  { key: "account", label: "Account" },
] as const

type IntegrationDetailsProps = {
  metadata: Record<string, unknown> | null | undefined
  platformName?: string
  /** When true, omits the "Connected account" heading (e.g. when used inside a card with its own title) */
  hideTitle?: boolean
  /** Shown when there are no displayable profile entries */
  emptyMessage?: string
}

function isDisplayable(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

export function IntegrationDetails({ metadata, platformName: _platformName, hideTitle, emptyMessage }: IntegrationDetailsProps) {
  if (metadata == null || typeof metadata !== "object" || Array.isArray(metadata)) {
    return emptyMessage ? <p className="text-sm text-muted-foreground">{emptyMessage}</p> : null
  }

  const entries: { label: string; value: string }[] = []

  for (const { key, label } of ALLOWED_KEYS) {
    const value = metadata[key]
    if (isDisplayable(value)) {
      entries.push({ label, value: value.trim() })
    }
  }

  if (entries.length === 0) {
    return emptyMessage ? <p className="text-sm text-muted-foreground">{emptyMessage}</p> : null
  }

  return (
    <div className={hideTitle ? "space-y-0.5" : "space-y-1 pt-1"}>
      {!hideTitle && (
        <p className="text-xs font-medium text-muted-foreground">Connected account</p>
      )}
      <ul className="space-y-0.5 text-xs text-muted-foreground">
        {entries.map(({ label, value }) => (
          <li key={label}>
            {label}: {value}
          </li>
        ))}
      </ul>
    </div>
  )
}
