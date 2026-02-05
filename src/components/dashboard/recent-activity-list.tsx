"use client"

import Link from "next/link"
import {
  FileSpreadsheet,
  FileSignature,
  Plug,
  type LucideIcon,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export type RecentActivityItem = {
  type: "lead" | "signature" | "integration"
  label: string
  href: string
  date: Date
}

const typeIcons: Record<RecentActivityItem["type"], LucideIcon> = {
  lead: FileSpreadsheet,
  signature: FileSignature,
  integration: Plug,
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
  return date.toLocaleDateString()
}

type RecentActivityListProps = {
  items: RecentActivityItem[]
  loading?: boolean
}

export function RecentActivityList({
  items,
  loading = false,
}: RecentActivityListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="type-card-title">Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <ul className="space-y-3" role="list">
            {[1, 2, 3].map((i) => (
              <li key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <div className="space-y-2 py-2">
            <p className="type-body text-muted-foreground">No recent activity</p>
            <p className="type-caption">
              Upload a lead sheet or add a signature to see activity here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3" role="list">
            {items.map((item, index) => {
              const Icon = typeIcons[item.type]
              return (
                <li
                  key={`${item.type}-${item.href}-${index}`}
                  className="animate-stagger-in"
                  style={{
                    animationDelay: `${index * 40}ms`,
                    animationFillMode: "backwards",
                  }}
                >
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 rounded-md py-1 text-sm transition-colors duration-normal hover:bg-muted/50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted"
                      aria-hidden
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatRelativeTime(item.date)}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
