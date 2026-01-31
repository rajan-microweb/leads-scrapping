"use client"

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { signOutAction } from "@/actions/auth"
import { AdminSidebar } from "@/components/admin-sidebar"
import { Button } from "@/components/ui/button"
import { SidebarToggle } from "@/components/layout/SidebarToggle"
import { AppHeaderTitle } from "@/components/layout/AppHeaderTitle"
import { ThemeToggle } from "@/components/theme-toggle"
import { Skeleton } from "@/components/ui/skeleton"
import { ToastProvider, ToastViewport } from "@/components/ui/toast"

type UserRole = "ADMIN" | "CLIENT"

type AppShellProps = {
  session: {
    user?: {
      id?: string
      role?: UserRole
    }
  } | null
  children: React.ReactNode
}

type UserInfo = {
  name?: string | null
  email?: string | null
  avatarUrl?: string | null
}

function AppLoadingFallback() {
  return (
    <div className="flex h-full w-full animate-in fade-in-0 duration-150">
      <div className="flex flex-1 flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  )
}

export function AppShell({ session, children }: AppShellProps) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [userLoading, setUserLoading] = useState(true)

  useEffect(() => {
    if (!session?.user?.id) {
      setUserLoading(false)
      return
    }
    let cancelled = false
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        setUser({
          name: data.name ?? data.fullName ?? null,
          email: data.email ?? null,
          avatarUrl: data.avatarUrl ?? data.image ?? null,
        })
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setUserLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [session?.user?.id])

  const userRole = (session?.user?.role as UserRole) ?? "CLIENT"
  const avatarUrl = user?.avatarUrl ?? null
  const displayName = user?.name ?? user?.email ?? null
  const initial = displayName?.charAt(0).toUpperCase() ?? "U"

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <AdminSidebar
        user={{
          name: user?.name ?? null,
          email: user?.email ?? null,
        }}
        avatarUrl={avatarUrl}
        userRole={userRole}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <ToastProvider>
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 shadow-card backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6 transition-shadow duration-normal">
            <div className="flex items-center gap-4">
              <SidebarToggle />
              <AppHeaderTitle />
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link
                href="/profile"
                className="flex items-center justify-center rounded-full border-2 border-transparent transition-colors duration-normal hover:border-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Profile"
              >
                {userLoading ? (
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                ) : avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
                    {initial}
                  </div>
                )}
              </Link>
              <form action={signOutAction}>
                <Button type="submit" variant="outline" size="sm">
                  Sign Out
                </Button>
              </form>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto min-w-0">
            <div className="h-full w-full min-w-0 p-4 md:p-6 lg:p-8">
              <Suspense fallback={<AppLoadingFallback />}>
                {children}
              </Suspense>
            </div>
          </main>
          <ToastViewport />
        </ToastProvider>
      </div>
    </div>
  )
}
