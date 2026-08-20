'use client';

import { Check, Palette } from 'lucide-react';
import { useFavorites } from '@/contexts/FavoritesContext';
import { teamColor } from '@/lib/team-colors';

export interface EquipoElegible {
  constructorId: string;
  name: string;
}

/**
 * Elegir el equipo que tiñe la app.
 *
 * Es una elección aparte de la lista de equipos favoritos —seguir a cinco es
 * razonable, pero el color de la interfaz solo puede ser de uno—, y se aplica
 * al instante: `TeamAccent` reescribe los tokens del documento en cuanto
 * cambia, así que no hace falta recargar para verlo.
 */
export function EquipoAcento({ equipos }: { equipos: EquipoElegible[] }) {
  const { equipoAcento, elegirEquipoAcento } = useFavorites();

  return (
    <section className="mb-10 rounded-xl border border-border bg-card p-5">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
        <Palette className="h-5 w-5 text-primary" aria-hidden />
        Tu equipo
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Tiñe el acento de ApexData con sus colores. El tono se ajusta a cada tema para que los
        textos y los botones sigan leyéndose.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={equipoAcento === null}
          onClick={() => elegirEquipoAcento(null)}
          className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            equipoAcento === null
              ? 'border-primary bg-primary/10 text-foreground'
              : 'border-input hover:border-foreground/40'
          }`}
        >
          {equipoAcento === null && <Check className="h-4 w-4 text-primary" aria-hidden />}
          Sin equipo
        </button>

        {equipos.map((equipo) => {
          const elegido = equipoAcento === equipo.constructorId;
          const { color } = teamColor(equipo.constructorId);

          return (
            <button
              key={equipo.constructorId}
              type="button"
              aria-pressed={elegido}
              onClick={() => elegirEquipoAcento(equipo.constructorId)}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                elegido
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-input hover:border-foreground/40'
              }`}
            >
              {/* El cuadrito lleva el color de marca sin derivar: es un bloque
                  sólido, no tinta, así que aquí sí es el color de verdad. */}
              <span
                aria-hidden
                className="h-3.5 w-3.5 shrink-0 rounded-sm border border-black/10 dark:border-white/15"
                style={{ backgroundColor: color }}
              />
              {equipo.name}
              {elegido && <Check className="h-4 w-4 text-primary" aria-hidden />}
            </button>
          );
        })}
      </div>
    </section>
  );
}
