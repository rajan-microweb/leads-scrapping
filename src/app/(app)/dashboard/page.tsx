import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardContent } from "./dashboard-content"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function DashboardPage() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) redirect("/auth/signin")

  return (
    <DashboardContent
      userRole={session.user?.role ?? "CLIENT"}
      userName={session.user?.name ?? null}
    />
  )
}

