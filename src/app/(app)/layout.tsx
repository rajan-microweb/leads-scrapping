import Link from "next/link"
import { auth, signOut } from "@/lib/auth"
import { redirect } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase-server"
import { AdminSidebar } from "@/components/admin-sidebar"
import { Button } from "@/components/ui/button"
import { SidebarToggle } from "@/components/layout/SidebarToggle"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/auth/signin")

  // Fetch user avatar
  const { data: user } = await supabaseAdmin
    .from('User')
    .select('"avatarUrl", image, name, email')
    .eq('id', session.user?.id)
    .single()

  const avatarUrl = user?.avatarUrl ?? user?.image ?? null

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <AdminSidebar
        user={{
          name: user?.name ?? null,
          email: user?.email ?? null,
        }}
        avatarUrl={avatarUrl}
        userRole={session.user?.role ?? "CLIENT"}
      />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
          <div className="flex items-center gap-4">
            <SidebarToggle />
            <h1 className="text-lg font-semibold md:text-xl">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="flex items-center justify-center rounded-full border-2 border-transparent hover:border-muted-foreground transition-colors"
              aria-label="Profile"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                  {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
                </div>
              )}
            </Link>
            <form
              action={async () => {
                "use server"
                // Sign out the user and send them back to the dedicated auth page.
                // Using an explicit auth route avoids any accidental redirects that
                // could look like an automatic login in production.
                await signOut({ redirectTo: "/auth/signin" })
              }}
            >
              <Button type="submit" variant="outline" size="sm">
                Sign Out
              </Button>
            </form>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="h-full w-full p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}

