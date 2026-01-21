import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { SignaturesList } from "./signatures-list"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function SignaturesPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  return <SignaturesList />
}
