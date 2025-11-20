import { Skeleton } from '@/components/ui/Skeleton';

export default function DriverDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Back button skeleton */}
      <Skeleton className="mb-8 h-9 w-36" />

      {/* Header Section Skeleton */}
      <div className="mb-12 grid gap-8 md:grid-cols-[200px_1fr]">
        {/* Avatar skeleton */}
        <div className="flex items-center justify-center md:items-start">
          <Skeleton className="h-48 w-48 rounded-full" />
        </div>

        {/* Info skeleton */}
        <div className="space-y-6">
          {/* Name and Number */}
          <div>
            <div className="mb-2 flex items-center gap-3">
              <Skeleton className="h-12 w-80" />
              <Skeleton className="h-12 w-16" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>

          {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4">
                <Skeleton className="mb-2 h-4 w-24" />
                <Skeleton className="h-6 w-32" />
              </div>
            ))}
          </div>

          {/* Bio skeleton */}
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>

      {/* Recent Results Skeleton */}
      <div className="mb-12">
        <Skeleton className="mb-6 h-8 w-56" />

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 pr-4 text-left">
                  <Skeleton className="h-4 w-16" />
                </th>
                <th className="pb-3 pr-4 text-left">
                  <Skeleton className="h-4 w-16" />
                </th>
                <th className="pb-3 pr-4 text-left">
                  <Skeleton className="h-4 w-16" />
                </th>
                <th className="pb-3 text-left">
                  <Skeleton className="h-4 w-20" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="py-3 pr-4">
                    <Skeleton className="h-4 w-48" />
                  </td>
                  <td className="py-3 pr-4">
                    <Skeleton className="h-4 w-40" />
                  </td>
                  <td className="py-3 pr-4">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="py-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* External Link skeleton */}
      <div className="flex justify-center">
        <Skeleton className="h-4 w-64" />
      </div>
    </div>
  );
}
