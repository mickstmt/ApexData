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

/**
 * ## Lo que falló en el primer intento, y por qué
 *
 * Las dos primeras medidas —P1 y P2 de Madrid, 11 de septiembre— dieron OpenF1
 * 31 min y FastF1 32 min, con **un solo sondeo cada una**. Un solo sondeo
 * significa que el primero ya encontró datos: lo único medido fue «las dos
 * tenían datos antes del minuto 31», que no es la pregunta. El minuto de
 * diferencia era el orden de consulta dentro del mismo barrido.
 *
 * Tres cosas lo hacían imposible de responder, y las tres están arregladas:
 *
 * 1. **Se preguntaba tarde.** El primer sondeo cayó en el minuto 31. Ahora se
 *    anota `firstProbeAt`, así que si vuelve a pasar se ve en la tabla en vez
 *    de deducirse.
 * 2. **Se preguntaba poco.** Una vez cada cinco minutos no separa a dos fuentes
 *    que publican con segundos de diferencia. Ahora: **cada minuto la primera
 *    hora**, que es donde está la respuesta, y cada cinco después.
 * 3. **FastF1 competía con una piedra atada.** El servicio recuerda cinco
 *    minutos que una sesión no tiene datos, así que su «no» podía ser de hace
 *    cinco minutos: un sesgo sistemático EN SU CONTRA de hasta 5 min, justo del
 *    tamaño de lo que queremos medir. El sondeo ahora pide `sondeo=1`, que se
 *    salta ese recuerdo.
 */

/**
 * Cada cuánto se pregunta durante la primera hora, en minutos.
 *
 * Distinto por fuente porque cuestan cosas distintas. Preguntar a OpenF1 es una
 * petición JSON. Preguntar a FastF1 obliga al servicio a intentar la descarga
 * entera y **cuesta doce segundos medidos** —el código decía 3,5 y no era
 * verdad—, y mientras tanto ocupa el único hueco de carga: quien esté pidiendo
 * telemetría en ese momento espera detrás. Cada minuto serían doce segundos de
 * cada sesenta.
 *
 * Dos minutos deja la ocupación en el diez por ciento y sigue separando a dos
 * fuentes que publiquen con minutos de diferencia. Si publican con menos de dos
 * minutos de diferencia, el veredicto lo dice en vez de inventar un ganador.
 */
export const CADENCIA_DENSA: Record<Fuente, number> = { openf1: 1, fastf1: 2 };

/** Hasta qué minuto se usa la cadencia densa; después, cada cinco. */
export const MINUTOS_DENSOS = 60;

/** Cada cuánto se insiste una vez pasada la primera hora. */
export const ESPACIADO_MINUTOS = 5;

/**
 * ¿Toca preguntarle a esta fuente ahora?
 *
 * Denso donde está la respuesta y espaciado después. Sin esto, el reloj de un
 * minuto seguiría insistiendo ocho horas a una fuente que no va a contestar.
 */
export function tocaSondear(
  fuente: Fuente,
  minutosDesdeElFin: number,
  ultimoSondeo: Date | null,
  ahora: Date
): boolean {
  if (!ultimoSondeo) return true;

  const desdeElUltimo = (ahora.getTime() - ultimoSondeo.getTime()) / 60_000;
  const cada =
    minutosDesdeElFin <= MINUTOS_DENSOS ? CADENCIA_DENSA[fuente] : ESPACIADO_MINUTOS;

  // El margen de diez segundos evita que un reloj de 60 s que llega con 59,8 s
  // se salte una ronda entera por redondeo.
  return desdeElUltimo >= cada - 1 / 6;
}

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
    // `sondeo` para que el servicio no conteste con lo que recordaba: medir el
    // instante en que aparecen los datos con cinco minutos de error es no medir.
    const info = await fastf1Client.getSessionInfo(carrera.year, String(carrera.round), tipo, {
      sondeo: true,
    });
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

/**
 * Cuándo empezó el último sondeo de cada `sesión:fuente`.
 *
 * En memoria y no en la base a propósito: la fila guarda `updatedAt`, pero se
 * escribe al TERMINAR, y usarla para espaciar sumaba la duración del sondeo al
 * intervalo. Esto guarda el instante de empezar. Si el proceso reinicia se
 * pierde y, como mucho, se hace un sondeo de más — que es el error barato.
 */
const ultimoSondeo = new Map<string, Date>();

/**
 * Una pasada cada vez.
 *
 * Hay tres que llaman aquí —el reloj de un minuto, el barrido de cinco y el
 * script de avisos—, y un sondeo de FastF1 puede tardar más de un minuto si el
 * servicio está ocupado. Sin esta guarda, dos pasadas a la vez comparten la
 * misma foto de `yaAnotadas`: `tocaSondear` no puede filtrarlas, los `probes`
 * pierden cuentas, y las dos peticiones repetidas se encolan en el único hueco
 * de carga del servicio hasta que una vence por tiempo y **anota un «no hay
 * datos» falso justo en el minuto que el experimento existe para cazar**.
 */
let sondeando = false;

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

  // Si ya hay una pasada en marcha, esta se va: la siguiente vuelta del reloj
  // llega en un minuto y no hay nada que recuperar.
  if (sondeando) return informe;
  sondeando = true;

  try {
    return await pasada(candidatas, ahora, informe);
  } finally {
    sondeando = false;
  }
}

/** Una pasada del sondeo. Separada solo para que la guarda tenga un `finally`. */
async function pasada(
  candidatas: SesionOpenF1[],
  ahora: Date,
  informe: InformeDeCarrera
): Promise<InformeDeCarrera> {
  const yaAnotadas = await prisma.sourceProbe.findMany({
    where: { sessionKey: { in: candidatas.map((s) => s.session_key) } },
  });

  for (const sesion of candidatas) {
    const fin = new Date(sesion.date_end);
    const minutosDesdeElFin = (ahora.getTime() - fin.getTime()) / 60_000;

    for (const fuente of FUENTES) {
      const fila = yaAnotadas.find(
        (f) => f.sessionKey === sesion.session_key && f.source === fuente
      );

      // Resuelta: ya se sabe cuándo tuvo datos y no hay nada más que preguntar.
      if (fila?.firstSeenAt) continue;

      const clave = `${sesion.session_key}:${fuente}`;

      // El reloj rápido pasa cada minuto, pero a una fuente que lleva horas sin
      // contestar no se le pregunta sesenta veces por hora.
      //
      // Se mide desde que EMPEZÓ el sondeo anterior, no desde que acabó. Con
      // `updatedAt` —que se escribe al terminar— el intervalo real era el
      // declarado más lo que tardase la fuente: a FastF1, doce segundos de
      // más cada vuelta. La cadencia decía dos minutos y eran más.
      if (!tocaSondear(fuente, minutosDesdeElFin, ultimoSondeo.get(clave) ?? null, ahora)) continue;

      // **La hora se sella ANTES de preguntar.**
      //
      // Sellarla después le cargaba a cada fuente la duración de su propio
      // sondeo como si fuera latencia suya: 0,3 s a OpenF1 y once segundos a
      // FastF1, medidos. Eso es exactamente el sesgo por construcción que este
      // experimento venía a quitar, con la piedra cambiada de sitio.
      //
      // Los datos ya estaban ahí cuando empezamos a preguntar; lo que tarda la
      // pregunta es coste nuestro, no de la fuente.
      const empezado = new Date();
      ultimoSondeo.set(clave, empezado);

      const { hayDatos, nota } = await SONDEOS[fuente](sesion);
      informe.sondeos++;

      const datos = {
        sessionName: sesion.session_name,
        year: sesion.year,
        endedAt: fin,
        probes: (fila?.probes ?? 0) + 1,
        lastNote: nota,
        ...(hayDatos ? { firstSeenAt: empezado } : {}),
      };

      await prisma.sourceProbe.upsert({
        where: { sessionKey_source: { sessionKey: sesion.session_key, source: fuente } },
        // `firstProbeAt` solo al crear la fila: es «cuándo preguntamos por
        // primera vez». En el `update` escribiría la hora de hoy sobre filas
        // viejas —las de Madrid, justo las que motivaron la columna— y el
        // diagnóstico mentiría en vez de delatar.
        create: { sessionKey: sesion.session_key, source: fuente, firstProbeAt: empezado, ...datos },
        update: datos,
      });

      if (hayDatos) {
        // En segundos: la diferencia entre las dos puede ser de menos de un
        // minuto, y redondear a minutos la borraría.
        const segundos = Math.round((empezado.getTime() - fin.getTime()) / 1000);
        informe.nuevas.push(
          `${fuente} tuvo ${sesion.session_name} de ${sesion.location} a los ` +
            `${Math.floor(segundos / 60)}m ${segundos % 60}s (${nota})`
        );
      }
    }
  }

  return informe;
}

/**
 * El calendario que vio el último barrido.
 *
 * El reloj rápido pregunta cada minuto, y pedirle el calendario a OpenF1 cada
 * minuto serían mil cuatrocientas peticiones al día para releer unas fechas que
 * se sabían con semanas de antelación. El barrido de cinco minutos ya lo pide
 * para otra cosa; el sondeo se sirve de esa copia, cinco minutos vieja como
 * mucho.
 */
let recordadas: SesionOpenF1[] = [];

export function recordarSesiones(sesiones: SesionOpenF1[]): void {
  recordadas = sesiones;
}

/**
 * Un sondeo con el calendario recordado. Es lo que llama el reloj de un minuto.
 *
 * Devuelve un informe vacío mientras no haya pasado el primer barrido: sin
 * calendario no hay nada que sondear, y pedirlo aquí anularía el ahorro.
 */
export async function sondearConLoRecordado(ahora?: Date): Promise<InformeDeCarrera> {
  if (!recordadas.length) return { nuevas: [], sondeos: 0 };
  return sondearFuentes({ ahora, sesiones: recordadas });
}
