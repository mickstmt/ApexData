import { ConstructorCardSkeleton } from '@/components/ui/Skeleton';

export default function ConstructorsLoading() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header Skeleton */}
      <div className="mb-12">
        <div className="mb-4 h-12 w-96 animate-pulse rounded-md bg-muted" />
        <div className="h-6 w-64 animate-pulse rounded-md bg-muted" />
      </div>

      {/* Search bar skeleton */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="h-10 flex-1 animate-pulse rounded-md bg-muted md:max-w-md" />
        <div className="flex items-center gap-4">
          <div className="h-10 w-48 animate-pulse rounded-md bg-muted" />
          <div className="h-6 w-32 animate-pulse rounded-md bg-muted" />
        </div>
      </div>

      {/* Grid of skeleton cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ConstructorCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
