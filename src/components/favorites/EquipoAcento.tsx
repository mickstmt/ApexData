'use client';

import { Check, Palette } from 'lucide-react';
import { useFavorites } from '@/contexts/FavoritesContext';
import { ChipSeleccionable } from '@/components/ui/Chip';
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
        <ChipSeleccionable
          elegido={equipoAcento === null}
          onClick={() => elegirEquipoAcento(null)}
        >
          {equipoAcento === null && <Check className="h-4 w-4 text-primary" aria-hidden />}
          Sin equipo
        </ChipSeleccionable>

        {equipos.map((equipo) => {
          const elegido = equipoAcento === equipo.constructorId;
          const { color } = teamColor(equipo.constructorId);

          return (
            <ChipSeleccionable
              key={equipo.constructorId}
              elegido={elegido}
              onClick={() => elegirEquipoAcento(equipo.constructorId)}
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
            </ChipSeleccionable>
          );
        })}
      </div>
    </section>
  );
}
