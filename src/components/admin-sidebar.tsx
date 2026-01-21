"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type SidebarProps = {
  user: {
    name?: string | null
    email?: string | null
  }
  avatarUrl?: string | null
  userRole?: "ADMIN" | "CLIENT"
}

export function AdminSidebar({ user, avatarUrl, userRole = "CLIENT" }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) {
        setIsOpen(false)
      }
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  // Expose toggle function for parent components
  useEffect(() => {
    // @ts-ignore
    window.__sidebarToggle = toggleSidebar
    return () => {
      // @ts-ignore
      delete window.__sidebarToggle
    }
  }, [isOpen])

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/profile", label: "Profile" },
    { href: "/leads", label: "Leads" },
    { href: "/integrations", label: "Integrations" },
    { href: "/signatures", label: "Signatures" },
    // Only show Users page to admins
    ...(userRole === "ADMIN" ? [{ href: "/users", label: "Users" }] : []),
  ]

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "h-screen border-r bg-background transition-all duration-300 ease-in-out",
          "fixed left-0 top-0 z-50 md:relative md:z-auto",
          isMobile
            ? isOpen
              ? "translate-x-0"
              : "-translate-x-full"
            : "",
          isMobile ? "w-64" : isOpen ? "w-64" : "w-0 border-0"
        )}
      >
        <div
          className={cn(
            "flex h-full flex-col p-4 overflow-hidden",
            !isOpen && !isMobile && "p-0"
          )}
        >
          {/* Header */}
          {isOpen && (
            <div className="mb-6 flex items-center justify-between">
              <Link
                href="/dashboard"
                className="text-lg font-semibold"
                onClick={() => isMobile && setIsOpen(false)}
              >
                Leads Scrapping
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                aria-label="Close sidebar"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </Button>
            </div>
          )}

          {/* Navigation */}
          {isOpen && (
            <>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => isMobile && setIsOpen(false)}
                      className={cn(
                        "block rounded-md px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </nav>

              {/* User info at bottom */}
              <div className="mt-auto pt-4">
                <Card className="p-3">
                  <p className="text-sm font-medium">
                    {user.name || user.email || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground">Signed in</p>
                </Card>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Mobile menu button */}
      {isMobile && (
        <button
          onClick={toggleSidebar}
          className="fixed left-4 top-4 z-40 rounded-md bg-background p-2 shadow-md md:hidden"
          aria-label="Open sidebar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
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
        </button>
      )}
    </>
  )
}
