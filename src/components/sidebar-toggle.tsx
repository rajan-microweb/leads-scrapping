"use client"

import { Button } from "@/components/ui/button"

export function SidebarToggle() {
  const toggleSidebar = () => {
    // @ts-ignore
    if (typeof window !== "undefined" && window.__sidebarToggle) {
      // @ts-ignore
      window.__sidebarToggle()
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      aria-label="Toggle sidebar"
      className="md:flex hidden"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
    </Button>
  )
}
