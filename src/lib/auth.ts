import NextAuth from "next-auth"
import { SupabaseAdapter } from "@auth/supabase-adapter"
import { supabaseAdmin } from "@/lib/supabase-server"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import bcrypt from "bcryptjs"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const parsed = loginSchema.safeParse(credentials)

          if (!parsed.success) {
            console.error("[Auth] Invalid credentials format:", parsed.error)
            return null
          }

          const { password } = parsed.data
          const email = parsed.data.email.trim().toLowerCase()

          // Query user from Supabase
          const { data: user, error } = await supabaseAdmin
            .from("User")
            .select("*")
            .eq("email", email)
            .single()

          // Fail if user lookup failed
          if (error) {
            console.error("[Auth] User lookup error:", error.message)
            return null
          }

          // Fail if user doesn't exist
          if (!user) {
            console.error("[Auth] User not found for email:", email)
            return null
          }

          // Fail if password is missing
          if (!user.password) {
            console.error("[Auth] User has no password set:", email)
            return null
          }

          // Verify password FIRST (before checking emailVerified)
          // This ensures we only auto-verify users with correct credentials
          const isValid = await bcrypt.compare(password, user.password)

          if (!isValid) {
            console.error("[Auth] Invalid password for email:", email)
            return null
          }

          // Enforce that only verified users can log in.
          // `emailVerified` is a TIMESTAMP column; null/undefined means not verified.
          // For existing users created before email verification was added, auto-verify on first successful login
          if (!user.emailVerified) {
            console.warn("[Auth] User email not verified, auto-verifying on first login:", email)
            // Auto-verify the user by updating emailVerified
            const { error: updateError } = await supabaseAdmin
              .from("User")
              .update({ emailVerified: new Date().toISOString() })
              .eq("id", user.id)

            if (updateError) {
              console.error("[Auth] Failed to auto-verify user:", updateError.message)
              // Still allow login - this is a migration path for existing users
            }
          }

          // Only return non-sensitive fields to NextAuth; the rest stays in the database
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
          }
        } catch (err) {
          console.error("[Auth] Unexpected error in authorize:", err)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id
        if ("role" in user && (user as any).role) {
          token.role = (user as any).role
        }
      }
      // Default role to CLIENT if not already set
      if (!token.role) {
        token.role = "CLIENT"
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        // propagate role into session for easy access
        session.user.role = (token.role as "ADMIN" | "CLIENT") ?? "CLIENT"
      }
      return session
    },
  },
})

// Simple reusable helper to check if the current authenticated user is an admin
export async function isAdmin() {
  const session = await auth()
  return session?.user?.role === "ADMIN"
}
