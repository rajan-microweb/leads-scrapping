import Link from "next/link"
import { type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type QuickLinkProps = {
  href: string
  label: string
  icon: LucideIcon
  isCurrent?: boolean
}

export function QuickLink({ href, label, icon: Icon, isCurrent }: QuickLinkProps) {
  return (
    <Button
      variant={isCurrent ? "secondary" : "outline"}
      size="sm"
      className={cn(
        "min-w-0 shrink-0 transition-colors duration-normal motion-reduce:transition-none",
        isCurrent && "ring-2 ring-primary/20"
      )}
      asChild
    >
      <Link
        href={href}
        className="flex items-center gap-2 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={isCurrent ? `Current page: ${label}` : `Go to ${label}`}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span className="hidden sm:inline">{label}</span>
      </Link>
    </Button>
  )
}
