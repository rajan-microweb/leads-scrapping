"use client"

import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

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

const profileSchema = z.object({
  // Personal information
  fullName: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  location: z.string().optional().nullable(),

  // Website info
  websiteUrl: z.string().url("Invalid URL format"),

  // Company intelligence (all optional/editable)
  companyName: z.string().optional().nullable(),
  companyType: z.string().optional().nullable(),
  industryExpertise: z.string().optional().nullable(), // newline-separated for UI
  fullTechSummary: z.string().optional().nullable(),
  serviceCatalog: z.string().optional().nullable(), // newline-separated
  theHook: z.string().optional().nullable(),
  whatTheyDo: z.string().optional().nullable(),
  valueProposition: z.string().optional().nullable(),
  brandTone: z.string().optional().nullable(), // newline-separated tags
})

type ProfileFormValues = z.infer<typeof profileSchema>

export type ProfileFormProps = {
  initialUser: {
    fullName?: string | null
    email?: string | null
    phone?: string | null
    location?: string | null
    profileImageUrl?: string | null
  }
  initialWebsiteName?: string | null
  initialWebsiteUrl?: string | null
  initialCompanyIntelligence?: CompanyIntelligence | null
}

export function ProfileForm({
  initialUser,
  initialWebsiteName,
  initialWebsiteUrl,
  initialCompanyIntelligence,
}: ProfileFormProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialUser.profileImageUrl ?? null
  )
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  const defaultIndustryExpertise = useMemo(() => {
    const v = initialCompanyIntelligence?.industry_expertise
    if (Array.isArray(v)) return v.filter(Boolean).join("\n")
    return (v ?? "").toString()
  }, [initialCompanyIntelligence])

  const defaultFullTechSummary = useMemo(() => {
    const v = initialCompanyIntelligence?.full_tech_summary
    if (Array.isArray(v)) return v.filter(Boolean).join("\n")
    return (v ?? "").toString()
  }, [initialCompanyIntelligence])

  const defaultServiceCatalog = useMemo(() => {
    const v = initialCompanyIntelligence?.service_catalog ?? []
    return Array.isArray(v) ? v.filter(Boolean).join("\n") : ""
  }, [initialCompanyIntelligence])

  const defaultBrandTone = useMemo(() => {
    const v = initialCompanyIntelligence?.brand_tone ?? []
    return Array.isArray(v) ? v.filter(Boolean).join("\n") : ""
  }, [initialCompanyIntelligence])

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: initialUser.fullName ?? "",
      email: initialUser.email ?? "",
      phone: initialUser.phone ?? "",
      location: initialUser.location ?? "",
      websiteUrl: initialWebsiteUrl ?? "",
      companyName: initialCompanyIntelligence?.company_name ?? "",
      companyType: initialCompanyIntelligence?.company_type ?? "",
      industryExpertise: defaultIndustryExpertise,
      fullTechSummary: defaultFullTechSummary,
      serviceCatalog: defaultServiceCatalog,
      theHook: initialCompanyIntelligence?.the_hook ?? "",
      whatTheyDo: initialCompanyIntelligence?.what_they_do ?? "",
      valueProposition: initialCompanyIntelligence?.value_prop ?? "",
      brandTone: defaultBrandTone,
    },
  })

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file")
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB")
        return
      }
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAvatarUpload = async () => {
    if (!avatarFile) return

    setIsUploadingAvatar(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("avatar", avatarFile)

      const res = await fetch("/api/profile/upload-avatar", {
        method: "POST",
        body: formData,
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error || "Failed to upload avatar")
      }

      setSuccess("Profile picture updated successfully.")
      setAvatarFile(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload avatar")
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  // Helper function to derive website name from URL
  const deriveWebsiteName = (url: string): string => {
    try {
      const urlObj = new URL(url)
      let hostname = urlObj.hostname
      // Remove www. prefix if present
      if (hostname.startsWith("www.")) {
        hostname = hostname.substring(4)
      }
      // Return the domain name (e.g., "example.com" becomes "example")
      return hostname.split(".")[0] || hostname
    } catch {
      return ""
    }
  }

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = form

  const handleGenerate = async () => {
    setError(null)
    setSuccess(null)
    setIsGenerating(true)

    const websiteUrl = form.getValues("websiteUrl")
    if (!websiteUrl) {
      setError("Please enter a website URL")
      setIsGenerating(false)
      return
    }

    const websiteName = deriveWebsiteName(websiteUrl)

    try {
      const res = await fetch("/api/website-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteName, websiteUrl }),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error || "Failed to generate company information")
      }

      const arr = json?.data
      const ci: CompanyIntelligence | null =
        Array.isArray(arr) && arr.length > 0 ? arr[0]?.company_intelligence ?? null : null

      if (!ci) {
        throw new Error("Company intelligence not found in response.")
      }

      // Overwrite all company fields with generated data
      setValue("companyName", ci.company_name ?? "")
      setValue("companyType", ci.company_type ?? "")

      const industryText = Array.isArray(ci.industry_expertise)
        ? ci.industry_expertise.filter(Boolean).join("\n")
        : (ci.industry_expertise ?? "").toString()
      setValue("industryExpertise", industryText)

      const fullTechText = Array.isArray(ci.full_tech_summary)
        ? ci.full_tech_summary.filter(Boolean).join("\n")
        : (ci.full_tech_summary ?? "").toString()
      setValue("fullTechSummary", fullTechText)

      const serviceText = Array.isArray(ci.service_catalog)
        ? ci.service_catalog.filter(Boolean).join("\n")
        : ""
      setValue("serviceCatalog", serviceText)

      setValue("theHook", ci.the_hook ?? "")
      setValue("whatTheyDo", ci.what_they_do ?? "")
      setValue("valueProposition", ci.value_prop ?? "")

      const brandToneText = Array.isArray(ci.brand_tone)
        ? ci.brand_tone.filter(Boolean).join("\n")
        : ""
      setValue("brandTone", brandToneText)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong while generating data")
    } finally {
      setIsGenerating(false)
    }
  }

  const onSubmit = async (values: ProfileFormValues) => {
    setError(null)
    setSuccess(null)
    setIsSaving(true)

    try {
      const websiteName = deriveWebsiteName(values.websiteUrl)

      const companyIntelligence: CompanyIntelligence = {
        company_name: values.companyName ?? null,
        company_type: values.companyType ?? null,
        industry_expertise: (values.industryExpertise ?? "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        full_tech_summary: values.fullTechSummary ?? null,
        service_catalog: (values.serviceCatalog ?? "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        the_hook: values.theHook ?? null,
        what_they_do: values.whatTheyDo ?? null,
        value_prop: values.valueProposition ?? null,
        brand_tone: (values.brandTone ?? "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      }

      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Personal
          fullName: values.fullName,
          email: values.email,
          phone: values.phone,
          location: values.location,
          // Website + company
          websiteName: websiteName,
          websiteUrl: values.websiteUrl,
          company_intelligence: companyIntelligence,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error || "Failed to save profile")
      }

      setSuccess("Profile saved successfully.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save profile")
    } finally {
      setIsSaving(false)
    }
  }

  const onSubmitHandler = handleSubmit(onSubmit)

  return (
    <form onSubmit={onSubmitHandler} className="space-y-8">
      {/* Section 0: Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your basic profile details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" {...register("fullName")} />
              {errors.fullName && (
                <p className="text-sm text-red-600">{errors.fullName.message as string}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" {...register("email")} disabled />
              <p className="text-xs text-muted-foreground">
                Email is managed by authentication and cannot be changed here.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" {...register("phone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" {...register("location")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar">Profile Picture / Avatar</Label>
            <div className="flex items-start gap-4">
              {avatarPreview && (
                <div className="relative h-20 w-20 flex-shrink-0">
                  <img
                    src={avatarPreview}
                    alt="Profile preview"
                    className="h-full w-full rounded-full object-cover border"
                  />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={isUploadingAvatar || isSaving}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleAvatarUpload}
                    disabled={!avatarFile || isUploadingAvatar || isSaving}
                    size="sm"
                  >
                    {isUploadingAvatar ? "Uploading..." : "Upload Avatar"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload a profile picture (max 5MB). Supported formats: JPG, PNG, GIF, etc.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 1: Website & Company Information */}
      <Card>
        <CardHeader>
          <CardTitle>Website &amp; Company Information</CardTitle>
          <CardDescription>
            Fill in the website details below. You can auto-fill company information by clicking the{" "}
            <span className="font-medium">Generate</span> button.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Website fields */}
          <div className="space-y-2">
            <Label htmlFor="websiteUrl">Website URL</Label>
            <div className="flex gap-2">
              <Input
                id="websiteUrl"
                type="url"
                placeholder="https://example.com"
                {...register("websiteUrl")}
                disabled={isGenerating || isSaving}
                className="flex-1"
              />
              <Button type="button" onClick={handleGenerate} disabled={isGenerating || isSaving}>
                {isGenerating ? "Generating..." : "Generate"}
              </Button>
            </div>
            {errors.websiteUrl && (
              <p className="text-sm text-red-600">{errors.websiteUrl.message as string}</p>
            )}
          </div>

          {/* Company fields */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" {...register("companyName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyType">Company Type</Label>
              <Input id="companyType" {...register("companyType")} placeholder="e.g., Digital Agency" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industryExpertise">Industry Expertise</Label>
              <textarea
                id="industryExpertise"
                {...register("industryExpertise")}
                className={cn(
                  "flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
                placeholder="One per line"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullTechSummary">Full Tech Summary</Label>
              <textarea
                id="fullTechSummary"
                {...register("fullTechSummary")}
                className={cn(
                  "flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceCatalog">Service Catalog</Label>
            <textarea
              id="serviceCatalog"
              {...register("serviceCatalog")}
              className={cn(
                "flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
              placeholder="One service per line"
            />
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="theHook">The Hook</Label>
              <textarea
                id="theHook"
                {...register("theHook")}
                className={cn(
                  "flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatTheyDo">What They Do</Label>
              <textarea
                id="whatTheyDo"
                {...register("whatTheyDo")}
                className={cn(
                  "flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valueProposition">Value Proposition</Label>
              <textarea
                id="valueProposition"
                {...register("valueProposition")}
                className={cn(
                  "flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brandTone">Brand Tone (tags)</Label>
            <textarea
              id="brandTone"
              {...register("brandTone")}
              className={cn(
                "flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
              placeholder="One tone tag per line"
            />
          </div>
        </CardContent>
      </Card>

      {/* Global messages + save button */}
      <div className="space-y-4">
        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}
        {success && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{success}</div>
        )}
        <div className="flex justify-end">
          <Button type="submit" disabled={isGenerating || isSaving}>
            {isSaving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </div>
    </form>
  )
}

