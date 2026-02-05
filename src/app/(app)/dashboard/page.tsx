import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { DashboardContent } from "./dashboard-content"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function DashboardPage() {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    redirect("/auth/signin")
  }

  // If the user has not completed initial website/company onboarding, redirect
  // them to the onboarding flow before showing the main dashboard.
  const { data: latestSubmission } = await supabaseAdmin
    .from("WebsiteSubmission")
    .select("id")
    .eq("userId", userId)
    .order("createdAt", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latestSubmission) {
    redirect("/auth/onboarding")
  }

  return (
    <DashboardContent
      userRole={session.user?.role ?? "CLIENT"}
      userName={session.user?.name ?? null}
    />
  )
}

