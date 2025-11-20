import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

export function DriverCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card p-6">
      {/* Número permanente en background */}
      <div className="absolute right-4 top-4 h-16 w-16">
        <Skeleton className="h-full w-full" />
      </div>

      {/* Avatar placeholder */}
      <Skeleton className="mb-4 h-16 w-16 rounded-full" />

      {/* Nombre */}
      <Skeleton className="mb-2 h-6 w-3/4" />

      {/* Código */}
      <Skeleton className="mb-3 h-6 w-16" />

      {/* Información */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export function ConstructorCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card p-6">
      {/* Icon */}
      <Skeleton className="mb-4 h-16 w-16 rounded-full" />

      {/* Nombre */}
      <Skeleton className="mb-3 h-6 w-3/4" />

      {/* Información */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-12 flex-1" />
          <Skeleton className="h-12 flex-1" />
          <Skeleton className="h-12 flex-1" />
          <Skeleton className="h-12 w-20" />
        </div>
      ))}
    </div>
  );
}
