import { Skeleton } from '@/components/ui/Skeleton';

export default function StandingsLoading() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header Skeleton */}
      <div className="mb-12">
        <div className="mb-4 flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-10 w-96" />
        </div>
        <Skeleton className="h-6 w-80" />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Drivers Standings Skeleton */}
        <div>
          <div className="mb-6 flex items-center gap-2">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-8 w-64" />
          </div>

          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
              >
                {/* Position */}
                <Skeleton className="h-8 w-12" />

                {/* Driver info */}
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-32" />
                </div>

                {/* Points */}
                <div className="text-right">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="mt-1 h-3 w-8" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-center">
            <Skeleton className="mx-auto h-4 w-48" />
          </div>
        </div>

        {/* Constructors Standings Skeleton */}
        <div>
          <div className="mb-6 flex items-center gap-2">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-8 w-72" />
          </div>

          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
              >
                {/* Position */}
                <Skeleton className="h-8 w-12" />

                {/* Team name */}
                <Skeleton className="h-5 flex-1" />

                {/* Points */}
                <div className="text-right">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="mt-1 h-3 w-8" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-center">
            <Skeleton className="mx-auto h-4 w-48" />
          </div>
        </div>
      </div>

      {/* Info Note Skeleton */}
      <div className="mt-12 rounded-lg border border-border bg-muted/50 p-6 text-center">
        <Skeleton className="mx-auto h-4 w-96" />
      </div>
    </div>
  );
}
