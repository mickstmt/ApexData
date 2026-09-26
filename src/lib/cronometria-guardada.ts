import type { SessionType } from '@/types';

/**
 * La cronometría de una sesión ya corrida, guardada para no volver a pedirla.
 *
 * ## El fallo que esto arregla
 *
 * El usuario lo reportó dos veces, el 2026-09-15 y el 2026-09-26: «siempre en
 * las prácticas libres pide la data cada vez que entramos». Y era cierto.
 *
 * Había dos cachés y las dos caducan: el navegador guarda la respuesta cinco
 * minutos y el servicio de telemetría una hora (`CACHE_TTL = 3600`). Nuestra
 * base no guardaba nada. Pasada esa hora, la primera visita obliga a FastF1 a
 * procesar la sesión entera otra vez.
 *
 * Medido en producción el 2026-09-26, sobre la FP1 de Bakú y la FP2 de Italia:
 *
 * | Caso | Tiempo |
 * |---|---|
 * | Pedida en la última hora | **0,06 s** |
 * | Fría | **4,35 s** |
 *
 * Y el dato **no cambia nunca más** una vez corrida la sesión. Ponerle una
 * hora de caducidad a algo inmutable era el fallo.
 *
 * ## Cuándo se puede guardar, que es la única parte delicada
 *
 * Guardar demasiado pronto es peor que no guardar: una sesión en curso, o
 * recién terminada, devuelve una lista parcial o vacía, y congelarla para
 * siempre es exactamente el fallo del 2026-09-24 —la respuesta vacía que se
 * quedó un día entera en su teléfono—.
 *
 * Por eso solo se guarda cuando la sesión es **definitiva**: han pasado
 * `HORAS_HASTA_DEFINITIVA` desde que empezó. Cuatro horas cubren de sobra la
 * más larga —una carrera son dos horas por reglamento y tres contando una
 * suspensión larga— y una práctica dura una.
 *
 * Nota honesta: al plantear esto se dijo que hacía falta el `date_end` que
 * llegó con `openf1_sessions` el mismo día. **No hacía falta**: el comienzo de
 * cada sesión ya estaba en `Race` desde siempre, y con un margen generoso
 * basta. El `date_end` permitiría afinar el margen, no habilita nada.
 *
 * ## Y si algo falla aquí, no pasa nada
 *
 * Es una caché, no la fuente. Cualquier error se registra y se sigue por el
 * camino de siempre, que es pedírselo al servicio.
 */

/** Desde que empieza una sesión hasta que se da por definitiva. */
export const HORAS_HASTA_DEFINITIVA = 4;

/** Qué campo de `Race` guarda el comienzo de cada tipo de sesión. */
const COMIENZO: Record<Exclude<SessionType, 'R'>, string> = {
  FP1: 'fp1Date',
  FP2: 'fp2Date',
  FP3: 'fp3Date',
  SQ: 'sprintQualiDate',
  S: 'sprintDate',
  Q: 'qualiDate',
};

/** La forma que tiene una carrera para decidir si una sesión ya es definitiva. */
export interface CarreraConHorarios {
  date: Date;
  time: string | null;
  fp1Date: Date | null;
  fp2Date: Date | null;
  fp3Date: Date | null;
  sprintQualiDate: Date | null;
  sprintDate: Date | null;
  qualiDate: Date | null;
}

/**
 * Cuándo empezó esa sesión, según nuestra base.
 *
 * La carrera es el caso aparte: `date` cae a medianoche UTC y la hora vive en
 * `time`, así que compararla a secas la adelantaría un día entero.
 */
export function comienzoDeLaSesion(
  carrera: CarreraConHorarios,
  tipo: SessionType
): Date | null {
  if (tipo === 'R') {
    const comienzo = new Date(carrera.date);
    if (!carrera.time) return comienzo;

    const [h, m] = carrera.time.replace('Z', '').split(':').map(Number);
    comienzo.setUTCHours(h ?? 0, m ?? 0, 0, 0);
    return comienzo;
  }

  const campo = COMIENZO[tipo];
  const valor = campo ? (carrera[campo as keyof CarreraConHorarios] as Date | null) : null;

  return valor ?? null;
}

/**
 * ¿Es ya definitiva esta sesión?
 *
 * Sin horario en la base la respuesta es **no**: preferimos volver a pedirlo
 * que congelar algo que quizá esté a medias.
 */
export function esDefinitiva(
  carrera: CarreraConHorarios | null,
  tipo: SessionType,
  ahora: Date
): boolean {
  if (!carrera) return false;

  const comienzo = comienzoDeLaSesion(carrera, tipo);
  if (!comienzo || Number.isNaN(comienzo.getTime())) return false;

  return comienzo.getTime() + HORAS_HASTA_DEFINITIVA * 3_600_000 <= ahora.getTime();
}

/** Lo que devuelve `/fastest`, recortado a lo que aquí importa. */
export interface CronometriaGuardable {
  fastest_laps?: unknown[];
}

/** Recorta la lista al límite pedido, que es lo que hace el servicio. */
export function recortada<T extends CronometriaGuardable>(datos: T, limite: number): T {
  const vueltas = datos.fastest_laps;
  if (!Array.isArray(vueltas) || vueltas.length <= limite) return datos;

  return { ...datos, fastest_laps: vueltas.slice(0, limite) };
}

/** Cuántas vueltas trae una respuesta. Cero significa «todavía no hay nada». */
export function cuantasVueltas(datos: CronometriaGuardable | null | undefined): number {
  return Array.isArray(datos?.fastest_laps) ? datos.fastest_laps.length : 0;
}

/**
 * Los horarios de esa ronda, de nuestra base.
 *
 * `event` llega como texto desde la ruta y normalmente es la ronda. Si no es
 * un número no se puede resolver, y entonces no se guarda nada: es preferible
 * volver a pedirlo que congelar algo sin saber si estaba completo.
 */
export async function carreraDe(year: number, event: string): Promise<CarreraConHorarios | null> {
  const round = Number.parseInt(event, 10);
  if (!Number.isFinite(round)) return null;

  try {
    const { prisma } = await import('@/lib/prisma');

    return await prisma.race.findUnique({
      where: { year_round: { year, round } },
      select: {
        date: true,
        time: true,
        fp1Date: true,
        fp2Date: true,
        fp3Date: true,
        sprintQualiDate: true,
        sprintDate: true,
        qualiDate: true,
      },
    });
  } catch (error) {
    console.warn('[cronometría] No se pudo leer el horario de la ronda:', error);
    return null;
  }
}

/** Lo guardado de esa sesión, o null si no hay nada o falla la lectura. */
export async function leerGuardada<T>(
  year: number,
  event: string,
  sessionType: SessionType
): Promise<T | null> {
  try {
    const { prisma } = await import('@/lib/prisma');

    const fila = await prisma.cronometriaDeSesion.findUnique({
      where: { year_event_sessionType: { year, event, sessionType } },
      select: { datos: true },
    });

    return (fila?.datos as T) ?? null;
  } catch (error) {
    console.warn('[cronometría] No se pudo leer la cronometría guardada:', error);
    return null;
  }
}

/**
 * Guarda la cronometría, pero solo si ya no puede cambiar.
 *
 * Dos condiciones, y las dos hacen falta: que la sesión sea **definitiva** —ver
 * arriba— y que **traiga vueltas**. Una lista vacía es «todavía no», nunca una
 * respuesta final; guardarla sería repetir el fallo del 24 para siempre en vez
 * de durante un día.
 */
export async function guardarSiDefinitiva(
  year: number,
  event: string,
  sessionType: SessionType,
  datos: CronometriaGuardable,
  ahora: Date = new Date()
): Promise<boolean> {
  const vueltas = cuantasVueltas(datos);
  if (!vueltas) return false;

  if (!esDefinitiva(await carreraDe(year, event), sessionType, ahora)) return false;

  try {
    const { prisma } = await import('@/lib/prisma');

    await prisma.cronometriaDeSesion.upsert({
      where: { year_event_sessionType: { year, event, sessionType } },
      update: { datos: datos as object, vueltas },
      create: { year, event, sessionType, datos: datos as object, vueltas },
    });

    return true;
  } catch (error) {
    console.warn('[cronometría] No se pudo guardar la cronometría:', error);
    return false;
  }
}
