import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname, search } = req.nextUrl
  const isLoggedIn = !!req.auth

  // Public routes
  const publicRoutes = [
    "/",
    "/auth/signin",
    "/auth/signup",
    "/auth/forgot-password",
    "/auth/reset-password",
  ]
  const isPublicRoute =
    publicRoutes.includes(pathname) || pathname.startsWith("/auth/reset-password")

  // Redirect to sign in if accessing protected route, preserving intended URL
  if (!isLoggedIn && !isPublicRoute) {
    const signInUrl = new URL("/auth/signin", req.url)
    const callbackUrl = `${pathname}${search}`
    if (callbackUrl && callbackUrl !== "/") {
      signInUrl.searchParams.set("callbackUrl", callbackUrl)
    }
    return NextResponse.redirect(signInUrl)
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
    (pathname === "/auth/signin" ||
      pathname === "/auth/signup" ||
      pathname === "/auth/forgot-password")
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
