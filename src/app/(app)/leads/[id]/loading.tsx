import { Skeleton } from "@/components/ui/skeleton"

export default function LeadDetailLoading() {
  return (
    <div className="flex h-full w-full animate-in fade-in-0 duration-200">
      <div className="flex flex-1 flex-col gap-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <Skeleton className="type-page-title h-8 w-56" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <Skeleton className="h-9 w-32 shrink-0" />
        </header>
        <div className="grid gap-6">
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
