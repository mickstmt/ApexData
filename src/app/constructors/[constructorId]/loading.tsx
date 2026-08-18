import { Skeleton } from '@/components/ui/Skeleton';

export default function ConstructorDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-12">
      <span role="status" className="sr-only">
        Cargando el equipo…
      </span>

      {/* Volver a equipos */}
      <Skeleton className="mb-8 h-9 w-40 rounded-md" />

      {/* Cabecera: logo y datos */}
      <div className="mb-12 grid gap-8 md:grid-cols-[200px_1fr]">
        <div className="flex items-center justify-center md:items-start">
          <Skeleton className="h-48 w-48 rounded-lg" />
        </div>

        <div className="space-y-6">
          <div>
            <Skeleton className="mb-2 h-10 w-80 max-w-full md:h-12" />
            <Skeleton className="h-7 w-32 rounded-md" />
          </div>

          {/* Victorias, podios y puntos */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>

          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      </div>

      {/* Pilotos */}
      <div className="mb-12">
        <Skeleton className="mb-6 h-8 w-32" />
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[38px] w-40 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Resultados recientes */}
      <div className="mb-12">
        <Skeleton className="mb-6 h-8 w-64" />

        <div className="border-b border-border pb-3">
          <div className="flex gap-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>

        <div className="divide-y divide-border">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-10" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center">
        <Skeleton className="h-4 w-64" />
      </div>
    </div>
  );
}