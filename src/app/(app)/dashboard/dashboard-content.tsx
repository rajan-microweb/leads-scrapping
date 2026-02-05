"use client"

import dynamic from "next/dynamic"
import { useEffect, useState, useMemo, useCallback } from "react"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  User,
  FileSpreadsheet,
  Plug,
  FileSignature,
  Users,
} from "lucide-react"
import { SummaryCard } from "@/components/dashboard/summary-card"
import { QuickLink } from "@/components/dashboard/quick-link"
import {
  IntegrationStatus,
  type IntegrationStatusItem,
} from "@/components/dashboard/integration-status"
import {
  RecentActivityList,
  type RecentActivityItem,
} from "@/components/dashboard/recent-activity-list"
import { ErrorMessage } from "@/components/ErrorMessage"
import { Skeleton } from "@/components/ui/skeleton"

const DashboardWebsiteAnalysis = dynamic(
  () =>
    import("@/components/dashboard-website-analysis").then(
      (mod) => mod.DashboardWebsiteAnalysis
    ),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="h-32 w-full rounded-lg" />
    ),
  }
)

type DashboardContentProps = {
  userRole: "ADMIN" | "CLIENT"
  userName?: string | null
}

type LeadSheet = { id: string; sheetName: string; uploadedAt: string }
type Signature = { id: string; name: string; updatedAt: string; createdAt: string }
type Integration = {
  id: string
  platformName: string
  isConnected: boolean
  updatedAt?: string
  createdAt?: string
}

const PLATFORM_DISPLAY_NAMES: Record<string, string> = {
  outlook: "Outlook",
}

export function DashboardContent({
  userRole,
  userName,
}: DashboardContentProps) {
  const pathname = usePathname()
  const [leads, setLeads] = useState<LeadSheet[]>([])
  const [signatures, setSignatures] = useState<Signature[]>([])
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isCurrentPath = useCallback(
    (href: string) => {
      if (!pathname) return false
      return pathname === href || pathname.startsWith(`${href}/`)
    },
    [pathname]
  )

  useEffect(() => {
    let cancelled = false

    async function fetchAll() {
      setLoading(true)
      setError(null)
      try {
        const [leadsRes, signaturesRes, integrationsRes] = await Promise.all([
          fetch("/api/lead-files"),
          fetch("/api/signatures"),
          fetch("/api/integrations"),
        ])

        if (cancelled) return

        const hadPartialError =
          !leadsRes.ok || !signaturesRes.ok || !integrationsRes.ok
        if (hadPartialError) {
          setError(
            "Some dashboard sections failed to load. Data may be incomplete."
          )
        }

        const [leadsData, sigsData, intsData] = await Promise.all([
          leadsRes.ok ? leadsRes.json() : [],
          signaturesRes.ok ? signaturesRes.json() : [],
          integrationsRes.ok ? integrationsRes.json() : [],
        ])

        if (cancelled) return

        setLeads(Array.isArray(leadsData) ? leadsData : [])
        setSignatures(Array.isArray(sigsData) ? sigsData : [])
        setIntegrations(Array.isArray(intsData) ? intsData : [])
      } catch (e) {
        if (!cancelled) {
          setError("Failed to load dashboard data. Please refresh.")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAll()
    return () => {
      cancelled = true
    }
  }, [])

  const integrationStatusItems: IntegrationStatusItem[] = useMemo(() => {
    const known = new Set(integrations.map((i) => i.platformName))
    const items: IntegrationStatusItem[] = integrations.map((i) => ({
      name: PLATFORM_DISPLAY_NAMES[i.platformName] ?? i.platformName,
      connected: !!i.isConnected,
    }))
    return items
  }, [integrations])

  const recentActivity: RecentActivityItem[] = useMemo(() => {
    const entries: { date: Date; item: RecentActivityItem }[] = []

    leads.slice(0, 5).forEach((s) => {
      entries.push({
        date: new Date(s.uploadedAt),
        item: {
          type: "lead",
          label: `Lead sheet: ${s.sheetName}`,
          href: `/leads/${s.id}`,
          date: new Date(s.uploadedAt),
        },
      })
    })

    signatures.slice(0, 5).forEach((s) => {
      entries.push({
        date: new Date(s.updatedAt || s.createdAt),
        item: {
          type: "signature",
          label: `Signature: ${s.name}`,
          href: "/signatures",
          date: new Date(s.updatedAt || s.createdAt),
        },
      })
    })

    integrations
      .filter((i) => i.isConnected)
      .slice(0, 3)
      .forEach((i) => {
        const name = PLATFORM_DISPLAY_NAMES[i.platformName] ?? i.platformName
        const date = new Date(i.updatedAt || i.createdAt || 0)
        entries.push({
          date,
          item: {
            type: "integration",
            label: `${name} connected`,
            href: "/integrations",
            date,
          },
        })
      })

    entries.sort((a, b) => b.date.getTime() - a.date.getTime())
    return entries.slice(0, 10).map((e) => e.item)
  }, [leads, signatures, integrations])

  const connectedCount = integrations.filter((i) => i.isConnected).length

  const refetch = useCallback(() => {
    setError(null)
    setLoading(true)
    Promise.all([
      fetch("/api/lead-files"),
      fetch("/api/signatures"),
      fetch("/api/integrations"),
    ])
      .then(
        async ([leadsRes, signaturesRes, integrationsRes]): Promise<void> => {
          const hadPartialError =
            !leadsRes.ok || !signaturesRes.ok || !integrationsRes.ok

          if (hadPartialError) {
            setError(
              "Some dashboard sections failed to load. Data may be incomplete."
            )
          } else {
            setError(null)
          }

          const [leadsData, sigsData, intsData] = await Promise.all([
            leadsRes.ok ? leadsRes.json() : [],
            signaturesRes.ok ? signaturesRes.json() : [],
            integrationsRes.ok ? integrationsRes.json() : [],
          ])

          setLeads(Array.isArray(leadsData) ? leadsData : [])
          setSignatures(Array.isArray(sigsData) ? sigsData : [])
          setIntegrations(Array.isArray(intsData) ? intsData : [])
        }
      )
      .catch(() => {
        setError("Failed to load dashboard data. Please refresh.")
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="w-full max-w-screen-2xl space-y-8 min-w-0">
      {error && (
        <ErrorMessage
          message={error}
          onRetry={refetch}
          retryLabel="Refresh"
        />
      )}
      <header className="space-y-1">
        <h1 className="type-page-title">
          {userName ? `Welcome back, ${userName}` : "Dashboard"}
        </h1>
        <p className="type-body text-muted-foreground">
          Overview of your leads, integrations, and activity
        </p>
      </header>

      <section aria-labelledby="summary-heading" className="space-y-4">
        <h2 id="summary-heading" className="sr-only">
          Summary
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Leads"
            value={loading ? null : leads.length}
            subtitle="lead sheets"
            href="/leads"
            loading={loading}
            emptyMessage="Upload your first lead sheet"
            staggerIndex={0}
          />
          <SummaryCard
            title="Integrations"
            value={loading ? null : connectedCount}
            subtitle="connected"
            href="/integrations"
            loading={loading}
            emptyMessage="Connect an integration"
            staggerIndex={1}
          />
          <SummaryCard
            title="Signatures"
            value={loading ? null : signatures.length}
            subtitle="signatures"
            href="/signatures"
            loading={loading}
            emptyMessage="Add your first signature"
            staggerIndex={2}
          />
          <SummaryCard
            title="Recent activity"
            value={loading ? null : recentActivity.length}
            subtitle="items"
            loading={loading}
            staggerIndex={3}
          />
        </div>
      </section>

      <section aria-labelledby="quick-access-heading" className="space-y-4">
        <h2 id="quick-access-heading" className="type-overline">
          Quick access
        </h2>
        <div className="flex flex-wrap gap-2">
          <QuickLink
            href="/dashboard"
            label="Dashboard"
            icon={LayoutDashboard}
            isCurrent={isCurrentPath("/dashboard")}
          />
          <QuickLink
            href="/profile"
            label="Profile"
            icon={User}
            isCurrent={isCurrentPath("/profile")}
          />
          <QuickLink
            href="/leads"
            label="Leads"
            icon={FileSpreadsheet}
            isCurrent={isCurrentPath("/leads")}
          />
          <QuickLink
            href="/integrations"
            label="Integrations"
            icon={Plug}
            isCurrent={isCurrentPath("/integrations")}
          />
          <QuickLink
            href="/signatures"
            label="Signatures"
            icon={FileSignature}
            isCurrent={isCurrentPath("/signatures")}
          />
          {userRole === "ADMIN" && (
            <QuickLink
              href="/users"
              label="Users"
              icon={Users}
              isCurrent={isCurrentPath("/users")}
            />
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section
          className="lg:col-span-1"
          aria-labelledby="integration-status-heading"
        >
          <h2 id="integration-status-heading" className="sr-only">
            Integration status
          </h2>
          <IntegrationStatus
            items={integrationStatusItems}
            loading={loading}
            systemHealthLabel="All systems operational"
          />
        </section>
        <section
          className="lg:col-span-2"
          aria-labelledby="recent-activity-heading"
        >
          <h2 id="recent-activity-heading" className="sr-only">
            Recent activity
          </h2>
          <RecentActivityList items={recentActivity} loading={loading} />
        </section>
      </div>

      <section aria-labelledby="widgets-heading" className="space-y-4">
        <h2 id="widgets-heading" className="type-overline">
          Overview
        </h2>
        <div className="grid gap-6">
          <DashboardWebsiteAnalysis />
        </div>
      </section>
    </div>
  )
}
