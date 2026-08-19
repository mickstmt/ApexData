'use client';

import Link from 'next/link';
import { PriorityRows } from '@/components/ui/PriorityRows';

/**
 * La tabla de la temporada, en móvil.
 *
 * La página es de servidor y `PriorityRows` recibe funciones para pintar cada
 * fila, que no cruzan esa frontera; por eso aquí hay un componente de cliente
 * al que solo llegan datos planos. La tabla de escritorio se queda en la
 * página, que es donde tiene sentido leerla.
 */

export interface SeasonResultRow {
  id: string;
  round: number;
  year: number;
  raceName: string;
  country: string;
  flag: string;
  /** Ya formateada en el servidor, para que el día no baile con la zona. */
  fecha: string;
  winnerName: string;
  winnerId: string;
  winnerCode: string;
  teamName: string;
  teamId: string;
  laps: number;
  time: string;
}

export function SeasonResultRows({ rows }: { rows: SeasonResultRow[] }) {
  return (
    <PriorityRows
      rows={rows}
      getKey={(row) => row.id}
      label={(row) => `el ${row.raceName}`}
      lead={(row) => (
        <>
          <span aria-hidden className="shrink-0 text-xl">
            {row.flag}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{row.country}</span>
            <span className="block truncate text-xs text-muted-foreground">{row.winnerName}</span>
          </span>
          <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
            {row.fecha}
          </span>
        </>
      )}
      detail={(row) => [
        {
          label: 'Gran Premio',
          value: (
            <Link href={`/results/${row.year}/${row.round}`} className="hover:text-primary">
              {row.raceName}
            </Link>
          ),
        },
        {
          label: 'Ganador',
          value: (
            <Link href={`/drivers/${row.winnerId}`} className="hover:text-primary">
              {row.winnerName}
            </Link>
          ),
        },
        {
          label: 'Equipo',
          value: (
            <Link href={`/constructors/${row.teamId}`} className="hover:text-primary">
              {row.teamName}
            </Link>
          ),
        },
        { label: 'Vueltas', value: <span className="font-mono">{row.laps}</span> },
        { label: 'Tiempo', value: <span className="font-mono">{row.time}</span> },
      ]}
    />
  );
}
