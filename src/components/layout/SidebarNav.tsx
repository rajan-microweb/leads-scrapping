"use client"

import type { SidebarNavGroup as SidebarNavGroupType } from "@/config/sidebar-nav"
import { SidebarNavGroup } from "./SidebarNavGroup"

type SidebarNavProps = {
  groups: SidebarNavGroupType[]
  isCompact: boolean
  onNavigate?: () => void
}

export function SidebarNav({
  groups,
  isCompact,
  onNavigate,
}: SidebarNavProps) {
  return (
    <nav
      className="flex flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden py-4"
      aria-label="Main navigation"
    >
      {groups.map((group, index) => (
        <div key={group.label ?? index}>
          <SidebarNavGroup
            group={group}
            isCompact={isCompact}
            onNavigate={onNavigate}
          />
        </div>
      ))}
    </nav>
  )
}
