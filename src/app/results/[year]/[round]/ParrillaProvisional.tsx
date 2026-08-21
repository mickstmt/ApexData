'use client';

import { useEffect, useState } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import { teamColor, teamIdFromName } from '@/lib/team-colors';
import type { SessionClassificationResponse, SessionType } from '@/types';

/**
 * La parrilla de salida antes de que haya resultados.
 *
 * Hay dos maneras de saberla y las dos acaban en esta misma lista. La de la
 * carrera sale de la clasificación que ya está en la base. La del sprint no
 * puede salir de ahí: la ordena la **clasificación al sprint**, y esa sesión
 * Jolpica no la publica nunca —Ergast tampoco la tuvo—, así que la pestaña se
 * quedaba diciendo solo «el sprint aún no se ha corrido» un sábado por la
 * mañana, con la parrilla decidida desde el viernes.
 *
 * Esa segunda se reconstruye desde los tiempos de FastF1, que los tiene en
 * cuanto la sesión rueda. Se pide desde el navegador y no en el servidor a
 * propósito: la primera consulta de una sesión descarga la sesión entera y
 * puede tardar un minuto, y eso no puede bloquear la página.
 */

export interface PuestoDeParrilla {
  clave: string;
  puesto: number;
  nombre: string;
  equipo: string | null;
  equipoId: string | null;
  tiempo: string | null;
}

const AVISO_SANCIONES =
  'Puede cambiar: las sanciones de parrilla se aplican después y no aparecen aquí hasta que hay resultados.';

export function Parrilla({
  puestos,
  origen,
}: {
  puestos: PuestoDeParrilla[];
  /** De dónde sale el orden, dicho en una línea. */
  origen: string;
}) {
  if (puestos.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="mb-1 flex items-center gap-2 text-lg font-bold">
        <Flag className="h-5 w-5 text-primary" aria-hidden />
        Parrilla de salida
      </h3>
      <p className="mb-3 text-sm text-muted-foreground">
        {origen} <b>{AVISO_SANCIONES}</b>
      </p>

      <ol className="grid gap-2 sm:grid-cols-2">
        {puestos.map((puesto) => (
          <li
            key={puesto.clave}
            className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-card py-2.5 pl-4 pr-4"
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-1"
              style={{
                backgroundColor: puesto.equipoId
                  ? teamColor(puesto.equipoId).color
                  : 'hsl(var(--muted-foreground))',
              }}
            />
            <span className="w-6 shrink-0 text-center font-mono text-sm font-semibold tabular-nums text-muted-foreground">
              {puesto.puesto}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{puesto.nombre}</span>
              {puesto.equipo && (
                <span className="block truncate text-xs text-muted-foreground">{puesto.equipo}</span>
              )}
            </span>
            <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
              {puesto.tiempo ?? '—'}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Qué sesión ordena cada parrilla, y cómo se llama al contarlo. */
const ORIGEN: Record<string, string> = {
  Q: 'Según el orden de la clasificación.',
  SQ: 'Según los tiempos de la clasificación al sprint, reconstruidos desde la cronometría.',
};

export function ParrillaDesdeTiempos({
  year,
  round,
  sesion,
}: {
  year: number;
  round: number;
  sesion: Extract<SessionType, 'Q' | 'SQ'>;
}) {
  const [clasificacion, setClasificacion] = useState<SessionClassificationResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let vigente = true;

    // Se anula al desmontar: quien cambia de pestaña mientras se descarga la
    // sesión no debería ver aparecer la parrilla encima de otra cosa.
    fetch(`/api/clasificacion/${year}/${round}/${sesion}`)
      .then((respuesta) => (respuesta.ok ? respuesta.json() : Promise.reject(respuesta.status)))
      .then((datos: SessionClassificationResponse) => {
        if (vigente) setClasificacion(datos);
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
  }, [year, round, sesion]);

  if (cargando) {
    return (
      <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Reconstruyendo la parrilla desde los tiempos…
      </p>
    );
  }

  // Un fallo aquí no es una pantalla de error: la sesión puede no estar todavía
  // en la cronometría, y el aviso de arriba ya explica qué falta.
  if (fallo || !clasificacion || clasificacion.classification.length === 0) return null;

  const puestos = clasificacion.classification.map((fila) => ({
    clave: fila.driver,
    puesto: fila.position,
    nombre: fila.driverName,
    equipo: fila.team,
    equipoId: fila.team ? teamIdFromName(fila.team) : null,
    tiempo: fila.time,
  }));

  return <Parrilla puestos={puestos} origen={ORIGEN[sesion]} />;
}
