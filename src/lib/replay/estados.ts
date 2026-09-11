/**
 * Los estados de pista del replay: qué hay en cada instante, cómo se llama y
 * de qué color va.
 *
 * Los códigos son los de FastF1: 1 pista libre, 2 amarilla, 4 safety car,
 * 5 roja, 6 y 7 virtual safety car. Aquí viven los nombres y los colores para
 * que el mapa, la píldora y el scrubber cuenten lo mismo con las mismas
 * palabras y la misma tinta.
 */

import type { PositionsTrackStatus } from '@/types';

export type ClaseDeEstado = 'libre' | 'amarilla' | 'sc' | 'roja' | 'vsc';

const CLASES: Record<string, ClaseDeEstado> = {
  '1': 'libre',
  '2': 'amarilla',
  '4': 'sc',
  '5': 'roja',
  '6': 'vsc',
  '7': 'vsc',
};

const NOMBRES: Record<ClaseDeEstado, string> = {
  libre: 'Pista libre',
  amarilla: 'Bandera amarilla',
  sc: 'Safety car',
  roja: 'Bandera roja',
  vsc: 'Virtual safety car',
};

/**
 * La tinta de cada estado, para el canvas y el scrubber, que no leen CSS.
 *
 * Son los tokens del tema oscuro de la app —`--slower`, `--live` y un naranja
 * entre los dos— porque la pantalla del replay va siempre en carbón. La pista
 * libre es el gris del trazado.
 */
export const TINTA: Record<ClaseDeEstado, string> = {
  libre: '#50505E',
  amarilla: '#FBBE23',
  sc: '#FF8D29',
  roja: '#FF4238',
  vsc: '#FF8D29',
};

export function claseDeEstado(codigo: string): ClaseDeEstado {
  return CLASES[codigo] ?? 'libre';
}

export function nombreDeEstado(clase: ClaseDeEstado): string {
  return NOMBRES[clase];
}

/** El estado vigente en un instante, en segundos desde la salida. */
export function estadoEn(tramos: PositionsTrackStatus[], t: number): ClaseDeEstado {
  for (const tramo of tramos) {
    if (t >= tramo.start && t < tramo.end) return claseDeEstado(tramo.status);
  }
  return 'libre';
}

export interface TramoDelScrubber {
  clase: ClaseDeEstado;
  /** Del 0 al 100. */
  desde: number;
  hasta: number;
}

/**
 * Los tramos que no son pista libre, en porcentaje de la carrera, para pintar
 * el scrubber. Se recortan a la ventana y se descartan los que no dejan ni
 * medio punto porcentual: no se verían.
 */
export function tramosDelScrubber(tramos: PositionsTrackStatus[], duracion: number): TramoDelScrubber[] {
  if (duracion <= 0) return [];

  const salida: TramoDelScrubber[] = [];
  for (const tramo of tramos) {
    const clase = claseDeEstado(tramo.status);
    if (clase === 'libre') continue;

    const desde = Math.max(0, (tramo.start / duracion) * 100);
    const hasta = Math.min(100, (tramo.end / duracion) * 100);
    if (hasta - desde < 0.5) continue;

    salida.push({ clase, desde: Math.round(desde * 100) / 100, hasta: Math.round(hasta * 100) / 100 });
  }
  return salida;
}

/** El degradado CSS del scrubber: gris con las paradas de cada tramo. */
export function degradadoDelScrubber(tramos: TramoDelScrubber[], gris: string): string {
  const paradas = [`${gris} 0%`];
  for (const t of tramos) {
    const tinta = TINTA[t.clase];
    paradas.push(`${gris} ${t.desde}%`, `${tinta} ${t.desde}%`, `${tinta} ${t.hasta}%`, `${gris} ${t.hasta}%`);
  }
  paradas.push(`${gris} 100%`);
  return `linear-gradient(90deg, ${paradas.join(', ')})`;
}
