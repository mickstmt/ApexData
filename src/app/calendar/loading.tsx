import { Skeleton } from '@/components/ui/Skeleton';

export default function CalendarLoading() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header Skeleton */}
      <div className="mb-12">
        <div className="mb-4 flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-10 w-80" />
        </div>
        <Skeleton className="h-6 w-96" />
      </div>

      {/* Races List Skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-6"
          >
            <div className="grid gap-4 md:grid-cols-[auto_1fr_auto]">
              {/* Round number skeleton */}
              <div className="flex items-center">
                <Skeleton className="h-16 w-16 rounded-full" />
              </div>

              {/* Race info skeleton */}
              <div className="space-y-2">
                <Skeleton className="h-6 w-64" />
                <div className="flex flex-wrap gap-4">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="h-4 w-32" />
              </div>

              {/* Country skeleton */}
              <div className="flex items-center justify-end">
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats Skeleton */}
      <div className="mt-12 grid gap-4 rounded-lg border border-border bg-muted/50 p-6 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="text-center">
            <Skeleton className="mx-auto mb-2 h-10 w-16" />
            <Skeleton className="mx-auto h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}
