/**
 * Las sesiones de un fin de semana, en el orden en que ocurren.
 *
 * Estaban escritas a mano en la portada, en un orden fijo —práctica, sprint,
 * clasificación, carrera— y en un fin de semana al sprint eso mentía dos veces:
 * enseñaba «Práctica 1 → Sprint» saltándose la clasificación del viernes que
 * ordena la parrilla del sprint, y dejaba la clasificación de la carrera detrás
 * del sprint como si fuera otra cosa.
 *
 * Ordenar por la hora de cada una hace que el fin de semana se cuente solo, sea
 * del formato que sea — y que un formato nuevo no obligue a tocar nada.
 */

export interface FinDeSemana {
  fp1Date: Date | null;
  fp2Date: Date | null;
  fp3Date: Date | null;
  sprintQualiDate: Date | null;
  sprintDate: Date | null;
  qualiDate: Date | null;
}

export interface SesionDelFinDeSemana {
  nombre: string;
  cuando: Date;
}

export function sesionesOrdenadas(
  carrera: FinDeSemana,
  comienzoDeCarrera: Date
): SesionDelFinDeSemana[] {
  const posibles: [string, Date | null][] = [
    ['Práctica 1', carrera.fp1Date],
    ['Práctica 2', carrera.fp2Date],
    ['Práctica 3', carrera.fp3Date],
    ['Clasif. sprint', carrera.sprintQualiDate],
    ['Sprint', carrera.sprintDate],
    ['Clasificación', carrera.qualiDate],
    ['Carrera', comienzoDeCarrera],
  ];

  return posibles
    .filter((entrada): entrada is [string, Date] => entrada[1] !== null)
    .map(([nombre, cuando]) => ({ nombre, cuando }))
    .sort((a, b) => a.cuando.getTime() - b.cuando.getTime());
}

/**
 * Cuánto dura cada sesión, en minutos.
 *
 * Son las duraciones oficiales del formato actual, y solo deciden hasta cuándo
 * una sesión sigue «en curso». Si el reglamento cambia, lo peor que pasa es que
 * la marca se apague unos minutos antes o después.
 */
const DURACION: Record<string, number> = {
  'Práctica 1': 60,
  'Práctica 2': 60,
  'Práctica 3': 60,
  'Clasif. sprint': 45,
  Sprint: 45,
  Clasificación: 60,
  Carrera: 150,
};

const DURACION_POR_DEFECTO = 60;

export type EstadoDeSesion = 'pasada' | 'en-curso' | 'pendiente';

/**
 * En qué punto está una sesión ahora mismo.
 *
 * Una sesión no desaparece en cuanto empieza: sigue «en curso» mientras dura,
 * porque anunciar «la próxima es la clasificación» mientras la práctica está
 * rodando sería mentir por precisión mal entendida.
 */
export function estadoDeSesion(nombre: string, cuando: Date, ahora: number): EstadoDeSesion {
  const empieza = cuando.getTime();
  const acaba = empieza + (DURACION[nombre] ?? DURACION_POR_DEFECTO) * 60_000;

  if (ahora >= acaba) return 'pasada';
  if (ahora >= empieza) return 'en-curso';
  return 'pendiente';
}

/**
 * Qué enseñar en la pestaña de una sesión que todavía no tiene resultados.
 *
 * Una pestaña vacía no distingue tres situaciones que para quien mira son muy
 * distintas: que la sesión aún no se ha corrido, que se corrió y los resultados
 * no han llegado, o que esa sesión nunca va a tener datos por esta vía. Decirlo
 * cuesta lo mismo que no decirlo.
 */
/** El comienzo real de la carrera: la fecha es medianoche y la hora va aparte. */
export function comienzoDeCarrera(fecha: Date, hora: string | null): Date {
  const comienzo = new Date(fecha);
  if (!hora) return comienzo;

  const [h, m] = hora.replace('Z', '').split(':').map(Number);
  comienzo.setUTCHours(h ?? 0, m ?? 0, 0, 0);
  return comienzo;
}

export type QueEnseñar =
  | { tipo: 'resultados' }
  | { tipo: 'aun-no-corre'; cuando: Date }
  | { tipo: 'en-curso'; cuando: Date }
  | { tipo: 'sin-publicar'; cuando: Date }
  | { tipo: 'sin-fuente' };

export function queEnseñar({
  nombre,
  cuando,
  tieneResultados,
  hayFuente = true,
  ahora,
}: {
  nombre: string;
  cuando: Date | null;
  tieneResultados: boolean;
  /** Falso para prácticas y clasificación al sprint: Jolpica no las publica. */
  hayFuente?: boolean;
  ahora: number;
}): QueEnseñar {
  if (tieneResultados) return { tipo: 'resultados' };
  if (!hayFuente) return { tipo: 'sin-fuente' };
  if (!cuando) return { tipo: 'sin-fuente' };

  const estado = estadoDeSesion(nombre, cuando, ahora);

  if (estado === 'pendiente') return { tipo: 'aun-no-corre', cuando };
  if (estado === 'en-curso') return { tipo: 'en-curso', cuando };

  // Terminó y no hay datos: están de camino. Es normal durante la primera hora.
  return { tipo: 'sin-publicar', cuando };
}
