import { Skeleton } from '@/components/ui/Skeleton';

export default function TelemetryLoading() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header Skeleton */}
      <div className="mb-12">
        <div className="mb-4 flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-12 w-96" />
        </div>
        <Skeleton className="h-6 w-full max-w-2xl" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      {/* Session Card Skeleton */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <div className="mb-4">
          <Skeleton className="mb-2 h-8 w-64" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>

        {/* Weather Skeleton */}
        <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4">
          <Skeleton className="mb-3 h-4 w-48" />
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="mb-1 h-3 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Drivers Grid Skeleton */}
      <div className="mb-8">
        <Skeleton className="mb-4 h-6 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="mb-1 h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
