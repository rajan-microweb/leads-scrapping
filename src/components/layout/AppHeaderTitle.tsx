"use client"

import { usePathname } from "next/navigation"

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/leads": "Leads",
  "/integrations": "Integrations",
  "/signatures": "Signatures",
  "/users": "Users",
  "/profile": "Profile",
}

function getPageTitle(pathname: string): string {
  if (pathname in PAGE_TITLES) return PAGE_TITLES[pathname]
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (path !== "/" && pathname.startsWith(path)) return title
  }
  return "Admin Panel"
}

export function AppHeaderTitle() {
  const pathname = usePathname()
  const title = getPageTitle(pathname ?? "")

  return (
    <h1 className="type-section-title text-lg md:text-xl transition-opacity duration-normal">
      {title}
    </h1>
  )
}
