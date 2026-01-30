import { Skeleton } from "@/components/ui/skeleton"

export default function AppLoading() {
  return (
    <div className="flex h-full w-full animate-in fade-in-0 duration-200">
      <div className="flex flex-1 flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  )
}
