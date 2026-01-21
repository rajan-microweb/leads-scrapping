"use client"

import { IntegrationCard } from "@/components/integration-card"

export default function IntegrationsPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Connect your email and sales tools to keep lead outreach in sync and automate
          more of your workflow.
        </p>
      </div>

      <section aria-label="Available integrations" className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Email & Calendar
        </h2>

        <div className="grid gap-4">
          <IntegrationCard
            name="Outlook"
            platformName="outlook"
            description="Sync contacts and outreach with your Microsoft Outlook inbox and calendar."
          />
        </div>
      </section>
    </div>
  )
}

