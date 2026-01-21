import "next-auth"
import "next-auth/jwt"

type AppRole = "ADMIN" | "CLIENT"

declare module "next-auth" {
  interface User {
    role?: AppRole
  }

  interface Session {
    user: {
      id: string
      email?: string | null
      name?: string | null
      image?: string | null
      role: AppRole
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: AppRole
  }
}
