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
 * La tinta de cada estado ya no vive aquí.
 *
 * Vivía: un único juego de colores calibrado contra el carbón, cuando el
 * replay era siempre oscuro. Ahora sigue el tema de la app, así que hay dos
 * juegos y quien pinta decide con cuál. Los colores están en `--replay-*` de
 * `globals.css`; `components/replay/tema.ts` los sirve resueltos al lienzo y
 * como cadena `var(...)` a lo que es DOM.
 *
 * Lo que queda aquí es lo que no depende del tema: qué estado hay en cada
 * instante y cómo se llama.
 */

/**
 * El reloj de la carrera: cuántos de los instantes transcurridos hasta cada uno
 * contaban como carrera en marcha.
 *
 * Existe para que los huecos no se traguen una bandera roja. `huecoEn` responde
 * «cuánto hace que el líder pasó por aquí», y con todos parados esa respuesta
 * incluye la parada entera: en la captura del usuario, toda la parrilla marcaba
 * +1416 s —veintitrés minutos y medio— repartida en un rango de solo quince
 * segundos. La cuenta no estaba rota; estaba contando tiempo en el que no se
 * corría.
 *
 * Lo que hace falta es medir sobre un reloj que se detenga con la carrera. Con
 * él el hueco sale constante y correcto: antes de la bandera, durante, y
 * después del reinicio.
 *
 * ## Por qué no basta con `track_status`
 *
 * La primera versión miraba solo la bandera declarada, y dejó escrita su propia
 * contrapartida: «si una sesión no trae su bandera roja en `track_status`, esto
 * no la ve y el hueco vuelve a engordar». Eso pasó.
 *
 * En el GP de Italia de 2026, medido sobre los datos de producción: la carrera
 * estuvo **detenida 1819 segundos** y `track_status` declara **103** de roja.
 * El resto los declara *verde* y *amarilla* con los veintidós coches parados en
 * el sitio. El delta de Hamilton pasaba de 16 s a **1223,8** sin que su
 * distancia al líder cambiara ni un metro: exactamente los 1207 s del tramo mal
 * declarado. El usuario lo vio como «el tiempo sigue subiendo aunque estén
 * todos parados», y tenía razón.
 *
 * ## Por qué mirar el movimiento sí vale, ahora
 *
 * Aquella versión descartó deducirlo del movimiento por dos miedos, y los dos
 * se comprobaron sobre datos reales antes de cambiar nada:
 *
 * - *«Confundiría una parada con un coche que va despacio»*. No, porque no se
 *   mira un coche: se mira si **ninguno de los veintidós** avanza. Uno puede ir
 *   al ralentí; los veintidós a la vez, solo si la carrera está detenida.
 * - *«Con bandera roja los coches no se quedan quietos, se van al pit lane»*.
 *   Cierto, y por eso el estado declarado **sigue contando**: durante los 103 s
 *   de roja declarada el líder avanzó 2007 m, o sea 19,5 m/s. Las dos reglas se
 *   suman, no se sustituyen.
 *
 * Lo que sí encontró la medición, y conviene saber que es correcto: además de
 * la suspensión, la regla marca dos tramos de ~70 s declarados VERDES en los
 * que nadie se mueve. No son datos ausentes —los veintidós tienen posición— ni
 * un fallo: son las **dos paradas en la parrilla** de una reanudación con
 * salida parada, separadas por una vuelta de formación de 128 s. Ahí los coches
 * están quietos de verdad y congelar el reloj es lo que toca.
 */
export function relojDeCarrera(
  tramos: PositionsTrackStatus[],
  count: number,
  paso: number,
  progreso?: Float64Array[]
): Int32Array {
  // `reloj[k]` = instantes de carrera en marcha desde la salida hasta `k`.
  const reloj = new Int32Array(count);

  /**
   * Lo más lejos que ha llegado alguien en cada instante.
   *
   * Se mira el máximo y no el líder por nombre: quién va primero cambia a lo
   * largo de la carrera, y este cálculo tiene que valer en todos los instantes
   * sin depender de un orden que aún no se ha resuelto.
   */
  const puntero = progreso ? new Float64Array(count).fill(Number.NaN) : null;

  if (puntero && progreso) {
    for (let k = 0; k < count; k++) {
      let tope = Number.NaN;
      for (const via of progreso) {
        const v = via[k];
        if (!Number.isNaN(v) && (Number.isNaN(tope) || v > tope)) tope = v;
      }
      puntero[k] = tope;
    }
  }

  /** Un centímetro: por debajo de eso es ruido de proyección, no avance. */
  const QUIETO = 0.01;

  let corridos = 0;
  for (let k = 1; k < count; k++) {
    const declaradaRoja = estadoEn(tramos, k * paso) === 'roja';

    // Sin dato no se decide nada: un hueco en las posiciones no es una parada,
    // y tratarlo como tal congelaría el reloj por no saber.
    const nadieAvanza =
      puntero !== null &&
      !Number.isNaN(puntero[k]) &&
      !Number.isNaN(puntero[k - 1]) &&
      puntero[k] - puntero[k - 1] <= QUIETO;

    if (!declaradaRoja && !nadieAvanza) corridos++;
    reloj[k] = corridos;
  }

  return reloj;
}

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

/**
 * El degradado CSS del scrubber: gris con las paradas de cada tramo.
 *
 * La tinta llega de fuera en vez de salir de una tabla de aquí dentro, porque
 * depende del tema. Quien llama pasa colores CSS —normalmente `var(...)`, que
 * cambian solos— y esta función no necesita saber cuál es el tema vigente.
 */
export function degradadoDelScrubber(
  tramos: TramoDelScrubber[],
  gris: string,
  tinta: Record<ClaseDeEstado, string>
): string {
  const paradas = [`${gris} 0%`];
  for (const t of tramos) {
    const color = tinta[t.clase];
    paradas.push(`${gris} ${t.desde}%`, `${color} ${t.desde}%`, `${color} ${t.hasta}%`, `${gris} ${t.hasta}%`);
  }
  paradas.push(`${gris} 100%`);
  return `linear-gradient(90deg, ${paradas.join(', ')})`;
}
