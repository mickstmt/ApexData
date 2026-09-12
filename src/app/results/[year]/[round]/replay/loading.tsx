import { Skeleton } from '@/components/ui/Skeleton';

/**
 * El esqueleto del replay espeja la torre: cabecera, mapa arriba, filas
 * debajo y los mandos al pie — en escritorio, mapa y torre lado a lado. Así la
 * pantalla no salta cuando llega la de verdad.
 *
 * Usa los mismos tokens `--replay-*` que la pantalla real, así que la espera
 * ya sale en el tema del usuario: un esqueleto carbón delante de una app clara
 * sería exactamente el salto que este componente existe para evitar.
 */
export default function ReplayLoading() {
  return (
    <div className="flex h-[calc(100dvh-4rem-env(safe-area-inset-top))] flex-col bg-[var(--replay-fondo)] text-[var(--replay-texto)] md:grid md:h-[calc(100dvh-4rem)] md:grid-cols-[1fr_340px] md:grid-rows-[auto_1fr_auto]">
      <span role="status" className="sr-only">
        Cargando el replay…
      </span>

      <div className="shrink-0 md:col-span-2">
        {/* En el móvil la cabecera mide 44 px, como la de verdad. */}
        <div className="flex h-11 items-center gap-3 border-b border-[var(--replay-borde)] px-4 md:hidden">
          <Skeleton className="h-5 w-5 bg-[var(--replay-superficie-2)]" />
          <Skeleton className="h-5 w-28 bg-[var(--replay-superficie-2)]" />
          <Skeleton className="ml-auto h-5 w-20 bg-[var(--replay-superficie-2)]" />
        </div>
        <div className="hidden items-end justify-between border-b border-[var(--replay-borde)] px-4 py-3 md:flex">
          <div>
            <Skeleton className="mb-3 h-3 w-24 bg-[var(--replay-superficie-2)]" />
            <Skeleton className="h-7 w-32 bg-[var(--replay-superficie-2)]" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <Skeleton className="h-3 w-10 bg-[var(--replay-superficie-2)]" />
            <Skeleton className="h-5 w-20 bg-[var(--replay-superficie-2)]" />
          </div>
        </div>
        <Skeleton className="aspect-[1/0.77] w-full rounded-none bg-[var(--replay-superficie)] md:hidden" />
      </div>

      <Skeleton className="hidden rounded-none bg-[var(--replay-superficie)] md:col-start-1 md:row-start-2 md:block" />
      <div className="hidden gap-2 border-t border-[var(--replay-borde)] px-4 py-3 md:col-start-1 md:row-start-3 md:grid">
        <Skeleton className="h-2 w-full bg-[var(--replay-superficie-2)]" />
        <div className="grid grid-cols-[44px_200px_44px_56px] gap-2.5">
          <Skeleton className="h-11 bg-[var(--replay-superficie-2)]" />
          <Skeleton className="h-12 bg-[var(--replay-superficie-2)]" />
          <Skeleton className="h-11 bg-[var(--replay-superficie-2)]" />
          <Skeleton className="h-11 bg-[var(--replay-superficie-2)]" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden md:col-start-2 md:row-span-2 md:row-start-2 md:border-l md:border-[var(--replay-borde)]">
        <ul className="m-0 list-none p-0">
          {Array.from({ length: 10 }).map((_, i) => (
            <li
              key={i}
              className="grid min-h-[44px] grid-cols-[30px_4px_1fr_auto] items-center gap-x-2.5 border-b border-[var(--replay-borde-fila)] px-4 md:min-h-[30px] md:border-b-0"
            >
              <Skeleton className="h-3 w-5 bg-[var(--replay-superficie-2)]" />
              <Skeleton className="h-6 w-1 bg-[var(--replay-superficie-2)]" />
              <Skeleton className="h-3 w-28 bg-[var(--replay-superficie-2)]" />
              <Skeleton className="h-3 w-12 bg-[var(--replay-superficie-2)]" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
