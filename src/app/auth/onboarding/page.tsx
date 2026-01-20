"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

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

export default function OnboardingPage() {
  const router = useRouter()
  const [values, setValues] = useState<WebsiteFormValues>({
    websiteName: "",
    websiteUrl: "",
  })
  const [errors, setErrors] = useState<{ websiteName?: string; websiteUrl?: string }>({})
  const [loadingStatus, setLoadingStatus] = useState<"checking" | "idle">("checking")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [company, setCompany] = useState<CompanyIntelligence | null>(null)

  // First-time check: if profile already exists, skip to dashboard
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/profile-status")
        if (res.status === 401) {
          router.replace("/auth/signin")
          return
        }
        const json = await res.json()
        if (json.hasProfile) {
          router.replace("/dashboard")
          return
        }
      } catch {
        // If status check fails, fall back to showing form
      } finally {
        setLoadingStatus("idle")
      }
    }
    checkStatus()
  }, [router])

  const handleChange = (field: keyof WebsiteFormValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const parsed = websiteSchema.safeParse(values)
    if (!parsed.success) {
      const fieldErrors: typeof errors = {}
      for (const issue of parsed.error.issues) {
        const path = issue.path[0]
        if (path === "websiteName" || path === "websiteUrl") {
          fieldErrors[path] = issue.message
        }
      }
      setErrors(fieldErrors)
      return
    }

    setIsGenerating(true)
    try {
      const res = await fetch("/api/website-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
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

  const handleSaveAndContinue = async () => {
    setError(null)

    const parsed = websiteSchema.safeParse(values)
    if (!parsed.success) {
      const fieldErrors: typeof errors = {}
      for (const issue of parsed.error.issues) {
        const path = issue.path[0]
        if (path === "websiteName" || path === "websiteUrl") {
          fieldErrors[path] = issue.message
        }
      }
      setErrors(fieldErrors)
      return
    }

    if (!company) {
      setError("Please click Generate first to fetch your company information.")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteName: parsed.data.websiteName,
          websiteUrl: parsed.data.websiteUrl,
          company_intelligence: company,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to save profile")

      router.push("/dashboard")
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loadingStatus === "checking") {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">Preparing your workspace...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Set up your company</CardTitle>
          <CardDescription>
            Enter your website and let us auto-generate your company information. This only happens
            once, right after you sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="websiteName">Website Name</Label>
              <Input
                id="websiteName"
                value={values.websiteName}
                onChange={handleChange("websiteName")}
                placeholder="e.g., Gopal Info"
                disabled={isGenerating || isSubmitting}
              />
              {errors.websiteName && (
                <p className="text-sm text-red-600">{errors.websiteName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Website URL</Label>
              <Input
                id="websiteUrl"
                type="url"
                value={values.websiteUrl}
                onChange={handleChange("websiteUrl")}
                placeholder="https://example.com"
                disabled={isGenerating || isSubmitting}
              />
              {errors.websiteUrl && <p className="text-sm text-red-600">{errors.websiteUrl}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isGenerating || isSubmitting}>
              {isGenerating ? "Analyzing website..." : "Generate company information"}
            </Button>
          </form>

          {company && (
            <div className="space-y-3 rounded-md border bg-muted/40 p-3 text-sm">
              {company.company_name && (
                <div>
                  <span className="font-semibold">Company Name: </span>
                  <span className="text-muted-foreground">{company.company_name}</span>
                </div>
              )}
              {company.company_type && (
                <div>
                  <span className="font-semibold">Company Type: </span>
                  <span className="text-muted-foreground">{company.company_type}</span>
                </div>
              )}
              {company.industry_expertise && (
                <div>
                  <span className="font-semibold">Industry Expertise: </span>
                  <span className="text-muted-foreground">
                    {Array.isArray(company.industry_expertise)
                      ? company.industry_expertise.join(", ")
                      : company.industry_expertise}
                  </span>
                </div>
              )}
              {company.full_tech_summary && (
                <div>
                  <span className="font-semibold">Tech Summary: </span>
                  <span className="text-muted-foreground">
                    {Array.isArray(company.full_tech_summary)
                      ? company.full_tech_summary.join(" ")
                      : company.full_tech_summary}
                  </span>
                </div>
              )}
            </div>
          )}

          <Button
            type="button"
            className="w-full"
            variant="outline"
            disabled={isSubmitting || !company}
            onClick={handleSaveAndContinue}
          >
            {isSubmitting ? "Saving..." : "Save and go to Dashboard"}
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

