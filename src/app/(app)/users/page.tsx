import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-server"
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

  const { data: users } = await supabaseAdmin
    .from('User')
    .select('id, name, email, role, "createdAt"')
    .order('createdAt', { ascending: false })

  return (
    <UsersTable
      currentUserId={session.user.id}
      initialUsers={(users || []).map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role as "ADMIN" | "CLIENT",
        createdAt: new Date(u.createdAt).toISOString(),
      }))}
    />
  )
}

