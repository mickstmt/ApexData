import type { SesionOpenF1 } from './tipos';

/**
 * El calendario de OpenF1, guardado en nuestra base.
 *
 * ## Por qué existe
 *
 * OpenF1 es quien sabe **qué sesiones existen** —con su `session_key`, de la
 * que cuelgan la clasificación, `notified_sessions` y `sent_previews`— y
 * **cuándo terminan**, que es de donde se cuentan los 35 minutos de espera.
 * Nuestro `Race` guarda los comienzos y ningún final, así que sin esta copia
 * no se puede saber si una sesión ya acabó sin preguntárselo a OpenF1.
 *
 * Preguntárselo en cada vuelta convertía un 401 suyo en una vuelta perdida
 * entera. Con la copia, OpenF1 pasa de dependencia dura a blanda: si no
 * contesta seguimos sabiendo qué sesiones hay, y solo perdemos el resultado de
 * la última.
 *
 * La copia en memoria no bastaba, y era la pregunta del usuario: «si al
 * obtenerlo una vez no debería quedar guardado ya en nuestra db». Cada
 * despliegue la borraba, así que la primera vuelta tras arrancar volvía a
 * depender de que OpenF1 contestase — varias veces al día en un día con
 * despliegues.
 *
 * ## Qué NO hace
 *
 * No resuelve la ronda. La propuesta original guardaba `round` junto a la
 * llave, pero el cruce sesión → gran premio ya lo hace `granPremioDe` por
 * cercanía de fechas, y está comprobado sobre las 115 sesiones de 2026: las
 * 115 caen en su ronda correcta y ninguna produce dos candidatas. Guardar la
 * ronda añadiría un dato que puede quedarse viejo y que no hace falta; y para
 * los dos grandes premios anulados de 2026 —Baréin y Arabia Saudí de abril—
 * no existe ronda nuestra que asignarles.
 *
 * ## Los fallos no suben
 *
 * Un problema de la base aquí no puede llevarse la vuelta por delante: es una
 * caché, no la fuente. Cada función se traga su error, lo registra y devuelve
 * lo que puede.
 */

/** Una fila de la tabla, devuelta con la forma que ya usa todo el código. */
function comoSesion(fila: {
  sessionKey: number;
  meetingKey: number;
  year: number;
  sessionName: string;
  sessionType: string;
  dateStart: Date;
  dateEnd: Date;
  countryName: string;
  location: string;
  isCancelled: boolean;
}): SesionOpenF1 {
  return {
    session_key: fila.sessionKey,
    session_name: fila.sessionName,
    session_type: fila.sessionType,
    date_start: fila.dateStart.toISOString(),
    date_end: fila.dateEnd.toISOString(),
    meeting_key: fila.meetingKey,
    // OpenF1 los manda y el tipo los declara, pero nadie los lee: no se
    // guardan, y aquí se rellenan con lo que sí tenemos.
    circuit_short_name: fila.location,
    country_name: fila.countryName,
    location: fila.location,
    year: fila.year,
    is_cancelled: fila.isCancelled,
  };
}

/** El calendario guardado de una temporada, o null si no hay nada o falla. */
export async function leerTemporada(anio: number): Promise<SesionOpenF1[] | null> {
  try {
    const { prisma } = await import('@/lib/prisma');

    const filas = await prisma.openF1Session.findMany({
      where: { year: anio },
      orderBy: { dateStart: 'asc' },
    });

    return filas.length ? filas.map(comoSesion) : null;
  } catch (error) {
    console.warn('[calendario] No se pudo leer el calendario guardado:', error);
    return null;
  }
}

/**
 * Cuándo se leyó de OpenF1 lo más reciente que hay guardado de esa temporada.
 *
 * Es lo que decide si toca refrescar, y sobrevive a un reinicio — que es todo
 * el motivo de que esto exista.
 */
export async function vistoPorUltimaVez(anio: number): Promise<Date | null> {
  try {
    const { prisma } = await import('@/lib/prisma');

    const fila = await prisma.openF1Session.findFirst({
      where: { year: anio },
      orderBy: { vistaEn: 'desc' },
      select: { vistaEn: true },
    });

    return fila?.vistaEn ?? null;
  } catch (error) {
    console.warn('[calendario] No se pudo leer cuándo se guardó el calendario:', error);
    return null;
  }
}

/**
 * Guarda lo que acaba de contestar OpenF1.
 *
 * Se escriben todas, anuladas incluidas: `is_cancelled` es justo el dato que
 * hace falta para no avisar de un gran premio que no se corre, y en 2026 se
 * anularon dos enteros.
 */
export async function guardarTemporada(sesiones: SesionOpenF1[]): Promise<void> {
  if (!sesiones.length) return;

  try {
    const { prisma } = await import('@/lib/prisma');

    // Una transacción de upserts y no un `createMany`: las filas ya existen en
    // cuanto se ha sembrado una vez, y lo que cambia de una lectura a otra son
    // los horarios de lo que todavía no ha corrido.
    await prisma.$transaction(
      sesiones.map((s) => {
        const datos = {
          meetingKey: s.meeting_key,
          year: s.year,
          sessionName: s.session_name,
          sessionType: s.session_type,
          dateStart: new Date(s.date_start),
          dateEnd: new Date(s.date_end),
          countryName: s.country_name,
          location: s.location,
          isCancelled: s.is_cancelled,
        };

        return prisma.openF1Session.upsert({
          where: { sessionKey: s.session_key },
          update: datos,
          create: { sessionKey: s.session_key, ...datos },
        });
      })
    );
  } catch (error) {
    console.warn('[calendario] No se pudo guardar el calendario:', error);
  }
}
