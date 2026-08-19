'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * Patrón priority+ para las tablas anchas, en móvil.
 *
 * Una tabla de siete columnas mide unos 900 px de ancho intrínseco: en un
 * teléfono de 390 hay que arrastrar la fila entera y la posición —lo primero
 * que se busca— se pierde por la izquierda. Aquí, en móvil, cada fila enseña
 * lo esencial y guarda el resto detrás de un toque; a partir de `md` la tabla
 * de siempre, que ahí cabe de sobra.
 *
 * Dos cosas que conviene no romper al usarlo:
 *
 * - **En `lead` no van enlaces ni botones**: es el contenido de un `<button>`,
 *   y anidar controles produce HTML inválido y paradas de teclado duplicadas
 *   —justo el defecto que la auditoría señaló en las tarjetas—. Los enlaces
 *   viven en el detalle.
 * - El detalle es una lista de definiciones: cada dato lleva su etiqueta al
 *   lado, que es lo que sustituye a la cabecera de columna cuando esta ya no
 *   está a la vista.
 */

export interface DetailEntry {
  label: string;
  value: React.ReactNode;
}

export function PriorityRows<T>({
  rows,
  getKey,
  lead,
  detail,
  label,
}: {
  rows: T[];
  getKey: (row: T) => string;
  lead: (row: T) => React.ReactNode;
  detail: (row: T) => DetailEntry[];
  /** Cómo se nombra una fila para quien no ve la pantalla: «Ver más de …». */
  label: (row: T) => string;
}) {
  const [abierta, setAbierta] = useState<string | null>(null);

  return (
    <div className="divide-y divide-border md:hidden">
      {rows.map((row) => {
        const key = getKey(row);
        const expandida = abierta === key;

        return (
          <div key={key}>
            <button
              type="button"
              aria-expanded={expandida}
              aria-controls={`detalle-${key}`}
              onClick={() => setAbierta(expandida ? null : key)}
              className="flex min-h-[56px] w-full items-center gap-3 px-4 py-2.5 text-left ring-offset-background transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span className="flex min-w-0 flex-1 items-center gap-3">{lead(row)}</span>
              <span className="sr-only">{expandida ? 'Ocultar' : 'Ver más de'} {label(row)}</span>
              <ChevronRight
                aria-hidden
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${
                  expandida ? 'rotate-90' : ''
                }`}
              />
            </button>

            {expandida && (
              <dl
                id={`detalle-${key}`}
                className="grid grid-cols-2 gap-x-4 gap-y-2 bg-muted/30 px-4 pb-4 pt-1 text-sm"
              >
                {detail(row).map((entry) => (
                  <div key={entry.label} className="flex items-baseline justify-between gap-2">
                    <dt className="text-muted-foreground">{entry.label}</dt>
                    <dd className="m-0 min-w-0 truncate text-right font-medium">{entry.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        );
      })}
    </div>
  );
}
