'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Timer, TriangleAlert } from 'lucide-react';
import { compoundColor, teamIdFromName } from '@/lib/team-colors';
import { intervalosAlAnterior, mejorVueltaPorPiloto } from '@/lib/lap-times';
import { FilaDeTiempos, TarjetaDeTabla } from '@/components/tabla/TablaDeTiempos';
import { fichaDesconocida, type DirectorioDePilotos } from '@/lib/parrilla';
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
 * ocupado o que la sesión no exista. El servicio distingue el primer caso —una
 * sesión sin correr responde 404, comprobado en producción—, pero aquí no se
 * aprovecha a propósito: esta pestaña solo se pide cuando la sesión **ya rodó**,
 * así que un 404 aquí significa «la cronometría aún no la tiene», que es lo
 * mismo que dice cualquier otro fallo. Separar los mensajes sería inventar una
 * diferencia que quien mira no puede usar.
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
/**
 * Quien es este codigo de tres letras.
 *
 * Es el cruce que hacia falta para que estas dos tablas dejaran de ser pobres:
 * FastF1 manda «VER» y «Red Bull Racing», y de ahi salen nombre completo, foto,
 * dorsal, bandera del piloto y bandera de la escuderia. Si no esta en el
 * directorio —un piloto de una sola sesion de viernes— se queda con sus tres
 * letras, que es mejor que ponerle la ficha de otro.
 */
function quienEs(directorio: DirectorioDePilotos, codigo: string, equipo: string | null | undefined) {
  const ficha = directorio[codigo?.toUpperCase() ?? ''];
  if (ficha) return ficha;

  // Sin ficha, al menos el equipo se reconoce por su nombre: `teamIdFromName`
  // es lo que ya daba color a la barra antes de que existiera el directorio.
  const equipoId = teamIdFromName(equipo);
  return { ...fichaDesconocida(codigo, equipo), equipoId: equipoId ?? '' };
}

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
export function ClasificacionSprint({
  year,
  round,
  directorio,
}: {
  year: number;
  round: number;
  directorio: DirectorioDePilotos;
}) {
  const { datos, cargando, fallo } = usePeticion<SessionClassificationResponse>(
    `/api/clasificacion/${year}/${round}/SQ`
  );

  if (cargando) return <Cargando que="la clasificación al sprint" />;
  if (fallo || !datos) return <Fallo que="los tiempos de la clasificación al sprint" />;
  if (datos.classification.length === 0) return <Vacio que="tiempos de esta sesión" />;

  const intervalos = intervalosAlAnterior(datos.classification);

  return (
    <TarjetaDeTabla
      titulo="Clasificación al sprint"
      contexto="Reconstruida desde FastF1"
      nota="Es provisional: las sanciones de parrilla se aplican después y no aparecen aquí."
      columnas={['Tramo', 'Dif.', 'Vuelta']}
      rejilla="26px 3px 34px minmax(0,1fr) 64px 76px 84px"
    >
      {datos.classification.map((fila, indice) => {
        const piloto = quienEs(directorio, fila.driver, fila.team);

        return (
          <FilaDeTiempos
            key={fila.driver}
            posicion={fila.position}
            dorsal={piloto.dorsal}
            equipo={piloto.equipo}
            equipoId={piloto.equipoId || null}
            equipoNacion={piloto.equipoNacion}
            piloto={{
              nombre: piloto.nombre,
              foto: piloto.foto,
              nacion: piloto.nacion,
              href: piloto.driverId ? `/drivers/${piloto.driverId}` : undefined,
            }}
            celdas={[
              <Tramo key="tramo" segmento={fila.segment} />,
              intervalos[indice] ? (
                <span key="dif" className="text-muted-foreground">
                  <span className="sr-only">Diferencia con el de delante: </span>
                  {intervalos[indice]}
                </span>
              ) : (
                <span key="dif" className="text-muted-foreground">
                  —
                </span>
              ),
            ]}
            valor={fila.time ?? '—'}
            destacada={fila.position === 1}
          />
        );
      })}
    </TarjetaDeTabla>
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
  directorio,
}: {
  year: number;
  round: number;
  sesion: 'FP1' | 'FP2' | 'FP3';
  nombre: string;
  directorio: DirectorioDePilotos;
}) {
  /*
   * Se piden **todas** las vueltas, no veinte.
   *
   * `/fastest?limit=20` devuelve las veinte vueltas más rápidas de la sesión,
   * que no es lo mismo que la vuelta rápida de cada piloto: en la PL1 de
   * Zandvoort 2026 esas veinte eran de solo diez pilotos, con Piastri y Leclerc
   * repetidos tres veces cada uno. Con el límite alto llega la sesión entera
   * —601 vueltas, 150 KB medidos— y `mejorVueltaPorPiloto` se queda con una por
   * piloto, que son los 22 que se quieren ver.
   */
  const { datos, cargando, fallo } = usePeticion<FastestLapsResponse>(
    `/api/laps/${year}/${round}/${sesion}/fastest?limit=2000`
  );

  if (cargando) return <Cargando que={`los tiempos de ${nombre}`} />;
  if (fallo || !datos) return <Fallo que={`los tiempos de ${nombre}`} />;

  const porPiloto = mejorVueltaPorPiloto(datos.fastest_laps);
  if (porPiloto.length === 0) return <Vacio que="vueltas cronometradas" />;

  return (
    <TarjetaDeTabla
      titulo={nombre}
      contexto="Mejor vuelta de cada piloto"
      nota="Una práctica no es un resultado: cada equipo rueda su propio programa y con la gasolina que le conviene, así que este orden no dice quién es más rápido de verdad."
      columnas={['Neum.', 'Vuelta']}
      rejilla="26px 3px 34px minmax(0,1fr) 92px 92px"
    >
      {porPiloto.map((vuelta, indice) => {
        const piloto = quienEs(directorio, vuelta.Driver, vuelta.Team);

        return (
          <FilaDeTiempos
            key={`${vuelta.Driver}-${vuelta.LapNumber}`}
            posicion={indice + 1}
            dorsal={piloto.dorsal}
            equipo={piloto.equipo}
            equipoId={piloto.equipoId || null}
            equipoNacion={piloto.equipoNacion}
            piloto={{
              nombre: piloto.nombre,
              foto: piloto.foto,
              nacion: piloto.nacion,
              href: piloto.driverId ? `/drivers/${piloto.driverId}` : undefined,
            }}
            celdas={[
              vuelta.Compound ? (
                // El punto relleno con su anillo, como en la tabla de vueltas:
                // los colores oficiales valen para un bloque, no para texto.
                <span key="goma" className="inline-flex items-center justify-end gap-1.5 text-[10.5px] uppercase text-muted-foreground">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-border"
                    style={{ backgroundColor: compoundColor(vuelta.Compound) }}
                  />
                  {vuelta.Compound}
                </span>
              ) : (
                <span key="goma" className="text-muted-foreground">
                  —
                </span>
              ),
            ]}
            valor={vuelta.LapTime ?? '—'}
            extra={vuelta.Compound ? [vuelta.Compound] : undefined}
            destacada={indice === 0}
          />
        );
      })}
    </TarjetaDeTabla>
  );
}
