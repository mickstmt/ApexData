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
