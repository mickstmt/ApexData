'use client';

/**
 * Lap Times Table Component
 * Displays lap times for a session
 */

import { fastestLapIndex } from '@/lib/lap-times';
import { compoundColor } from '@/lib/team-colors';
import { PriorityRows } from '@/components/ui/PriorityRows';
import type { LapData } from '@/types';

interface LapTimesTableProps {
  laps: LapData[];
  showDriver?: boolean;
}

export function LapTimesTable({ laps, showDriver = true }: LapTimesTableProps) {
  // Broadcast convention: purple for the quickest lap shown, green for a
  // personal best. The table used to paint personal bests purple, which reads
  // as "session best" to anyone who follows the sport.
  const fastest = fastestLapIndex(laps.map((lap) => lap.LapTime));

  if (!laps.length) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border bg-card p-8">
        <p className="text-muted-foreground">No hay datos de vueltas para esta sesión.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {/* Ocho columnas no caben en un teléfono: en móvil se ve la vuelta, el
          piloto y el tiempo, y los parciales quedan a un toque. */}
      <PriorityRows
        rows={laps}
        getKey={(lap) => `${lap.Driver}-${lap.LapNumber}`}
        label={(lap) => `la vuelta ${lap.LapNumber} de ${lap.Driver}`}
        lead={(lap) => {
          const posicion = laps.indexOf(lap);
          return (
            <>
              <span className="w-8 shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
                {lap.LapNumber}
              </span>
              {showDriver && (
                <span className="min-w-0 flex-1 truncate font-semibold">{lap.Driver}</span>
              )}
              <span
                className={`shrink-0 font-mono text-sm tabular-nums ${
                  posicion === fastest
                    ? 'font-semibold text-fastest'
                    : lap.IsPersonalBest
                      ? 'font-semibold text-personal-best'
                      : 'text-foreground'
                }`}
              >
                {lap.LapTime || '—'}
              </span>
            </>
          );
        }}
        detail={(lap) => [
          { label: 'Sector 1', value: <span className="font-mono">{lap.Sector1Time || '—'}</span> },
          { label: 'Sector 2', value: <span className="font-mono">{lap.Sector2Time || '—'}</span> },
          { label: 'Sector 3', value: <span className="font-mono">{lap.Sector3Time || '—'}</span> },
          {
            label: 'Neumático',
            value: lap.Compound ? (
              <span className="inline-flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full ring-1 ring-border"
                  style={{ backgroundColor: compoundColor(lap.Compound) }}
                  aria-hidden
                />
                {lap.Compound}
                {lap.TyreLife ? ` · L${lap.TyreLife}` : ''}
              </span>
            ) : (
              '—'
            ),
          },
          {
            label: 'Vel. máx.',
            value: lap.SpeedST ? (
              <span className="font-mono">{`${lap.SpeedST.toFixed(0)} km/h`}</span>
            ) : (
              '—'
            ),
          },
          ...(lap.Team ? [{ label: 'Equipo', value: lap.Team }] : []),
        ]}
      />

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
                <caption className="sr-only">Vueltas más rápidas de la sesión, con sus parciales y el neumático</caption>
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
                Vuelta
              </th>
              {showDriver && (
                <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Piloto
                </th>
              )}
              <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
                Tiempo
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
                S1
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
                S2
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
                S3
              </th>
              <th scope="col" className="px-4 py-3 text-center font-medium text-muted-foreground">
                Neumático
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium text-muted-foreground">
                Vel. máx.
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {laps.map((lap, index) => (
              <tr
                key={`${lap.Driver}-${lap.LapNumber}-${index}`}
                className={`transition-colors hover:bg-muted/50 ${
                  index === fastest
                    ? 'bg-fastest/10'
                    : lap.IsPersonalBest
                      ? 'bg-personal-best/10'
                      : ''
                }`}
              >
                <td className="px-4 py-3 font-mono text-foreground">
                  {lap.LapNumber}
                </td>
                {showDriver && (
                  <td className="px-4 py-3">
                    <span className="font-semibold text-foreground">
                      {lap.Driver}
                    </span>
                    {lap.Team && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {lap.Team}
                      </span>
                    )}
                  </td>
                )}
                <td className="px-4 py-3">
                  <span
                    className={`font-mono ${
                      index === fastest
                        ? 'font-semibold text-fastest'
                        : lap.IsPersonalBest
                          ? 'font-semibold text-personal-best'
                          : 'text-foreground'
                    }`}
                  >
                    {lap.LapTime || '-'}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-muted-foreground">
                  {lap.Sector1Time || '-'}
                </td>
                <td className="px-4 py-3 font-mono text-muted-foreground">
                  {lap.Sector2Time || '-'}
                </td>
                <td className="px-4 py-3 font-mono text-muted-foreground">
                  {lap.Sector3Time || '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  {lap.Compound && (
                    <div className="flex items-center justify-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full ring-1 ring-border"
                        style={{ backgroundColor: compoundColor(lap.Compound) }}
                      />
                      <span className="sr-only">{lap.Compound}</span>
                      <span className="text-xs text-muted-foreground">
                        {lap.TyreLife ? `L${lap.TyreLife}` : ''}
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                  {lap.SpeedST ? `${lap.SpeedST.toFixed(0)} km/h` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
