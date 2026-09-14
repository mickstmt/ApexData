'use client';

import { teamColor } from '@/lib/team-colors';
import { PriorityRows } from '@/components/ui/PriorityRows';
import { PodioDeCarrera, type PuestoDelPodio } from '@/components/results/PodioDeCarrera';
import { FichaDePiloto } from '@/components/results/FichaDePiloto';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { clasesDeDorsal } from '@/lib/medallas';
import { estadoEnPalabras, resumirEstado } from '@/lib/estado-resultado';
import { FilaDeTiempos, TarjetaDeTabla } from '@/components/tabla/TablaDeTiempos';
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

        {/* La misma tarjeta y la misma fila que la carrera y la
            clasificacion (punto 46). */}
        <div className="hidden md:block">
          <TarjetaDeTabla
            titulo="Resultado del sprint"
            columnas={['Salió', 'Tiempo', 'Pts']}
            rejilla="26px 3px 34px minmax(0,1fr) 62px 104px 42px"
          >
            {resultados.map((fila) => {
              const estado = resumirEstado(fila.time, fila.status);

              return (
                <FilaDeTiempos
                  key={fila.id}
                  posicion={fila.position ?? fila.positionText}
                  dorsal={fila.driver.permanentNumber}
                  equipo={fila.team.name}
                  equipoId={fila.team.constructorId}
                  equipoNacion={fila.team.nationality}
                  piloto={{
                    nombre: `${fila.driver.givenName} ${fila.driver.familyName}`,
                    foto: fila.driver.imageUrl,
                    nacion: fila.driver.nationality,
                    href: `/drivers/${fila.driver.driverId}`,
                  }}
                  celdas={[
                    <span key="salio" className="text-muted-foreground">
                      {fila.grid}.º
                    </span>,
                    fila.time ? (
                      <span key="tiempo">{fila.time}</span>
                    ) : (
                      <span
                        key="tiempo"
                        title={estado.motivo ?? undefined}
                        className="inline-block rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground"
                      >
                        {estado.corto}
                        <span className="sr-only"> — {estadoEnPalabras(estado)}</span>
                      </span>
                    ),
                  ]}
                  // Solo los ocho primeros puntuan en un sprint: el resto no
                  // lleva cero, lleva raya, que no es lo mismo.
                  valor={
                    <span className={fila.points > 0 ? 'text-primary' : 'text-muted-foreground'}>
                      {fila.points > 0 ? fila.points : '—'}
                    </span>
                  }
                  valorEtiqueta="pts"
                  destacada={fila.position !== null && fila.position <= 3}
                  apagada={estado.clase === 'dnf' || estado.clase === 'dns' || estado.clase === 'dsq'}
                />
              );
            })}
          </TarjetaDeTabla>
        </div>
      </div>
    </>
  );
}
