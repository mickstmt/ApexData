import { Skeleton } from '@/components/ui/Skeleton';

/**
 * El esqueleto copia la forma de la ficha —trazado a la izquierda, título y
 * datos a la derecha, cuatro cifras y la tabla— para que al llegar el contenido
 * nada salte de sitio.
 */
export default function CircuitDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <span role="status" className="sr-only">
        Cargando la ficha del circuito…
      </span>

      <Skeleton className="mb-6 h-5 w-40" />

      {/* Cabecera */}
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center">
        <Skeleton className="h-40 shrink-0 rounded-xl md:w-72" />

        <div className="min-w-0 flex-1">
          <Skeleton className="mb-2 h-5 w-44" />
          <Skeleton className="mb-3 h-9 w-72 max-w-full md:h-10" />
          <Skeleton className="h-5 w-80 max-w-full" />
        </div>
      </div>

      {/* Las cuatro cifras */}
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-xl" />
        ))}
      </div>

      {/* Quién manda aquí */}
      <div className="mb-10 grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>

      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
