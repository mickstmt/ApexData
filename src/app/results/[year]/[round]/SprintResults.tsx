'use client';

import Link from 'next/link';
import { teamColor } from '@/lib/team-colors';
import { PriorityRows } from '@/components/ui/PriorityRows';
import { PodioDeCarrera, type PuestoDelPodio } from '@/components/results/PodioDeCarrera';
import { FichaDePiloto } from '@/components/results/FichaDePiloto';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { clasesDeDorsal } from '@/lib/medallas';
import { estadoEnPalabras, resumirEstado } from '@/lib/estado-resultado';
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

  /**
   * Los tres del podio del sprint, en orden de llegada.
   *
   * Un sprint tiene podio de verdad: se sube al cajón y puntúan los tres. Por
   * eso lleva el mismo bloque que la carrera y no la tarjeta de ganador suelta
   * que había antes.
   */
  const podio: PuestoDelPodio[] = resultados
    .filter((fila) => fila.position !== null && fila.position <= 3)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((fila) => ({
      driverId: fila.driver.driverId,
      givenName: fila.driver.givenName,
      familyName: fila.driver.familyName,
      imageUrl: fila.driver.imageUrl,
      nationality: fila.driver.nationality,
      constructorId: fila.team.constructorId,
      teamName: fila.team.name,
      points: fila.points,
    }));

  return (
    <>
      <PodioDeCarrera puestos={podio} titulo="Podio del sprint" />

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <PriorityRows
          rows={resultados}
          getKey={(fila) => fila.id}
          label={(fila) => `${fila.driver.givenName} ${fila.driver.familyName}`}
          lead={(fila) => (
            <>
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-bold ${clasesDeDorsal(fila.position)}`}
              >
                {fila.position ?? fila.positionText}
              </span>
              <span
                aria-hidden
                className="h-8 w-1 shrink-0 rounded-sm"
                style={{ backgroundColor: teamColor(fila.team.constructorId).color }}
              />
              <CountryFlag nationality={fila.driver.nationality} size={16} />
              <span className="min-w-0 flex-1 truncate font-semibold">
                {fila.driver.familyName}
              </span>
              <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
                {/* Solo los ocho primeros puntúan en un sprint: el resto no
                    lleva cero, lleva raya, que no es lo mismo. */}
                {fila.points > 0 ? `+${fila.points}` : '—'}
              </span>
            </>
          )}
          encabezado={(fila) => (
            <FichaDePiloto
              driverId={fila.driver.driverId}
              givenName={fila.driver.givenName}
              familyName={fila.driver.familyName}
              imageUrl={fila.driver.imageUrl}
              nationality={fila.driver.nationality}
              constructorId={fila.team.constructorId}
              teamName={fila.team.name}
            />
          )}
          detail={(fila) => {
            const estado = resumirEstado(fila.time, fila.status);
            return [
              { label: 'Salió', value: <span className="tabular-nums">{fila.grid}.º</span> },
              { label: 'Vueltas', value: <span className="font-mono">{fila.laps}</span> },
              {
                label: 'Tiempo',
                value: (
                  <span className="font-mono">
                    <span aria-hidden>{estado.corto}</span>
                    <span className="sr-only">{estadoEnPalabras(estado)}</span>
                  </span>
                ),
              },
              ...(estado.motivo ? [{ label: 'Motivo', value: estado.motivo }] : []),
            ];
          }}
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
                    {/* En escritorio hay sitio de sobra, así que aquí va el
                        motivo completo en vez de la sigla. */}
                    {resumirEstado(fila.time, fila.status).motivo ??
                      resumirEstado(fila.time, fila.status).corto}
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
