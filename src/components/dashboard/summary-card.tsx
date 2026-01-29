import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type SummaryCardProps = {
  title: string
  value: number | null
  subtitle?: string
  href?: string
  loading?: boolean
  emptyMessage?: string
  /** Optional stagger delay (ms) for enter animation */
  staggerIndex?: number
}

export function SummaryCard({
  title,
  value,
  subtitle,
  href,
  loading = false,
  emptyMessage,
  staggerIndex = 0,
}: SummaryCardProps) {
  const displayValue = value === null ? "—" : value
  const showEmptyCta = value === 0 && emptyMessage && href

  const content = (
    <Card
      className={cn(
        "animate-stagger-in transition-all duration-normal hover:border-muted-foreground/30 hover:-translate-y-0.5 motion-reduce:translate-y-0 motion-reduce:transition-none"
      )}
      style={{
        animationDelay: `${staggerIndex * 50}ms`,
        animationFillMode: "backwards",
      }}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="type-caption font-medium">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-16" />
            {subtitle && <Skeleton className="h-4 w-24" />}
          </div>
        ) : (
          <>
            <div className="text-2xl font-semibold tabular-nums">
              {displayValue}
            </div>
            {subtitle && (
              <p className="mt-1 type-caption">{subtitle}</p>
            )}
            {showEmptyCta && (
              <p className="mt-2 type-caption">{emptyMessage}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )

  if (href && !loading) {
    return (
      <Link
        href={href}
        className="block focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg"
        aria-label={`${title}: ${displayValue}. ${showEmptyCta ? emptyMessage : "View details"}`}
      >
        {content}
      </Link>
    )
  }

  return content
}
