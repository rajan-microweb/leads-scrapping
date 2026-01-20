"use client"

import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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

export function ProfileOnboarding({
  initialWebsiteName,
  initialWebsiteUrl,
  initialCompanyIntelligence,
}: {
  initialWebsiteName?: string | null
  initialWebsiteUrl?: string | null
  initialCompanyIntelligence?: CompanyIntelligence | null
}) {
  const router = useRouter()
  const [company, setCompany] = useState<CompanyIntelligence | null>(
    initialCompanyIntelligence ?? null
  )
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<WebsiteFormValues>({
    resolver: zodResolver(websiteSchema),
    defaultValues: {
      websiteName: initialWebsiteName ?? "",
      websiteUrl: initialWebsiteUrl ?? "",
    },
  })

  const fullTechSummaryText = useMemo(() => {
    if (!company) return ""
    const v = company.full_tech_summary
    if (Array.isArray(v)) return v.filter(Boolean).join("\n")
    return (v ?? "").toString()
  }, [company])

  const industryExpertiseText = useMemo(() => {
    if (!company) return ""
    const v = company.industry_expertise
    if (Array.isArray(v)) return v.filter(Boolean).join("\n")
    return (v ?? "").toString()
  }, [company])

  const onGenerate = async (values: WebsiteFormValues) => {
    setError(null)
    setIsGenerating(true)

    try {
      const res = await fetch("/api/website-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to generate company intelligence")

      const arr = json?.data
      const ci: CompanyIntelligence | null =
        Array.isArray(arr) && arr.length > 0 ? arr[0]?.company_intelligence ?? null : null

      if (!ci) throw new Error("Company intelligence not found in response.")
      setCompany(ci)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setIsGenerating(false)
    }
  }

  const onSubmitProfile = async () => {
    setError(null)
    setIsSubmitting(true)

    try {
      const values = getValues()
      if (!values.websiteName || !values.websiteUrl) {
        throw new Error("Please fill Website Name and Website URL.")
      }
      if (!company) {
        throw new Error("Click Generate to auto-fill your company intelligence first.")
      }

      // Save structured company info to my_company_info table
      const payload = {
        websiteName: values.websiteName,
        websiteUrl: values.websiteUrl,
        companyName: company.company_name ?? null,
        companyType: company.company_type ?? null,
        industryExpertise: company.industry_expertise ?? null,
        fullTechSummary: company.full_tech_summary ?? null,
        serviceCatalog: company.service_catalog ?? null,
        theHook: company.the_hook ?? null,
        whatTheyDo: company.what_they_do ?? null,
        valueProposition: company.value_prop ?? null,
        brandTone: company.brand_tone ?? null,
      }

      const [profileRes, myCompanyRes] = await Promise.all([
        // Keep websiteSubmission in sync for first-time dashboard redirect logic
        fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            websiteName: values.websiteName,
            websiteUrl: values.websiteUrl,
            company_intelligence: company,
          }),
        }),
        fetch("/api/my-company-info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      ])

      const profileJson = await profileRes.json()
      const myCompanyJson = await myCompanyRes.json()

      if (!profileRes.ok) throw new Error(profileJson?.error || "Failed to save profile")
      if (!myCompanyRes.ok) throw new Error(myCompanyJson?.error || "Failed to save company info")

      router.push("/dashboard")
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Setup</CardTitle>
          <CardDescription>
            You can auto-fill your company data by entering website details and clicking{" "}
            <span className="font-medium">Generate</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onGenerate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="websiteName">Website Name</Label>
              <Input id="websiteName" {...register("websiteName")} disabled={isGenerating || isSubmitting} />
              {errors.websiteName && (
                <p className="text-sm text-red-600">{errors.websiteName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Website URL</Label>
              <Input id="websiteUrl" type="url" {...register("websiteUrl")} disabled={isGenerating || isSubmitting} />
              {errors.websiteUrl && (
                <p className="text-sm text-red-600">{errors.websiteUrl.message}</p>
              )}
            </div>

            {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

            <div className="flex gap-2">
              <Button type="submit" disabled={isGenerating || isSubmitting}>
                {isGenerating ? "Generating..." : "Generate"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onSubmitProfile}
                disabled={isGenerating || isSubmitting || !company}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className={company ? "animate-in fade-in-0 slide-in-from-bottom-2" : ""}>
        <CardHeader>
          <CardTitle>Company Intelligence</CardTitle>
          <CardDescription>
            Auto-fill by clicking <span className="font-medium">Generate</span>, then edit as
            needed before saving.
          </CardDescription>
        </CardHeader>
          <CardContent className="space-y-6">
          {!company ? (
            <p className="text-sm text-muted-foreground">
              No company intelligence yet. Fill website details and click Generate.
            </p>
            ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={company.company_name ?? ""}
                    onChange={(e) =>
                      setCompany((prev) => (prev ? { ...prev, company_name: e.target.value } : prev))
                    }
                    placeholder="Company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Type</Label>
                  <Input
                    value={company.company_type ?? ""}
                    onChange={(e) =>
                      setCompany((prev) => (prev ? { ...prev, company_type: e.target.value } : prev))
                    }
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
                      setCompany((prev) =>
                        prev ? { ...prev, industry_expertise: lines } : prev
                      )
                    }}
                    className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="One per line"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Full Tech Summary</Label>
                  <textarea
                    value={fullTechSummaryText}
                    onChange={(e) =>
                      setCompany((prev) =>
                        prev ? { ...prev, full_tech_summary: e.target.value } : prev
                      )
                    }
                    className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Service Catalog</Label>
                <textarea
                  value={(company.service_catalog ?? []).join("\n")}
                  onChange={(e) => {
                    const lines = e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean)
                    setCompany((prev) => (prev ? { ...prev, service_catalog: lines } : prev))
                  }}
                  className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="One per line"
                />
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>The Hook</Label>
                  <textarea
                    value={company.the_hook ?? ""}
                    onChange={(e) =>
                      setCompany((prev) =>
                        prev ? { ...prev, the_hook: e.target.value } : prev
                      )
                    }
                    className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>What They Do</Label>
                  <textarea
                    value={company.what_they_do ?? ""}
                    onChange={(e) =>
                      setCompany((prev) =>
                        prev ? { ...prev, what_they_do: e.target.value } : prev
                      )
                    }
                    className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Value Proposition</Label>
                  <textarea
                    value={company.value_prop ?? ""}
                    onChange={(e) =>
                      setCompany((prev) =>
                        prev ? { ...prev, value_prop: e.target.value } : prev
                      )
                    }
                    className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Brand Tone</Label>
                <textarea
                  value={(company.brand_tone ?? []).join("\n")}
                  onChange={(e) => {
                    const lines = e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean)
                    setCompany((prev) => (prev ? { ...prev, brand_tone: lines } : prev))
                  }}
                  className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="One per line"
                />
                {company.brand_tone && company.brand_tone.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {company.brand_tone.map((t, idx) => (
                      <span
                        key={idx}
                        className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

