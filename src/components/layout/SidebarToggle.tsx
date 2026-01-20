"use client"

import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"

declare global {
  interface Window {
    __sidebarToggle?: () => void
  }
}

export function SidebarToggle() {
  const handleClick = () => {
    if (typeof window !== "undefined" && typeof window.__sidebarToggle === "function") {
      window.__sidebarToggle()
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      aria-label="Toggle sidebar"
      className="hidden md:flex"
    >
      <Menu className="h-5 w-5" />
      <span className="sr-only">Toggle sidebar</span>
    </Button>
  )
}

