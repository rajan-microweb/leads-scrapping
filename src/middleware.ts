import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // Public routes
  const publicRoutes = ["/", "/auth/signin", "/auth/signup"]
  const isPublicRoute = publicRoutes.includes(pathname)

  // Redirect to sign in if accessing protected route
  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/auth/signin", req.url))
  }

  // Admin-only routes
  if (pathname.startsWith("/users")) {
    const role = req.auth?.user?.role
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
  }

  // Redirect to dashboard if logged in and trying to access auth pages
  if (
    isLoggedIn &&
    (pathname === "/auth/signin" || pathname === "/auth/signup")
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
