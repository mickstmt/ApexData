'use client';

import { useEffect, useId, useOptimistic, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, ChevronDown, Loader2 } from 'lucide-react';

interface SeasonSelectorProps {
  currentSeason: number;
  availableSeasons?: number[];
}

export function SeasonSelector({ currentSeason, availableSeasons }: SeasonSelectorProps) {
  // `useId` en vez de un id escrito a mano: durante una transición pueden
  // convivir un instante dos copias de la página en el DOM, y dos elementos con
  // el mismo id rompen la asociación con su etiqueta —además de ser HTML
  // inválido—. Salió en el CI, donde la ventana es más ancha que en local.
  const id = useId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // El valor mostrado es el elegido, no el que ha confirmado el servidor. Sin
  // esto el <select> vuelve visiblemente a la temporada anterior mientras la
  // consulta viaja a Supabase, que es lo contrario de lo que espera quien
  // acaba de elegir. Se descarta solo cuando llega el nuevo `currentSeason`.
  const [optimisticSeason, setOptimisticSeason] = useOptimistic(currentSeason);

  // Aquí no cambia la página, cambia su contenido: se vela lo que va a ser
  // sustituido, y el propio selector queda por encima del velo. La marca va en
  // el documento porque el contenido a velar (`main`) es un ancestro, no un
  // hijo, de este componente. La regla vive en globals.css.
  useEffect(() => {
    if (!isPending) return;

    document.documentElement.dataset.seasonPending = 'true';
    return () => {
      delete document.documentElement.dataset.seasonPending;
    };
  }, [isPending]);

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
    <div className="relative z-30 flex items-center gap-3">
      <Calendar className="h-5 w-5 text-muted-foreground" aria-hidden />
      <label htmlFor={id} className="sr-only">
        Temporada
      </label>

      {/* El indicador ocupa el hueco de la flecha del desplegable, que ya
          estaba reservado: así nada se recoloca al empezar a cargar. */}
      <div className="relative">
        <select
          id={id}
          value={optimisticSeason}
          disabled={isPending}
          aria-busy={isPending}
          onChange={(e) => handleSeasonChange(Number(e.target.value))}
          className="w-full appearance-none rounded-lg border border-input bg-background py-2 pl-4 pr-10 text-base font-medium ring-offset-background transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait md:text-sm"
        >
          {seasons.map((season) => (
            <option key={season} value={season}>
              Temporada {season}
            </option>
          ))}
        </select>

        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
          )}
        </span>
      </div>

      {/* Lo que antes era un texto visible que empujaba el layout: sigue
          anunciándose, pero solo a quien no puede ver girar el indicador. */}
      <span role="status" aria-live="polite" className="sr-only">
        {isPending ? `Cargando la temporada ${optimisticSeason}…` : ''}
      </span>
    </div>
  );
}
