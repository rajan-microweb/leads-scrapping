"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const websiteSchema = z.object({
  websiteName: z.string().min(1, "Website name is required"),
  websiteUrl: z.string().url("Invalid URL format"),
})

type WebsiteFormValues = z.infer<typeof websiteSchema>

type CompanyIntelligence = {
  company_name?: string | null
  company_type?: string | null
  industry_expertise?: string | string[] | null
  full_tech_summary?: string | string[] | null
  service_catalog?: string[] | null
  the_hook?: string | null
  what_they_do?: string | null
  value_prop?: string | null
  brand_tone?: string[] | null
}

function ReadOnlyField({
  label,
  value,
  multiline,
}: {
  label: string
  value?: string | null
  multiline?: boolean
}) {
  if (!value) return null

  if (multiline) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <textarea
          readOnly
          value={value}
          className={cn(
            "flex min-h-[96px] w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
        />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input readOnly value={value} className="bg-muted/30 text-muted-foreground" />
    </div>
  )
}

export function DashboardWebsiteAnalysis() {
  const [intelligence, setIntelligence] = useState<CompanyIntelligence | null>(null)
  const [editable, setEditable] = useState<CompanyIntelligence>({
    company_name: "",
    company_type: "",
    industry_expertise: [],
    full_tech_summary: "",
    service_catalog: [],
    the_hook: "",
    what_they_do: "",
    value_prop: "",
    brand_tone: [],
  })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WebsiteFormValues>({
    resolver: zodResolver(websiteSchema),
    defaultValues: {
      websiteName: "",
      websiteUrl: "",
    },
  })

  const fullTechSummaryText = useMemo(() => {
    if (!intelligence) return null
    const v = intelligence.full_tech_summary
    if (Array.isArray(v)) return v.filter(Boolean).join("\n")
    return v ?? null
  }, [intelligence])

  const industryExpertiseText = useMemo(() => {
    const v = editable.industry_expertise
    if (Array.isArray(v)) return v.filter(Boolean).join("\n")
    return v ?? ""
  }, [editable])

  const fullTechSummaryEditableText = useMemo(() => {
    const v = editable.full_tech_summary
    if (Array.isArray(v)) return v.filter(Boolean).join("\n")
    return v ?? ""
  }, [editable])

  // Load latest saved company info so dashboard and profile stay in sync
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/my-company-info")
        if (!res.ok) return
        const data = await res.json()
        if (!data) return

        reset({
          websiteName: data.websiteName ?? "",
          websiteUrl: data.websiteUrl ?? "",
        })

        const ci: CompanyIntelligence = {
          company_name: data.companyName ?? null,
          company_type: data.companyType ?? null,
          industry_expertise: data.industryExpertise ?? null,
          full_tech_summary: data.fullTechSummary ?? null,
          service_catalog: data.serviceCatalog ?? null,
          the_hook: data.theHook ?? null,
          what_they_do: data.whatTheyDo ?? null,
          value_prop: data.valueProposition ?? null,
          brand_tone: data.brandTone ?? null,
        }

        setIntelligence(ci)
        setEditable(ci)
      } catch {
        // ignore, dashboard can still work without preloaded data
      }
    }
    load()
  }, [reset])

  const onGenerate = async (values: WebsiteFormValues) => {
    setError(null)
    setIntelligence(null)
    setIsLoading(true)
    setSaveSuccess(false)

    try {
      const res = await fetch("/api/website-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.error || "Failed to generate company intelligence")
      }

      // Expected: [{ company_intelligence: { ... } }]
      const arr = json?.data
      const ci: CompanyIntelligence | null =
        Array.isArray(arr) && arr.length > 0 ? arr[0]?.company_intelligence ?? null : null

      if (!ci) {
        throw new Error("Company intelligence not found in response.")
      }

      setIntelligence(ci)
      setEditable(ci)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmitToDb = async (values: WebsiteFormValues) => {
    setError(null)
    setSaveSuccess(false)
    setIsSaving(true)

    try {
      const payload = {
        websiteName: values.websiteName,
        websiteUrl: values.websiteUrl,

        companyName: editable.company_name ?? null,
        companyType: editable.company_type ?? null,
        industryExpertise: editable.industry_expertise ?? null,
        fullTechSummary: editable.full_tech_summary ?? null,
        serviceCatalog: editable.service_catalog ?? null,
        theHook: editable.the_hook ?? null,
        whatTheyDo: editable.what_they_do ?? null,
        valueProposition: editable.value_prop ?? null,
        brandTone: editable.brand_tone ?? null,
      }

      const res = await fetch("/api/my-company-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error || "Failed to save company info")
      }

      setSaveSuccess(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save company info")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Website Analysis</CardTitle>
          <CardDescription>
            Tip: You can auto-fill your company data by entering website details and clicking{" "}
            <span className="font-medium">Generate</span>. You can also manually fill the form below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onGenerate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="websiteName">Website Name</Label>
              <Input
                id="websiteName"
                placeholder="e.g., Gopal Info"
                disabled={isSubmitting || isLoading}
                {...register("websiteName")}
              />
              {errors.websiteName && (
                <p className="text-sm text-red-600">{errors.websiteName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Website URL</Label>
              <Input
                id="websiteUrl"
                type="url"
                placeholder="https://example.com"
                disabled={isSubmitting || isLoading}
                {...register("websiteUrl")}
              />
              {errors.websiteUrl && (
                <p className="text-sm text-red-600">{errors.websiteUrl.message}</p>
              )}
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
            )}

            <Button type="submit" disabled={isSubmitting || isLoading}>
              {isLoading ? "Generating..." : "Generate"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className={cn(intelligence ? "animate-in fade-in-0 slide-in-from-bottom-2" : "")}>
        <CardHeader>
          <CardTitle>My Company Info</CardTitle>
          <CardDescription>
            Fill this manually, or click <span className="font-medium">Generate</span> above to
            auto-fill it from your website.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                value={editable.company_name ?? ""}
                onChange={(e) => setEditable((p) => ({ ...p, company_name: e.target.value }))}
                placeholder="Company name"
              />
            </div>
            <div className="space-y-2">
              <Label>Company Type</Label>
              <Input
                value={editable.company_type ?? ""}
                onChange={(e) => setEditable((p) => ({ ...p, company_type: e.target.value }))}
                placeholder="e.g., Digital Agency"
              />
            </div>

            <div className="space-y-2">
              <Label>Industry Expertise</Label>
              <textarea
                value={industryExpertiseText}
                onChange={(e) => {
                  const lines = e.target.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean)
                  setEditable((p) => ({ ...p, industry_expertise: lines }))
                }}
                className={cn(
                  "flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
                placeholder="One per line"
              />
            </div>

            <div className="space-y-2">
              <Label>Full Tech Summary</Label>
              <textarea
                value={fullTechSummaryEditableText}
                onChange={(e) => setEditable((p) => ({ ...p, full_tech_summary: e.target.value }))}
                className={cn(
                  "flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Service Catalog</Label>
            <textarea
              value={(editable.service_catalog ?? []).join("\n")}
              onChange={(e) => {
                const lines = e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean)
                setEditable((p) => ({ ...p, service_catalog: lines }))
              }}
              className={cn(
                "flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
              placeholder="One per line"
            />
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>The Hook</Label>
              <textarea
                value={editable.the_hook ?? ""}
                onChange={(e) => setEditable((p) => ({ ...p, the_hook: e.target.value }))}
                className={cn(
                  "flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>What They Do</Label>
              <textarea
                value={editable.what_they_do ?? ""}
                onChange={(e) => setEditable((p) => ({ ...p, what_they_do: e.target.value }))}
                className={cn(
                  "flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Value Proposition</Label>
              <textarea
                value={editable.value_prop ?? ""}
                onChange={(e) => setEditable((p) => ({ ...p, value_prop: e.target.value }))}
                className={cn(
                  "flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Brand Tone</Label>
            <textarea
              value={(editable.brand_tone ?? []).join("\n")}
              onChange={(e) => {
                const lines = e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean)
                setEditable((p) => ({ ...p, brand_tone: lines }))
              }}
              className={cn(
                "flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
              placeholder="One per line"
            />
            {editable.brand_tone && editable.brand_tone.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {editable.brand_tone.map((t, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {saveSuccess && (
            <div className="text-sm text-green-700 bg-green-50 p-3 rounded-md">
              Saved to my_company_info successfully.
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleSubmit(onSubmitToDb)}
              disabled={isLoading || isSubmitting || isSaving}
            >
              {isSaving ? "Saving..." : "Submit"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

