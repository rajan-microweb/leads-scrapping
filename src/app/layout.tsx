import type { Metadata } from "next"
import { Inter } from "next/font/google"
import NextTopLoader from "nextjs-toploader"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Leads Scrapping",
  description: "Full-stack application with Next.js 14, Supabase, and NextAuth",
}

const criticalFallbackStyles = `
  body{font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background-color:#f8fafc;color:#1e293b;-webkit-font-smoothing:antialiased}
  a{color:#4f46e5;text-decoration:none}
  a:hover{text-decoration:underline}
  button{font-family:inherit;cursor:pointer}
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <style dangerouslySetInnerHTML={{ __html: criticalFallbackStyles }} />
        <ThemeProvider>
          <NextTopLoader
            color="hsl(243 75% 52%)"
            height={3}
            showSpinner={false}
            shadow={false}
            speed={200}
            easing="ease"
            zIndex={1600}
          />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
