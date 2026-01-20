"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const websiteInfoSchema = z.object({
  websiteName: z.string().min(1, "Website name is required"),
  websiteUrl: z.string().url("Invalid URL format"),
})

type WebsiteInfoFormData = z.infer<typeof websiteInfoSchema>

interface CompanyIntelligence {
  companyName?: string
  companyType?: string
  industryExpertise?: string
  fullTechSummary?: string
  theHook?: string
  whatTheyDo?: string
  valueProposition?: string
  serviceCatalog?: string[]
  brandTone?: string[]
}

export default function WebsiteInfoPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<WebsiteInfoFormData>({
    resolver: zodResolver(websiteInfoSchema),
  })

  const [companyIntelligence, setCompanyIntelligence] = useState<CompanyIntelligence | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const onSubmit = async (data: WebsiteInfoFormData) => {
    setError(null)
    setCompanyIntelligence(null)
    setIsLoading(true)

    try {
      const response = await fetch("/api/website-info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit website info")
      }

      // Extract company intelligence from response
      // Expected format (normalized by API): [{ company_intelligence: { ... } }]
      const responseData = result.data

      const firstItem =
        Array.isArray(responseData) && responseData.length > 0 ? responseData[0] : null

      const intelligence =
        firstItem?.company_intelligence ?? firstItem?.companyIntelligence ?? null

      if (intelligence && typeof intelligence === "object") {
        setCompanyIntelligence({
          companyName: intelligence.companyName || intelligence.company_name,
          companyType: intelligence.companyType || intelligence.company_type,
          industryExpertise: intelligence.industryExpertise || intelligence.industry_expertise,
          fullTechSummary: intelligence.fullTechSummary || intelligence.full_tech_summary,
          theHook: intelligence.theHook || intelligence.the_hook,
          whatTheyDo: intelligence.whatTheyDo || intelligence.what_they_do,
          valueProposition:
            intelligence.valueProposition ||
            intelligence.value_proposition ||
            intelligence.value_prop,
          serviceCatalog: Array.isArray(intelligence.serviceCatalog) 
            ? intelligence.serviceCatalog 
            : Array.isArray(intelligence.service_catalog)
            ? intelligence.service_catalog
            : [],
          brandTone: Array.isArray(intelligence.brandTone)
            ? intelligence.brandTone
            : Array.isArray(intelligence.brand_tone)
            ? intelligence.brand_tone
            : [],
        })
      } else {
        setError("No company intelligence data found in the response.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Website Information</h1>
          <p className="text-muted-foreground">
            Submit website details to extract and analyze company intelligence
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Website Details</CardTitle>
            <CardDescription>Enter the website information to analyze</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="websiteName">Website Name</Label>
                <Input
                  id="websiteName"
                  type="text"
                  placeholder="e.g., Example Company"
                  {...register("websiteName")}
                  disabled={isSubmitting || isLoading}
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
                  {...register("websiteUrl")}
                  disabled={isSubmitting || isLoading}
                />
                {errors.websiteUrl && (
                  <p className="text-sm text-red-600">{errors.websiteUrl.message}</p>
                )}
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}
              <Button type="submit" disabled={isSubmitting || isLoading}>
                {isLoading ? "Analyzing..." : isSubmitting ? "Submitting..." : "Analyze Website"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {isLoading && (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground">Analyzing website data...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {companyIntelligence && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Intelligence</CardTitle>
                <CardDescription>Auto-extracted company information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {companyIntelligence.companyName && (
                  <div>
                    <Label className="text-sm font-semibold">Company Name</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {companyIntelligence.companyName}
                    </p>
                  </div>
                )}

                {companyIntelligence.companyType && (
                  <div>
                    <Label className="text-sm font-semibold">Company Type</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {companyIntelligence.companyType}
                    </p>
                  </div>
                )}

                {companyIntelligence.industryExpertise && (
                  <div>
                    <Label className="text-sm font-semibold">Industry Expertise</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {companyIntelligence.industryExpertise}
                    </p>
                  </div>
                )}

                {companyIntelligence.fullTechSummary && (
                  <div>
                    <Label className="text-sm font-semibold">Full Tech Summary</Label>
                    <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                      {companyIntelligence.fullTechSummary}
                    </p>
                  </div>
                )}

                {companyIntelligence.theHook && (
                  <div>
                    <Label className="text-sm font-semibold">The Hook</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {companyIntelligence.theHook}
                    </p>
                  </div>
                )}

                {companyIntelligence.whatTheyDo && (
                  <div>
                    <Label className="text-sm font-semibold">What They Do</Label>
                    <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                      {companyIntelligence.whatTheyDo}
                    </p>
                  </div>
                )}

                {companyIntelligence.valueProposition && (
                  <div>
                    <Label className="text-sm font-semibold">Value Proposition</Label>
                    <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                      {companyIntelligence.valueProposition}
                    </p>
                  </div>
                )}

                {companyIntelligence.serviceCatalog && companyIntelligence.serviceCatalog.length > 0 && (
                  <div>
                    <Label className="text-sm font-semibold">Service Catalog</Label>
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {companyIntelligence.serviceCatalog.map((service, index) => (
                        <li key={index} className="text-sm text-muted-foreground">
                          {service}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {companyIntelligence.brandTone && companyIntelligence.brandTone.length > 0 && (
                  <div>
                    <Label className="text-sm font-semibold">Brand Tone</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {companyIntelligence.brandTone.map((tone, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                        >
                          {tone}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  )
}
