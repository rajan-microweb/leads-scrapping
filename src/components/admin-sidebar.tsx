"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { LayoutDashboard, PanelLeftClose, PanelLeft, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getSidebarNavGroups, type UserRole } from "@/config/sidebar-nav"
import { SidebarNav } from "@/components/layout/SidebarNav"
import { SidebarFooter } from "@/components/layout/SidebarFooter"

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed"
const DESKTOP_EXPANDED_WIDTH = "w-64"
const DESKTOP_COMPACT_WIDTH = "w-16"
const MOBILE_WIDTH = "w-64"

type SidebarProps = {
  user: {
    name?: string | null
    email?: string | null
  }
  avatarUrl?: string | null
  userRole?: UserRole
  /** Optional custom footer (e.g. extra actions). If not provided, default user block is shown. */
  footer?: React.ReactNode
}

export function AdminSidebar({
  user,
  avatarUrl,
  userRole = "CLIENT",
  footer,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)

  // Hydrate collapsed state from localStorage (desktop only)
  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (stored === "true") setIsOpen(false)
  }, [])

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) setIsOpen(false)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const toggleSidebar = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev
      if (typeof window !== "undefined" && !(window.innerWidth < 768)) {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(!next))
      }
      return next
    })
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    ;(window as unknown as { __sidebarToggle?: () => void }).__sidebarToggle =
      toggleSidebar
    return () => {
      delete (window as unknown as { __sidebarToggle?: () => void }).__sidebarToggle
    }
  }, [toggleSidebar])

  const navGroups = getSidebarNavGroups(userRole)
  const isCompact = !isMobile && !isOpen

  const handleNavigate = () => {
    if (isMobile) setIsOpen(false)
  }

  // Focus trap when sidebar is open on mobile
  useEffect(() => {
    if (!isMobile || !isOpen || !sidebarRef.current) return
    const el = sidebarRef.current
    const focusables = el.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])'
    )
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    first?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }
    el.addEventListener("keydown", handleKeyDown)
    return () => el.removeEventListener("keydown", handleKeyDown)
  }, [isMobile, isOpen])

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden animate-in fade-in duration-normal"
          onClick={() => setIsOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={cn(
          "flex h-screen flex-col border-r border-border bg-card shadow-card transition-[width] duration-slow ease-in-out",
          "fixed left-0 top-0 z-50 md:relative md:z-auto",
          "overflow-hidden",
          isMobile ? MOBILE_WIDTH : isOpen ? DESKTOP_EXPANDED_WIDTH : DESKTOP_COMPACT_WIDTH,
          isMobile && "transition-[transform,opacity] duration-slow ease-in-out",
          isMobile && !isOpen && "-translate-x-full"
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-full min-w-0 flex-col overflow-hidden p-4">
          {/* Header: brand + collapse toggle (desktop) or close (mobile) */}
          <div className="flex shrink-0 items-center justify-between gap-2">
            <Link
              href="/dashboard"
              onClick={handleNavigate}
              className={cn(
                "flex min-w-0 items-center gap-2 rounded-md text-lg font-semibold text-foreground transition-colors duration-normal hover:bg-muted/50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isCompact && "justify-center p-1.5"
              )}
              aria-label="Leads Scrapping home"
            >
              <LayoutDashboard
                className="h-5 w-5 shrink-0"
                aria-hidden
              />
              {!isCompact && (
                <span className="truncate transition-opacity duration-slow">
                  Leads Scrapping
                </span>
              )}
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
              aria-expanded={isOpen}
              className="shrink-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {isMobile ? (
                <PanelLeftClose className="h-5 w-5" aria-hidden />
              ) : isOpen ? (
                <PanelLeftClose className="h-5 w-5" aria-hidden />
              ) : (
                <PanelLeft className="h-5 w-5" aria-hidden />
              )}
            </Button>
          </div>

          {/* Navigation: scrollable, flex-1 */}
          <SidebarNav
            groups={navGroups}
            isCompact={isCompact}
            onNavigate={handleNavigate}
          />

          {/* Footer: user block or custom footer */}
          {footer !== undefined ? (
            <div className="shrink-0 border-t border-border pt-4">
              {footer}
            </div>
          ) : (
            <SidebarFooter
              user={user}
              avatarUrl={avatarUrl}
              isCompact={isCompact}
              onNavigate={handleNavigate}
            />
          )}
        </div>
      </aside>

      {/* Mobile menu button */}
      {isMobile && (
        <Button
          variant="outline"
          size="icon"
          onClick={toggleSidebar}
          aria-label="Open sidebar"
          aria-expanded={isOpen}
          className="fixed left-4 top-4 z-40 shadow-md md:hidden focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Menu className="h-6 w-6" aria-hidden />
        </Button>
      )}
    </>
  )
}
