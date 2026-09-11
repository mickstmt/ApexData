import { Skeleton } from '@/components/ui/Skeleton';

/**
 * El esqueleto del replay espeja la torre: cabecera, mapa arriba, filas
 * debajo y los mandos al pie — en escritorio, mapa y torre lado a lado. Así la
 * pantalla no salta cuando llega la de verdad.
 */
export default function ReplayLoading() {
  return (
    <div className="bg-[#0B0B0F] text-[#F5F5F7] md:grid md:h-[calc(100dvh-4rem)] md:grid-cols-[1fr_340px] md:grid-rows-[auto_1fr_auto]">
      <span role="status" className="sr-only">
        Cargando el replay…
      </span>

      <div className="md:col-span-2">
        <div className="flex items-end justify-between border-b border-[#26262E] px-4 py-3">
          <div>
            <Skeleton className="mb-3 h-3 w-24 bg-[#1B1B22]" />
            <Skeleton className="h-7 w-32 bg-[#1B1B22]" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <Skeleton className="h-3 w-10 bg-[#1B1B22]" />
            <Skeleton className="h-5 w-20 bg-[#1B1B22]" />
          </div>
        </div>
        <Skeleton className="aspect-[1/0.77] w-full rounded-none bg-[#151519] md:hidden" />
      </div>

      <Skeleton className="hidden rounded-none bg-[#151519] md:col-start-1 md:row-start-2 md:block" />
      <div className="hidden gap-2 border-t border-[#26262E] px-4 py-3 md:col-start-1 md:row-start-3 md:grid">
        <Skeleton className="h-2 w-full bg-[#1B1B22]" />
        <div className="grid grid-cols-[44px_200px_44px_56px] gap-2.5">
          <Skeleton className="h-11 bg-[#1B1B22]" />
          <Skeleton className="h-12 bg-[#1B1B22]" />
          <Skeleton className="h-11 bg-[#1B1B22]" />
          <Skeleton className="h-11 bg-[#1B1B22]" />
        </div>
      </div>

      <div className="md:col-start-2 md:row-span-2 md:row-start-2 md:border-l md:border-[#26262E]">
        <ul className="m-0 list-none p-0">
          {Array.from({ length: 10 }).map((_, i) => (
            <li
              key={i}
              className="grid min-h-[44px] grid-cols-[30px_4px_1fr_auto] items-center gap-x-2.5 border-b border-[#16161C] px-4 md:min-h-[30px] md:border-b-0"
            >
              <Skeleton className="h-3 w-5 bg-[#1B1B22]" />
              <Skeleton className="h-6 w-1 bg-[#1B1B22]" />
              <Skeleton className="h-3 w-28 bg-[#1B1B22]" />
              <Skeleton className="h-3 w-12 bg-[#1B1B22]" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
