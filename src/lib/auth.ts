import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import bcrypt from "bcryptjs"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
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
        const parsed = loginSchema.safeParse(credentials)

        if (!parsed.success) {
          return null
        }

        const { password } = parsed.data
        const email = parsed.data.email.trim().toLowerCase()

        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user || !user.password) {
          return null
        }

        const isValid = await bcrypt.compare(password, user.password)

        if (!isValid) {
          return null
        }

        // Only return non-sensitive fields to NextAuth; the rest stays in the database
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
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
