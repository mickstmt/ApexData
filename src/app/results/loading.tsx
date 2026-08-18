import { Skeleton } from '@/components/ui/Skeleton';

export default function ResultsLoading() {
  return (
    <div className="container mx-auto px-4 py-12">
      <span role="status" className="sr-only">
        Cargando resultados…
      </span>

      {/* Cabecera con selector de temporada */}
      <div className="mb-12">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-10 w-72 md:h-12" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-[42px] w-44 rounded-lg md:h-[38px]" />
          </div>
        </div>
        <Skeleton className="h-6 w-96 max-w-full" />
      </div>

      {/* Tabla de carreras */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {/* Cabecera de la tabla */}
        <div className="flex items-center gap-4 border-b border-border bg-muted/50 p-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="ml-auto h-4 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>

        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border p-4">
            {/* Gran Premio: emoji y dos líneas */}
            <div className="flex flex-1 items-center gap-3">
              <Skeleton className="h-7 w-7" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>

            {/* Fecha */}
            <Skeleton className="hidden h-4 w-24 md:block" />

            {/* Ganador */}
            <div className="hidden items-center gap-2 md:flex">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-28" />
            </div>

            {/* Equipo */}
            <div className="hidden items-center gap-2 lg:flex">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>

            {/* Vueltas y tiempo */}
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}