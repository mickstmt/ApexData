import { prisma } from '@/lib/prisma';
import { avisarACadaUno, type DestinoDeAviso } from '@/lib/push';
import { clasificacionDeSesion, sesionesDeTemporada } from '@/services/openf1/client';
import type { FilaDeSesion, SesionOpenF1 } from '@/services/openf1/tipos';

import { estaEnPunto } from './ventana';

export { ESPERA_MINUTOS, NADA_ANTES_DE, VENTANA_HORAS, estaEnPunto } from './ventana';

import {
  SESIONES,
  quiereLaSesion,
  redactarAviso,
  type Favorito,
  type Sesion,
} from './redaccion';

/**
 * Avisar de cada sesión que termina, en cuanto hay datos.
 *
 * ## De dónde sale el retraso que esto arregla
 *
 * El aviso del GP de Italia 2026 llegó a las 18:45 hora de Lima para una carrera
 * terminada antes de las 11:00. No fue culpa del código: las ejecuciones del
 * cron de aquella tarde corrieron enteras y no encontraron resultados que
 * contar. Jolpica tardó entre seis y ocho horas en publicarlos.
 *
 * OpenF1 los tiene media hora después de la bandera, y de las siete sesiones del
 * fin de semana, no de tres.
 *
 * ## Por qué se puede ejecutar todas las veces que haga falta
 *
 * Casi siempre no hace nada: mira qué sesiones acaban de terminar y, si ya se
 * avisó de ellas, se va. La marca vive en `notified_sessions` con la clave de
 * OpenF1, así que dos vueltas simultáneas, un reinicio a mitad o un despliegue
 * en mal momento no mandan el mismo aviso dos veces.
 */

export interface SesionAvisada {
  sessionKey: number;
  sesion: string;
  granPremio: string;
  cuerpoGenerico: string;
  enviados: number;
  saltados: number;
}

export interface Informe {
  /** Las que se avisaron ahora. */
  avisadas: SesionAvisada[];
  /** Terminadas y sin avisar, pero OpenF1 aún no publica su clasificación. */
  esperando: string[];
  /** Nada que hacer: ni una sesión reciente. */
  tranquilo: boolean;
}

/**
 * El Gran Premio al que pertenece una sesión, en la base de datos.
 *
 * Se busca por cercanía de fechas y no por identificador: OpenF1 numera sus
 * reuniones con una clave propia (`meeting_key`) que no existe en nuestra base,
 * y añadirla obligaría a resembrar diecisiete temporadas para ganar nada. Un
 * fin de semana cabe en cuatro días, así que la carrera más cercana a la sesión
 * es la suya sin ambigüedad posible.
 */
async function granPremioDe(sesion: SesionOpenF1) {
  const inicio = new Date(sesion.date_start);
  const margen = 5 * 24 * 60 * 60 * 1000;

  const candidatas = await prisma.race.findMany({
    where: {
      year: sesion.year,
      date: {
        gte: new Date(inicio.getTime() - margen),
        lte: new Date(inicio.getTime() + margen),
      },
    },
    select: { year: true, round: true, raceName: true, date: true },
  });

  if (!candidatas.length) return null;

  return candidatas.reduce((mejor, actual) =>
    Math.abs(actual.date.getTime() - inicio.getTime()) <
    Math.abs(mejor.date.getTime() - inicio.getTime())
      ? actual
      : mejor
  );
}

/**
 * Traduce los favoritos guardados a lo que entiende la redacción.
 *
 * En la base se guarda el `driverId` —«antonelli»— porque es lo único estable;
 * OpenF1 habla de códigos de tres letras. La traducción se hace aquí, con una
 * sola consulta para todas las suscripciones en vez de una por persona.
 */
async function traductorDeFavoritos(): Promise<Map<string, Favorito>> {
  const pilotos = await prisma.driver.findMany({
    where: { code: { not: null } },
    select: { driverId: true, code: true, familyName: true },
  });

  return new Map(
    pilotos.map((p) => [p.driverId, { codigo: p.code as string, nombre: p.familyName }])
  );
}

/** Los favoritos de una suscripción, ya traducidos y sin los que no se pueden. */
function favoritosDe(destino: DestinoDeAviso, traductor: Map<string, Favorito>): Favorito[] {
  return (destino.favoriteDrivers ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .map((id) => traductor.get(id))
    .filter((f): f is Favorito => Boolean(f));
}

/**
 * Mira qué sesiones acaban de terminar y avisa de las que falten.
 *
 * `ensayo` lo hace todo menos enviar y menos marcar: sirve para ver qué haría
 * sin despertar a nadie, que es la única forma de probar esto fuera de un fin
 * de semana de carrera.
 */
export async function avisarDeSesionesTerminadas(opciones?: {
  ahora?: Date;
  ensayo?: boolean;
}): Promise<Informe> {
  const ahora = opciones?.ahora ?? new Date();
  const ensayo = opciones?.ensayo ?? false;

  const informe: Informe = { avisadas: [], esperando: [], tranquilo: true };

  const todas = await sesionesDeTemporada(ahora.getFullYear());

  const candidatas = todas.filter(
    (s) => SESIONES[s.session_name] !== undefined && estaEnPunto(s, ahora)
  );

  if (!candidatas.length) return informe;

  informe.tranquilo = false;

  const yaAvisadas = new Set(
    (
      await prisma.notifiedSession.findMany({
        where: { sessionKey: { in: candidatas.map((s) => s.session_key) } },
        select: { sessionKey: true },
      })
    ).map((n) => n.sessionKey)
  );

  const pendientes = candidatas.filter((s) => !yaAvisadas.has(s.session_key));
  if (!pendientes.length) return informe;

  const traductor = await traductorDeFavoritos();

  for (const cruda of pendientes) {
    const sesion: Sesion = SESIONES[cruda.session_name];
    const etiqueta = `${cruda.location} · ${sesion.nombre}`;

    let filas: FilaDeSesion[];

    try {
      filas = await clasificacionDeSesion(cruda.session_key);
    } catch (error) {
      console.error(`[avisos] No se pudo leer ${etiqueta}:`, error);
      informe.esperando.push(etiqueta);
      continue;
    }

    // Terminada pero sin publicar todavía. No se marca: la próxima vuelta lo
    // vuelve a intentar, que es exactamente lo que hay que hacer.
    if (!filas.length) {
      informe.esperando.push(etiqueta);
      continue;
    }

    const carrera = await granPremioDe(cruda);

    if (!carrera) {
      console.warn(`[avisos] ${etiqueta} no cuadra con ninguna carrera de la base; se salta.`);
      informe.esperando.push(etiqueta);
      continue;
    }

    const url = `/results/${carrera.year}/${carrera.round}`;

    const generico = redactarAviso({
      sesion,
      granPremio: carrera.raceName,
      filas,
      favoritos: [],
    });

    // Se reserva la sesión ANTES de enviar, no después.
    //
    // La clave primaria es la que decide quién avisa: si dos procesos llegan a
    // la vez —dos réplicas, o una vuelta que se solapa con la siguiente— el
    // segundo choca aquí y se va sin mandar nada. Marcando después, los dos
    // habrían enviado ya y el aviso saldría duplicado en la pantalla de
    // bloqueo, que es el fallo que más molesta y el que no tiene arreglo
    // posterior.
    //
    // Lo que se paga a cambio: si el envío revienta justo después de reservar,
    // esa sesión se queda sin aviso. Un aviso de menos se nota mucho menos que
    // uno repetido, y el registro deja constancia.
    if (!ensayo) {
      try {
        await prisma.notifiedSession.create({
          data: {
            sessionKey: cruda.session_key,
            sessionName: cruda.session_name,
            year: cruda.year,
          },
        });
      } catch {
        console.log(`[avisos] ${etiqueta} ya la está avisando otro; se salta.`);
        continue;
      }
    }

    const envio = ensayo
      ? { enviados: 0, caducados: 0, fallidos: 0, saltados: 0 }
      : await avisarACadaUno((destino) => {
          if (!quiereLaSesion(destino.sessions, sesion.codigo)) return null;

          const { titulo, cuerpo } = redactarAviso({
            sesion,
            granPremio: carrera.raceName,
            filas,
            favoritos: favoritosDe(destino, traductor),
          });

          return {
            titulo,
            cuerpo,
            url,
            // Una etiqueta por sesión: si por lo que sea salieran dos avisos de
            // la misma, el segundo sustituye al primero en vez de apilarse.
            etiqueta: `sesion-${cruda.session_key}`,
          };
        });

    if (!ensayo) {
      await prisma.notifiedSession.update({
        where: { sessionKey: cruda.session_key },
        data: { sent: envio.enviados },
      });
    }

    informe.avisadas.push({
      sessionKey: cruda.session_key,
      sesion: etiqueta,
      granPremio: carrera.raceName,
      cuerpoGenerico: generico.cuerpo,
      enviados: envio.enviados,
      saltados: envio.saltados,
    });
  }

  return informe;
}
