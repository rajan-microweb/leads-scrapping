import { cn } from "@/lib/utils"

type PageShellProps = {
  title: string
  description?: string
  actions?: React.ReactNode
  maxWidth?: "sm" | "default" | "lg"
  children: React.ReactNode
  className?: string
}

const maxWidthClass = {
  sm: "max-w-page-sm",
  default: "max-w-page",
  lg: "max-w-page-lg",
} as const

export function PageShell({
  title,
  description,
  actions,
  maxWidth = "default",
  children,
  className,
}: PageShellProps) {
  return (
    <div className={cn("mx-auto space-y-6", maxWidthClass[maxWidth], className)}>
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="type-page-title">{title}</h1>
          {description && (
            <p className="type-body text-muted-foreground max-w-xl">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </header>
      {children}
    </div>
  )
}
