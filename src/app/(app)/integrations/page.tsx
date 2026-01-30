"use client"

import { IntegrationCard } from "@/components/integration-card"
import { PageShell } from "@/components/layout/PageShell"

export default function IntegrationsPage() {
  return (
    <PageShell
      title="Integrations"
      description="Connect your email and sales tools to keep lead outreach in sync and automate more of your workflow."
      maxWidth="default"
      className="flex flex-col gap-6"
    >
      <section aria-label="Available integrations" className="space-y-4">
        <h2 className="type-overline">Email & Calendar</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <IntegrationCard
            name="Outlook"
            platformName="outlook"
            description="Sync contacts and outreach with your Microsoft Outlook inbox and calendar."
          />
        </div>
      </section>
    </PageShell>
  )
}

