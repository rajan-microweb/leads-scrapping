import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  User,
  FileText,
  Plug,
  PenLine,
  Users,
} from "lucide-react"

export type UserRole = "ADMIN" | "CLIENT"

export interface SidebarNavItem {
  href: string
  label: string
  icon: LucideIcon
  /** If set, item is only shown for these roles. Omit for all roles. */
  roles?: UserRole[]
}

export interface SidebarNavGroup {
  label?: string
  items: SidebarNavItem[]
}

const sidebarNavGroups: SidebarNavGroup[] = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/profile", label: "Profile", icon: User },
    ],
  },
  {
    label: "Work",
    items: [
      { href: "/leads", label: "Leads", icon: FileText },
      { href: "/integrations", label: "Integrations", icon: Plug },
      { href: "/signatures", label: "Signatures", icon: PenLine },
    ],
  },
  {
    label: "Admin",
    items: [{ href: "/users", label: "Users", icon: Users, roles: ["ADMIN"] }],
  },
]

/**
 * Returns nav groups with items filtered by user role.
 */
export function getSidebarNavGroups(userRole: UserRole): SidebarNavGroup[] {
  return sidebarNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.roles || item.roles.includes(userRole)
      ),
    }))
    .filter((group) => group.items.length > 0)
}
