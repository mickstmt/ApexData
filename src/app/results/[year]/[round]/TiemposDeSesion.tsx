'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Timer, TriangleAlert } from 'lucide-react';
import { compoundColor, teamColor, teamIdFromName } from '@/lib/team-colors';
import type { FastestLapsResponse, SessionClassificationResponse } from '@/types';

/**
 * Los tiempos de las sesiones que Jolpica no publica.
 *
 * Las pestañas de prácticas y de clasificación al sprint enseñaban un cartel
 * diciendo que esos datos no existen por esta vía. Existir existen: están en
 * FastF1, y los dos endpoints que hacen falta llevan tiempo respondiendo en
 * producción. Lo que faltaba era cablearlos.
 *
 * Se piden **desde el navegador**, igual que la parrilla reconstruida: la
 * primera consulta de una sesión hace que el servicio descargue la sesión
 * entera y puede tardar cerca de un minuto. Bloquear la página con eso sería
 * cambiar un cartel honesto por una espera en blanco.
 */

function usePeticion<T>(url: string) {
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let vigente = true;

    // Se anula al desmontar: quien cambia de pestaña mientras el servicio
    // descarga la sesión no debería ver aparecer los tiempos encima de otra
    // cosa.
    fetch(url)
      .then((respuesta) => (respuesta.ok ? respuesta.json() : Promise.reject(respuesta.status)))
      .then((recibido: T) => {
        if (vigente) setDatos(recibido);
      })
      .catch(() => {
        if (vigente) setFallo(true);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [url]);

  return { datos, cargando, fallo };
}

function Cargando({ que }: { que: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-10 text-center">
      <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      <p className="text-sm font-semibold">Pidiendo {que}…</p>
      <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">
        La primera consulta de una sesión descarga su cronometría entera y puede tardar cerca de un
        minuto. Las siguientes son inmediatas.
      </p>
    </div>
  );
}

/**
 * El fallo, dicho sin adivinar la causa.
 *
 * Puede ser que la cronometría todavía no tenga la sesión, que el servicio esté
 * ocupado o que la sesión no exista. Distinguirlo desde aquí exigiría fiarse del
 * código de estado, y el 404 honesto aún no está desplegado en producción: hasta
 * entonces una sesión sin correr llega como 500. Así que se trata cualquier
 * error igual y se ofrece la salida que sí funciona.
 */
function Fallo({ que }: { que: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-10 text-center">
      <TriangleAlert className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden />
      <h3 className="mb-2 text-xl font-bold">No se han podido traer {que}</h3>
      <p className="mx-auto max-w-prose text-sm text-muted-foreground">
        La cronometría puede no tener todavía esta sesión, o estar tardando más de la cuenta.
        Vuelve a intentarlo en un rato, o míralo en{' '}
        <Link href="/analysis" className="text-primary hover:underline">
          análisis
        </Link>
        , que trabaja contra la misma fuente.
      </p>
    </div>
  );
}

function Vacio({ que }: { que: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-10 text-center">
      <Timer className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden />
      <h3 className="mb-2 text-xl font-bold">Todavía no hay {que}</h3>
      <p className="mx-auto max-w-prose text-sm text-muted-foreground">
        La sesión está en la cronometría, pero sin vueltas cronometradas. Suele pasar mientras la
        sesión aún está rodando.
      </p>
    </div>
  );
}

/** El tramo en el que cada piloto se quedó: SQ1, SQ2 o SQ3. */
function Tramo({ segmento }: { segmento: number | null }) {
  if (!segmento) return null;

  return (
    <span className="shrink-0 rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-muted-foreground">
      SQ{segmento}
    </span>
  );
}

/**
 * La clasificación al sprint, puesto a puesto.
 *
 * El orden no es «por tiempo»: quien cae en SQ1 va detrás de quien llegó a SQ2
 * aunque su vuelta fuera mejor. Eso lo resuelve el servicio, y por eso cada fila
 * enseña su tramo — sin él, un tiempo mayor arriba parece un error.
 */
export function ClasificacionSprint({ year, round }: { year: number; round: number }) {
  const { datos, cargando, fallo } = usePeticion<SessionClassificationResponse>(
    `/api/clasificacion/${year}/${round}/SQ`
  );

  if (cargando) return <Cargando que="la clasificación al sprint" />;
  if (fallo || !datos) return <Fallo que="los tiempos de la clasificación al sprint" />;
  if (datos.classification.length === 0) return <Vacio que="tiempos de esta sesión" />;

  return (
    <div>
      <div className="mb-4 rounded-lg border border-border bg-card p-4">
        <h3 className="mb-1 text-lg font-bold">Clasificación al sprint</h3>
        <p className="max-w-prose text-sm text-muted-foreground">
          Reconstruida desde la cronometría de FastF1, que es la única fuente que la publica.{' '}
          <b>Es provisional</b>: las sanciones de parrilla se aplican después y no aparecen aquí.
        </p>
      </div>

      <ol className="grid gap-2 sm:grid-cols-2">
        {datos.classification.map((fila) => {
          const equipoId = teamIdFromName(fila.team);

          return (
            <li
              key={fila.driver}
              className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-card py-2.5 pl-4 pr-4"
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-1"
                style={{
                  backgroundColor: equipoId
                    ? teamColor(equipoId).color
                    : 'hsl(var(--muted-foreground))',
                }}
              />
              <span className="w-6 shrink-0 text-center font-mono text-sm font-semibold tabular-nums text-muted-foreground">
                {fila.position}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{fila.driverName}</span>
                {fila.team && (
                  <span className="block truncate text-xs text-muted-foreground">{fila.team}</span>
                )}
              </span>
              <Tramo segmento={fila.segment} />
              <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                {fila.time ?? '—'}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * La vuelta más rápida de cada piloto en una práctica.
 *
 * Con su advertencia, que no es un formalismo: una práctica **no es un
 * resultado**. Cada equipo rueda su programa con la gasolina que le conviene, y
 * el orden de aquí no anticipa el de la clasificación por sí solo.
 */
export function VueltasDePractica({
  year,
  round,
  sesion,
  nombre,
}: {
  year: number;
  round: number;
  sesion: 'FP1' | 'FP2' | 'FP3';
  nombre: string;
}) {
  const { datos, cargando, fallo } = usePeticion<FastestLapsResponse>(
    `/api/laps/${year}/${round}/${sesion}/fastest?limit=20`
  );

  if (cargando) return <Cargando que={`los tiempos de ${nombre}`} />;
  if (fallo || !datos) return <Fallo que={`los tiempos de ${nombre}`} />;
  if (datos.fastest_laps.length === 0) return <Vacio que="vueltas cronometradas" />;

  return (
    <div>
      <div className="mb-4 rounded-lg border border-border bg-card p-4">
        <h3 className="mb-1 text-lg font-bold">{nombre}: la vuelta más rápida de cada piloto</h3>
        <p className="max-w-prose text-sm text-muted-foreground">
          Una práctica no es un resultado: cada equipo rueda su propio programa y con la gasolina que
          le conviene, así que este orden no dice quién es más rápido de verdad.
        </p>
      </div>

      <ol className="grid gap-2 sm:grid-cols-2">
        {datos.fastest_laps.map((vuelta, indice) => {
          // `Team` puede no venir: FastF1 lo deja vacío en alguna vuelta suelta.
          const equipoId = teamIdFromName(vuelta.Team);

          return (
            <li
              key={`${vuelta.Driver}-${vuelta.LapNumber}`}
              className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-card py-2.5 pl-4 pr-4"
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-1"
                style={{
                  backgroundColor: equipoId
                    ? teamColor(equipoId).color
                    : 'hsl(var(--muted-foreground))',
                }}
              />
              <span className="w-6 shrink-0 text-center font-mono text-sm font-semibold tabular-nums text-muted-foreground">
                {indice + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{vuelta.Driver}</span>
                {vuelta.Team && (
                  <span className="block truncate text-xs text-muted-foreground">{vuelta.Team}</span>
                )}
              </span>
              {vuelta.Compound && (
                // El punto relleno con su anillo, como en la tabla de vueltas:
                // los colores oficiales valen para un bloque, no para texto.
                <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 rounded-full ring-1 ring-border"
                    style={{ backgroundColor: compoundColor(vuelta.Compound) }}
                  />
                  {vuelta.Compound}
                </span>
              )}
              <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                {vuelta.LapTime ?? '—'}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
