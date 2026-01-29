"use client"

import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { SidebarNavGroup as SidebarNavGroupType } from "@/config/sidebar-nav"
import { SidebarNavItem } from "./SidebarNavItem"

type SidebarNavGroupProps = {
  group: SidebarNavGroupType
  isCompact: boolean
  onNavigate?: () => void
}

function isItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true
  if (href !== "/" && pathname.startsWith(href + "/")) return true
  return false
}

export function SidebarNavGroup({
  group,
  isCompact,
  onNavigate,
}: SidebarNavGroupProps) {
  const pathname = usePathname()

  return (
    <div className="space-y-1">
      {group.label && !isCompact && (
        <p
          className="type-overline px-3 py-1.5"
          aria-hidden
        >
          {group.label}
        </p>
      )}
      <ul className="space-y-0.5" role="list">
        {group.items.map((item) => (
          <li key={item.href}>
            <SidebarNavItem
              item={item}
              isActive={isItemActive(pathname, item.href)}
              isCompact={isCompact}
              onNavigate={onNavigate}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
