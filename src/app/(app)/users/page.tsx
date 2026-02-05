import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { UsersTable } from "./users-table"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function UsersPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  return <UsersTable currentUserId={session.user.id} />
}

