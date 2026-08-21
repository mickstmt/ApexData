'use client';

import { Trophy } from 'lucide-react';
import Link from 'next/link';
import { teamColor } from '@/lib/team-colors';
import { PriorityRows } from '@/components/ui/PriorityRows';
import type { Driver, SprintResult, Team } from '@prisma/client';

/**
 * El resultado del sprint.
 *
 * Estaba guardado desde el primer sembrado —528 filas, 22 por carrera al
 * sprint— y la pestaña enseñaba «En desarrollo» encima. La página ni siquiera
 * los pedía.
 *
 * Se enseña en su propia tabla y no en la de carrera porque un sprint no
 * reparte los mismos puntos —solo los ocho primeros suman— y mezclarlos daría
 * a entender que sí.
 */

export type SprintConPiloto = SprintResult & { driver: Driver; team: Team };

export function SprintResults({ resultados }: { resultados: SprintConPiloto[] }) {
  if (resultados.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        No hay resultados del sprint para esta carrera.
      </div>
    );
  }

  const ganador = resultados[0];

  return (
    <>
      <div className="mb-8 rounded-lg border border-primary bg-primary/5 p-6">
        <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Trophy className="h-4 w-4 text-primary" aria-hidden />
          <span className="font-semibold">GANADOR DEL SPRINT</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="truncate text-2xl font-bold">
              {ganador.driver.givenName} {ganador.driver.familyName}
            </div>
            <div className="mt-1 truncate text-sm text-muted-foreground">{ganador.team.name}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-mono text-3xl font-bold text-primary">{ganador.points}</div>
            <div className="text-sm text-muted-foreground">puntos</div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <PriorityRows
          rows={resultados}
          getKey={(fila) => fila.id}
          label={(fila) => `${fila.driver.givenName} ${fila.driver.familyName}`}
          lead={(fila) => (
            <>
              <span className="w-6 shrink-0 text-center font-mono text-sm font-semibold tabular-nums text-muted-foreground">
                {fila.position ?? fila.positionText}
              </span>
              <span
                aria-hidden
                className="h-6 w-1 shrink-0 rounded-sm"
                style={{ backgroundColor: teamColor(fila.team.constructorId).color }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  {fila.driver.givenName} {fila.driver.familyName}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {fila.team.name}
                </span>
              </span>
              <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
                {fila.points > 0 ? `+${fila.points}` : '—'}
              </span>
            </>
          )}
          detail={(fila) => [
            {
              label: 'Piloto',
              value: (
                <Link href={`/drivers/${fila.driver.driverId}`} className="hover:text-primary">
                  {fila.driver.givenName} {fila.driver.familyName}
                </Link>
              ),
            },
            {
              label: 'Equipo',
              value: (
                <Link
                  href={`/constructors/${fila.team.constructorId}`}
                  className="hover:text-primary"
                >
                  {fila.team.name}
                </Link>
              ),
            },
            { label: 'Salió', value: <span className="tabular-nums">{fila.grid}.º</span> },
            { label: 'Vueltas', value: <span className="font-mono">{fila.laps}</span> },
            { label: 'Tiempo', value: <span className="font-mono">{fila.time ?? fila.status}</span> },
          ]}
        />

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <caption className="sr-only">Resultado del sprint, con puntos y tiempos</caption>
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th scope="col" className="p-4 text-left text-sm font-semibold">
                  POS
                </th>
                <th scope="col" className="p-4 text-left text-sm font-semibold">
                  PILOTO
                </th>
                <th scope="col" className="p-4 text-left text-sm font-semibold">
                  EQUIPO
                </th>
                <th scope="col" className="p-4 text-right text-sm font-semibold">
                  SALIÓ
                </th>
                <th scope="col" className="p-4 text-right text-sm font-semibold">
                  TIEMPO
                </th>
                <th scope="col" className="p-4 text-right text-sm font-semibold">
                  PTS
                </th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((fila) => (
                <tr
                  key={fila.id}
                  className="border-b border-border transition-colors last:border-0 hover:bg-muted/30"
                >
                  <th
                    scope="row"
                    className="p-4 text-left font-mono font-semibold tabular-nums"
                  >
                    {fila.position ?? fila.positionText}
                  </th>
                  <td className="p-4">
                    <Link href={`/drivers/${fila.driver.driverId}`} className="hover:text-primary">
                      {fila.driver.givenName} {fila.driver.familyName}
                    </Link>
                  </td>
                  <td className="p-4">
                    <Link
                      href={`/constructors/${fila.team.constructorId}`}
                      className="hover:text-primary"
                    >
                      {fila.team.name}
                    </Link>
                  </td>
                  <td className="p-4 text-right tabular-nums">{fila.grid}.º</td>
                  <td className="p-4 text-right font-mono text-sm tabular-nums text-muted-foreground">
                    {fila.time ?? fila.status}
                  </td>
                  <td className="p-4 text-right font-mono font-semibold tabular-nums">
                    {/* Solo los ocho primeros puntúan en un sprint: el resto no
                        lleva cero, lleva raya, que no es lo mismo. */}
                    {fila.points > 0 ? fila.points : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
