import type { Metadata } from "next"
import { Inter } from "next/font/google"
import NextTopLoader from "nextjs-toploader"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Leads Scrapping",
  description: "Full-stack application with Next.js 14, Supabase, and NextAuth",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
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
      </body>
    </html>
  )
}
