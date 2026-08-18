import { Skeleton } from '@/components/ui/Skeleton';

export default function CircuitsLoading() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <span role="status" className="sr-only">
        Cargando circuitos…
      </span>

      {/* Cabecera */}
      <div className="mb-8">
        <Skeleton className="mb-2 h-9 w-48 md:h-10" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>

      {/* Rejilla de trazados */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col overflow-hidden rounded-xl border border-border bg-card"
          >
            {/* Trazado */}
            <div className="flex h-36 items-center justify-center bg-muted/40 p-4">
              <Skeleton className="h-full w-2/3" />
            </div>

            <div className="flex flex-1 flex-col gap-1 p-4">
              {/* Bandera y ubicación */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-[18px] w-[18px] rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>

              {/* Nombre del circuito */}
              <Skeleton className="h-6 w-3/4" />

              {/* Carreras y última edición */}
              <div className="mt-auto flex items-center justify-between pt-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}