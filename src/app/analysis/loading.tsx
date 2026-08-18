import { Skeleton } from '@/components/ui/Skeleton';

export default function AnalysisLoading() {
  return (
    <div className="container mx-auto px-4 py-12">
      <span role="status" className="sr-only">
        Cargando el análisis de telemetría…
      </span>

      {/* Cabecera */}
      <div className="mb-12">
        <div className="mb-4 flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-10 w-[30rem] max-w-full md:h-12" />
        </div>
        <Skeleton className="h-6 w-96 max-w-full" />
        <Skeleton className="mt-2 h-4 w-[34rem] max-w-full" />
      </div>

      {/* Panel de selección de sesión */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <Skeleton className="mb-4 h-7 w-48" />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="mb-2 h-4 w-24" />
              <Skeleton className="h-[38px] w-full rounded-md" />
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-4">
          <Skeleton className="h-10 w-56 rounded-md" />
          <Skeleton className="h-10 w-52 rounded-md" />
          <Skeleton className="h-10 w-48 rounded-md" />
        </div>
      </div>

      {/* Zona de resultados, todavía vacía */}
      <div className="rounded-lg border border-border bg-muted/50 p-12 text-center">
        <Skeleton className="mx-auto mb-4 h-12 w-12 rounded-full" />
        <Skeleton className="mx-auto mb-4 h-8 w-72 max-w-full" />
        <Skeleton className="mx-auto h-4 w-96 max-w-full" />
        <Skeleton className="mx-auto mt-2 h-4 w-80 max-w-full" />
      </div>
    </div>
  );
}