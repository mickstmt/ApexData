import { Skeleton } from '@/components/ui/Skeleton';

/**
 * El esqueleto tiene que medir lo mismo que la tarjeta de verdad.
 *
 * Antes copiaba la tarjeta antigua —banda de trazado de 144 px y texto debajo,
 * 250 px en total— y al encoger la tarjeta a 100 px se habría quedado
 * prometiendo un alto que ya no existe: **150 px de salto por tarjeta** en
 * cuanto llegaran los datos.
 */
export default function CircuitsLoading() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <span role="status" className="sr-only">
        Cargando circuitos…
      </span>

      {/* Cabecera */}
      <div className="mb-6">
        <Skeleton className="mb-2 h-9 w-48 md:h-10" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>

      {/* Buscador y filtros */}
      <div className="mb-6">
        <Skeleton className="h-11 w-full rounded-md" />
        <div className="mt-3 flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-11 flex-1 rounded-full" />
          ))}
        </div>
      </div>

      {/* La lista, con el alto real de la tarjeta en fila */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-lg border border-border bg-card p-3"
          >
            <Skeleton className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-md" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
