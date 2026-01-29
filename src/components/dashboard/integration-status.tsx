"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type IntegrationStatusItem = {
  name: string
  connected: boolean
}

type IntegrationStatusProps = {
  items: IntegrationStatusItem[]
  loading?: boolean
  systemHealthLabel?: string
}

export function IntegrationStatus({
  items,
  loading = false,
  systemHealthLabel = "All systems operational",
}: IntegrationStatusProps) {
  const connectedCount = items.filter((i) => i.connected).length
  const totalCount = items.length
  const allConnected = totalCount > 0 && connectedCount === totalCount
  const noneConnected = totalCount === 0 || connectedCount === 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="type-card-title">
          Integration status
        </CardTitle>
        <Link
          href="/integrations"
          className="text-sm font-medium text-primary hover:underline focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
        >
          Manage
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-2">
            <div className="h-5 w-32 animate-pulse rounded-md bg-muted" />
            <div className="h-5 w-24 animate-pulse rounded-md bg-muted" />
          </div>
        ) : items.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              No integrations connected
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/integrations">Connect an integration</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="space-y-2" role="list">
              {items.map((item) => (
                <li
                  key={item.name}
                  className="flex items-center gap-2 text-sm"
                >
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full transition-opacity duration-normal",
                      item.connected
                        ? "bg-success animate-pulse"
                        : "bg-muted-foreground/40"
                    )}
                    aria-hidden
                  />
                  <span className={item.connected ? "" : "text-muted-foreground"}>
                    {item.name}
                    {item.connected ? " — connected" : " — not connected"}
                  </span>
                </li>
              ))}
            </ul>
            {totalCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {connectedCount} of {totalCount} connected
              </p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  allConnected
                    ? "bg-success"
                    : "bg-warning"
                )}
                aria-hidden
              />
              <span className="text-sm text-muted-foreground">
                {items.length === 0
                  ? "Connect an integration to get started"
                  : allConnected
                    ? systemHealthLabel
                    : "Connect more integrations for full sync"}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
