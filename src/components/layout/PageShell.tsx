import { cn } from "@/lib/utils"

type PageShellProps = {
  title: string
  description?: string
  actions?: React.ReactNode
  /** sm = narrow (forms), default = wide, lg = wide, full = use all available space */
  maxWidth?: "sm" | "default" | "lg" | "full"
  children: React.ReactNode
  className?: string
}

const maxWidthClass = {
  sm: "w-full max-w-page-sm mx-auto",
  default: "w-full max-w-screen-2xl",
  lg: "w-full max-w-screen-2xl",
  full: "w-full min-w-0",
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
    <div className={cn("space-y-6 min-w-0", maxWidthClass[maxWidth], className)}>
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
