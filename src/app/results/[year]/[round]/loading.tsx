import { Skeleton } from '@/components/ui/Skeleton';

export default function RaceDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-12">
      <span role="status" className="sr-only">
        Cargando la carrera…
      </span>

      {/* Volver y cabecera */}
      <div className="mb-8">
        <Skeleton className="mb-4 h-4 w-44" />
        <Skeleton className="mb-2 h-4 w-32" />
        <Skeleton className="mb-2 h-10 w-[28rem] max-w-full md:h-12" />
        <div className="flex flex-wrap items-center gap-4">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>

      {/* Pestañas de sesión */}
      <div className="mb-8 overflow-x-auto">
        <div className="flex min-w-max gap-2 border-b border-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[44px] w-28 rounded-none" />
          ))}
        </div>
      </div>

      {/* Ganador, vueltas y vuelta rápida */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-6">
            <div className="mb-2 flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="mt-1 h-4 w-32" />
          </div>
        ))}
      </div>

      {/* Clasificación final */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center gap-4 border-b border-border bg-muted/50 p-4">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="hidden h-4 w-28 md:block" />
          <Skeleton className="ml-auto h-4 w-12" />
          <Skeleton className="h-4 w-20" />
        </div>

        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border p-4">
            <Skeleton className="h-10 w-10 rounded-md" />
            <Skeleton className="h-6 w-8" />
            <div className="flex flex-1 items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="hidden h-4 w-28 md:block" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>

      {/* Podio e información del circuito */}
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <Skeleton className="mb-4 h-7 w-32" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <Skeleton className="mb-4 h-7 w-56" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-36" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}