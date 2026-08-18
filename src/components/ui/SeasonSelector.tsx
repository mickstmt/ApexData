'use client';

import { useOptimistic, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, Loader2 } from 'lucide-react';

interface SeasonSelectorProps {
  currentSeason: number;
  availableSeasons?: number[];
}

export function SeasonSelector({ currentSeason, availableSeasons }: SeasonSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // El valor mostrado es el elegido, no el que ha confirmado el servidor. Sin
  // esto el <select> vuelve visiblemente a la temporada anterior mientras la
  // consulta viaja a Supabase, que es lo contrario de lo que espera quien
  // acaba de elegir. Se descarta solo cuando llega el nuevo `currentSeason`.
  const [optimisticSeason, setOptimisticSeason] = useOptimistic(currentSeason);

  // Generate seasons from 1950 to current year + 1 (for upcoming season)
  const currentYear = new Date().getFullYear();
  const seasons = availableSeasons || Array.from(
    { length: currentYear - 1950 + 2 },
    (_, i) => currentYear + 1 - i
  );

  const handleSeasonChange = (season: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('season', season.toString());

    // La navegación es solo de query dentro del mismo segmento, así que no es
    // fiable que se vuelva a mostrar el `loading.tsx` de la ruta: el estado de
    // carga tiene que salir de aquí.
    startTransition(() => {
      setOptimisticSeason(season);
      router.push(`?${params.toString()}`);
    });
  };

  return (
    <div className="flex items-center gap-3">
      <Calendar className="h-5 w-5 text-muted-foreground" aria-hidden />
      <label htmlFor="season-selector" className="sr-only">
        Temporada
      </label>
      <select
        id="season-selector"
        value={optimisticSeason}
        disabled={isPending}
        aria-busy={isPending}
        onChange={(e) => handleSeasonChange(Number(e.target.value))}
        className="rounded-lg border border-border bg-background px-4 py-2 text-base font-medium ring-offset-background transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 md:text-sm"
      >
        {seasons.map((season) => (
          <option key={season} value={season}>
            Temporada {season}
          </option>
        ))}
      </select>
      {isPending && (
        <span role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Cargando temporada…
        </span>
      )}
    </div>
  );
}