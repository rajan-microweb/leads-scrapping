import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"
import { ProfileForm } from "./profile-form"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function ProfilePage() {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return null
  }

  const { data: user } = await supabaseAdmin
    .from('User')
    .select('name, "fullName", email, phone, country, image, "avatarUrl"')
    .eq('id', userId)
    .single()

  // Prefer data from myCompanyInfo (user-editable), fall back to last websiteSubmission
  const { data: myCompany } = await supabaseAdmin
    .from('my_company_info')
    .select('*')
    .eq('userId', userId)
    .order('createdAt', { ascending: false })
    .limit(1)
    .single()

  const { data: latestSubmission } = await supabaseAdmin
    .from('WebsiteSubmission')
    .select('*')
    .eq('userId', userId)
    .order('createdAt', { ascending: false })
    .limit(1)
    .single()

  let initialWebsiteName: string | null = null
  let initialWebsiteUrl: string | null = null
  let initialCompanyIntelligence: any = null

  if (myCompany) {
    initialWebsiteName = myCompany.websiteName
    initialWebsiteUrl = myCompany.websiteUrl
    initialCompanyIntelligence = {
      company_name: myCompany.companyName,
      company_type: myCompany.companyType,
      industry_expertise: myCompany.industryExpertise,
      full_tech_summary: myCompany.fullTechSummary,
      service_catalog: myCompany.serviceCatalog,
      the_hook: myCompany.theHook,
      what_they_do: myCompany.whatTheyDo,
      value_prop: myCompany.valueProposition,
      brand_tone: myCompany.brandTone,
    }
  } else if (latestSubmission) {
    initialWebsiteName = latestSubmission.websiteName
    initialWebsiteUrl = latestSubmission.websiteUrl

    const extracted = latestSubmission.extractedData as any
    initialCompanyIntelligence =
      extracted && Array.isArray(extracted) && extracted.length > 0
        ? extracted[0]?.company_intelligence ?? null
        : extracted?.company_intelligence ?? null
  }

  return (
    <ProfileForm
      initialUser={{
        // Prefer explicit fullName; fall back to signup `name` for older accounts
        fullName: user?.fullName ?? user?.name ?? null,
        email: user?.email ?? null,
        phone: user?.phone ?? null,
        location: user?.country ?? null,
        profileImageUrl: user?.avatarUrl ?? user?.image ?? null,
      }}
      initialWebsiteName={initialWebsiteName}
      initialWebsiteUrl={initialWebsiteUrl}
      initialCompanyIntelligence={initialCompanyIntelligence}
    />
  )
}

