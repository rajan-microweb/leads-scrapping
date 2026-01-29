"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import type { SidebarNavItem as SidebarNavItemType } from "@/config/sidebar-nav"

type SidebarNavItemProps = {
  item: SidebarNavItemType
  isActive: boolean
  isCompact: boolean
  onNavigate?: () => void
}

export function SidebarNavItem({
  item,
  isActive,
  isCompact,
  onNavigate,
}: SidebarNavItemProps) {
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={isCompact ? item.label : undefined}
      aria-label={isCompact ? item.label : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-normal motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "relative min-h-[2.5rem]",
        isCompact && "justify-center px-2",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      aria-current={isActive ? "page" : undefined}
    >
      {/* Active indicator: left border with transition */}
      {isActive && (
        <span
          className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-primary-foreground/90 motion-reduce:transition-none"
          aria-hidden
        />
      )}
      <Icon
        className={cn("h-5 w-5 shrink-0", isActive && "text-primary-foreground")}
        aria-hidden
      />
      {!isCompact && (
        <span
          className={cn(
            "truncate transition-opacity duration-slow",
            isCompact ? "w-0 opacity-0" : "opacity-100"
          )}
        >
          {item.label}
        </span>
      )}
    </Link>
  )
}
