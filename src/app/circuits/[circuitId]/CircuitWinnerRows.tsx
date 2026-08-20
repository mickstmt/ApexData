'use client';

import Link from 'next/link';
import { PriorityRows } from '@/components/ui/PriorityRows';
import { teamInk } from '@/lib/team-colors';
import { añosRepetidos, contarSalida, type VictoriaEnCircuito } from '@/lib/circuit-stats';

/**
 * El historial de ganadores, en móvil.
 *
 * Como en el resto de tablas anchas: la página es de servidor y `PriorityRows`
 * recibe funciones para pintar cada fila, que no cruzan esa frontera. Delante
 * va lo que se busca —el año y quién ganó— y los enlaces quedan en el detalle,
 * porque el resumen es el contenido de un botón.
 */

export function CircuitWinnerRows({ victorias }: { victorias: VictoriaEnCircuito[] }) {
  const repetidos = añosRepetidos(victorias);

  return (
    <PriorityRows
      rows={victorias}
      // Año Y ronda: cuatro circuitos han acogido dos carreras el mismo año
      // —Red Bull Ring en 2020 y 2021, Silverstone y Baréin en 2020—, y con el
      // año a secas las dos filas compartían clave e identificador, así que
      // desplegar una abría las dos. Es el mismo defecto de los `id` repetidos
      // que ya destapó el CI.
      getKey={(v) => `${v.year}-${v.round}`}
      label={(v) => `la victoria de ${v.raceName} ${v.year}`}
      lead={(v) => (
        <>
          <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">{v.year}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{v.driver}</span>
            <span className="team-ink block truncate text-xs" style={teamInk(v.teamId)}>
              {v.team}
              {repetidos.has(v.year) && (
                <span className="text-muted-foreground"> · {v.raceName}</span>
              )}
            </span>
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">{contarSalida(v.grid)}</span>
        </>
      )}
      detail={(v) => [
        {
          label: 'Carrera',
          value: (
            <Link href={`/results/${v.year}/${v.round}`} className="hover:text-primary">
              {v.raceName}
            </Link>
          ),
        },
        {
          label: 'Ganador',
          value: (
            <Link href={`/drivers/${v.driverId}`} className="hover:text-primary">
              {v.driver}
            </Link>
          ),
        },
        {
          label: 'Equipo',
          value: (
            <Link href={`/constructors/${v.teamId}`} className="hover:text-primary">
              {v.team}
            </Link>
          ),
        },
        {
          label: 'Salió',
          value: <span className="tabular-nums">{v.grid === 0 ? 'pit lane' : `${v.grid}.º`}</span>,
        },
        { label: 'Tiempo', value: <span className="font-mono">{v.time ?? '—'}</span> },
      ]}
    />
  );
}
