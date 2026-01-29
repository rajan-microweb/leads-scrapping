import { cn } from "@/lib/utils"

type ErrorMessageProps = {
  message: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

export function ErrorMessage({
  message,
  onRetry,
  retryLabel = "Retry",
  className,
}: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-4 text-sm text-destructive",
        className
      )}
    >
      <p className="text-center">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="font-medium underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
        >
          {retryLabel}
        </button>
      )}
    </div>
  )
}
