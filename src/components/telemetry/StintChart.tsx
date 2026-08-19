'use client';

import { compoundColor } from '@/lib/team-colors';
import type { DriverStints } from '@/types';

/**
 * Estrategia de neumáticos: un tramo por juego montado, piloto a piloto.
 *
 * El otro pendiente del Sprint 4. Se lee en horizontal —cuándo paró cada uno—
 * y en vertical —quién hizo algo distinto—, así que los pilotos van en el
 * orden en que terminaron y las barras comparten escala de vueltas.
 *
 * El compuesto no se codifica solo con color: cada tramo lleva su inicial
 * dentro cuando cabe, y su nombre completo en el título y en la tabla
 * equivalente. Un usuario daltónico no puede distinguir el blando del duro por
 * el color, que es exactamente lo que la auditoría señaló en la tabla de
 * vueltas.
 */

/** Blanco o negro según el compuesto, para que la inicial se lea encima. */
const TINTA_CLARA = new Set(['SOFT', 'WET', 'INTERMEDIATE', 'UNKNOWN']);

export function StintChart({
  drivers,
  totalLaps,
}: {
  drivers: DriverStints[];
  totalLaps: number;
}) {
  if (drivers.length === 0 || totalLaps <= 0) return null;

  const compuestos = [...new Set(drivers.flatMap((d) => d.stints.map((s) => s.compound)))];

  return (
    <figure className="m-0">
      <div className="flex flex-col gap-1.5">
        {drivers.map((driver) => (
          <div key={driver.driver} className="flex items-center gap-3">
            <span className="w-10 shrink-0 font-mono text-xs font-semibold tabular-nums">
              {driver.driver}
            </span>

            <div className="flex h-7 flex-1 gap-px overflow-hidden rounded-md" aria-hidden>
              {driver.stints.map((stint) => {
                const fondo = compoundColor(stint.compound);
                const claro = TINTA_CLARA.has(stint.compound.toUpperCase());

                return (
                  <div
                    key={`${stint.stint}-${stint.start_lap}`}
                    title={`${stint.compound} · vueltas ${stint.start_lap}-${stint.end_lap}`}
                    style={{
                      backgroundColor: fondo,
                      width: `${(stint.laps / totalLaps) * 100}%`,
                      color: claro ? '#FFFFFF' : '#15151A',
                    }}
                    className="flex items-center justify-center text-[10px] font-bold"
                  >
                    {stint.laps >= 4 ? stint.compound.charAt(0) : ''}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <figcaption className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span>Vueltas 1–{totalLaps}</span>
        {compuestos.map((compuesto) => (
          <span key={compuesto} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-sm ring-1 ring-border"
              style={{ backgroundColor: compoundColor(compuesto) }}
            />
            {compuesto}
          </span>
        ))}
      </figcaption>

      {/* Lo que el gráfico dice, para quien no puede verlo. */}
      <table className="sr-only">
        <caption>Estrategia de neumáticos por piloto</caption>
        <thead>
          <tr>
            <th scope="col">Piloto</th>
            <th scope="col">Tramos</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((driver) => (
            <tr key={driver.driver}>
              <th scope="row">{driver.driver}</th>
              <td>
                {driver.stints
                  .map(
                    (stint) =>
                      `${stint.compound} de la vuelta ${stint.start_lap} a la ${stint.end_lap}`
                  )
                  .join('; ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
