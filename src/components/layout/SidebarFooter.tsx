"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

type SidebarFooterProps = {
  user: { name?: string | null; email?: string | null }
  avatarUrl?: string | null
  isCompact: boolean
  onNavigate?: () => void
}

export function SidebarFooter({
  user,
  avatarUrl,
  isCompact,
  onNavigate,
}: SidebarFooterProps) {
  const displayName = user.name || user.email || "User"
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-2 border-t border-border pt-4",
        isCompact && "items-center"
      )}
    >
      <Link
        href="/profile"
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-md p-2 transition-colors duration-normal hover:bg-muted motion-reduce:transition-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        )}
        aria-label="Go to profile"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
            {initial}
          </div>
        )}
        {!isCompact && (
          <div className="min-w-0 flex-1 truncate">
            <p className="text-sm font-medium text-foreground">{displayName}</p>
            <p className="text-xs text-muted-foreground">Signed in</p>
          </div>
        )}
      </Link>
    </div>
  )
}
