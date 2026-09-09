import { prisma } from '@/lib/prisma';
import { clasificacionDeSesion } from '@/services/openf1/client';
import type { SesionOpenF1 } from '@/services/openf1/tipos';
import { fastf1Client } from '@/services';
import { isTelemetryServiceConfigured } from '@/services/fastf1/client';
import type { SessionType } from '@/types';

import { granPremioDe } from './gran-premio';
import { SESIONES } from './redaccion';

/**
 * Quién publica antes: OpenF1 o FastF1.
 *
 * ## Qué se está midiendo y por qué
 *
 * Hoy la app usa tres fuentes con papeles distintos: Jolpica llena la base,
 * FastF1 da la telemetría y OpenF1 dispara los avisos. Ese reparto se decidió
 * con una medición —Jolpica tardó entre seis y ocho horas con el GP de Italia—
 * pero entre las otras dos nunca se comparó nada: se eligió OpenF1 para los
 * avisos porque es una petición JSON y FastF1 exige cargar la sesión entera.
 *
 * La pregunta que queda es de tiempo, no de comodidad: **¿cuál tiene los datos
 * antes?** Si una gana siempre por un margen claro, quizá sobre la otra para
 * este trabajo.
 *
 * Se responde sondeando las dos cada cinco minutos desde que baja la bandera y
 * anotando el primer instante en que cada una contesta con algo. Un fin de
 * semana da entre cinco y siete medidas por fuente.
 *
 * ## Esto se borra
 *
 * Es un experimento con fecha de caducidad, no una pieza del producto. Cuando
 * haya un fin de semana medido y se decida, este archivo y su tabla se van
 * juntos.
 *
 * ## Lo que cuesta, y por qué es aceptable
 *
 * Sondear OpenF1 es una petición JSON. Sondear FastF1 obliga al servicio a
 * cargar la sesión entera —36 segundos medidos la primera vez— y solo carga una
 * cada vez, así que un sondeo puede hacer esperar a quien esté mirando
 * telemetría en ese momento.
 *
 * Tres cosas lo acotan: solo se sondea dentro de una ventana corta tras la
 * sesión, se deja de sondear en cuanto la fuente contesta, y el propio servicio
 * recuerda cinco minutos que una sesión no tiene datos — o sea que insistir más
 * a menudo no aportaría nada. Aun así se puede apagar entero con
 * `CARRERA_DE_FUENTES=0`.
 */

/** Cuánto se sigue preguntando tras el final de una sesión. */
export const VENTANA_HORAS = 8;

/** Las dos que compiten. */
export const FUENTES = ['openf1', 'fastf1'] as const;
export type Fuente = (typeof FUENTES)[number];

/** ¿Cae esta sesión dentro de la ventana en la que se sondea? */
export function dentroDeLaVentana(finISO: string, ahora: Date): boolean {
  const fin = new Date(finISO).getTime();
  if (!Number.isFinite(fin)) return false;

  const minutos = (ahora.getTime() - fin) / 60_000;

  // Desde el segundo cero: parte de la gracia es saber si alguna publica
  // ANTES de los treinta minutos que OpenF1 declara.
  return minutos >= 0 && minutos <= VENTANA_HORAS * 60;
}

/** El resultado de preguntarle a una fuente. */
interface Respuesta {
  hayDatos: boolean;
  nota: string;
}

async function sondearOpenF1(sesion: SesionOpenF1): Promise<Respuesta> {
  try {
    const filas = await clasificacionDeSesion(sesion.session_key);
    const conPuesto = filas.filter((f) => f.puesto != null).length;

    return conPuesto > 0
      ? { hayDatos: true, nota: `${conPuesto} puestos` }
      : { hayDatos: false, nota: `sin puestos (${filas.length} filas)` };
  } catch (error) {
    return { hayDatos: false, nota: error instanceof Error ? error.message.slice(0, 120) : 'error' };
  }
}

/**
 * FastF1 se pregunta por la ronda, no por la clave de OpenF1.
 *
 * Son dos mundos con numeración propia: OpenF1 tiene su `session_key` y FastF1
 * habla de año, ronda y tipo de sesión. La ronda sale de nuestra base, que es
 * justo lo que ya hace el avisador para saber de qué Gran Premio habla.
 */
async function sondearFastF1(sesion: SesionOpenF1): Promise<Respuesta> {
  if (!isTelemetryServiceConfigured) {
    return { hayDatos: false, nota: 'servicio no configurado' };
  }

  const carrera = await granPremioDe(sesion);
  if (!carrera) return { hayDatos: false, nota: 'sin ronda en la base' };

  const tipo = SESIONES[sesion.session_name]?.codigo as SessionType | undefined;
  if (!tipo) return { hayDatos: false, nota: 'sesión que no medimos' };

  try {
    const info = await fastf1Client.getSessionInfo(carrera.year, String(carrera.round), tipo);
    const filas = info.results?.length ?? 0;

    return filas > 0
      ? { hayDatos: true, nota: `${filas} filas` }
      : { hayDatos: false, nota: 'cargó sin resultados' };
  } catch (error) {
    // El 404 del servicio es la respuesta esperada mientras no hay datos: dice
    // «todavía no», no «algo se rompió».
    return { hayDatos: false, nota: error instanceof Error ? error.message.slice(0, 120) : 'error' };
  }
}

const SONDEOS: Record<Fuente, (s: SesionOpenF1) => Promise<Respuesta>> = {
  openf1: sondearOpenF1,
  fastf1: sondearFastF1,
};

export interface InformeDeCarrera {
  /** Las que se resolvieron en esta vuelta, ya con su marca de tiempo. */
  nuevas: string[];
  /** Cuántos sondeos se hicieron. */
  sondeos: number;
}

/** Sondea las fuentes de las sesiones que están dentro de la ventana. */
export async function sondearFuentes(opciones?: {
  ahora?: Date;
  sesiones?: SesionOpenF1[];
}): Promise<InformeDeCarrera> {
  const ahora = opciones?.ahora ?? new Date();
  const informe: InformeDeCarrera = { nuevas: [], sondeos: 0 };

  if (process.env.CARRERA_DE_FUENTES === '0') return informe;

  const candidatas = (opciones?.sesiones ?? []).filter(
    (s) => SESIONES[s.session_name] !== undefined && dentroDeLaVentana(s.date_end, ahora)
  );

  if (!candidatas.length) return informe;

  const yaAnotadas = await prisma.sourceProbe.findMany({
    where: { sessionKey: { in: candidatas.map((s) => s.session_key) } },
  });

  for (const sesion of candidatas) {
    for (const fuente of FUENTES) {
      const fila = yaAnotadas.find(
        (f) => f.sessionKey === sesion.session_key && f.source === fuente
      );

      // Resuelta: ya se sabe cuándo tuvo datos y no hay nada más que preguntar.
      if (fila?.firstSeenAt) continue;

      const { hayDatos, nota } = await SONDEOS[fuente](sesion);
      informe.sondeos++;

      const datos = {
        sessionName: sesion.session_name,
        year: sesion.year,
        endedAt: new Date(sesion.date_end),
        probes: (fila?.probes ?? 0) + 1,
        lastNote: nota,
        ...(hayDatos ? { firstSeenAt: new Date() } : {}),
      };

      await prisma.sourceProbe.upsert({
        where: { sessionKey_source: { sessionKey: sesion.session_key, source: fuente } },
        create: { sessionKey: sesion.session_key, source: fuente, ...datos },
        update: datos,
      });

      if (hayDatos) {
        const minutos = Math.round(
          (Date.now() - new Date(sesion.date_end).getTime()) / 60_000
        );
        informe.nuevas.push(
          `${fuente} tuvo ${sesion.session_name} de ${sesion.location} a los ${minutos} min (${nota})`
        );
      }
    }
  }

  return informe;
}
