import { lapTimeToMs } from '@/lib/lap-times';
import type { TelemetryPoint } from '@/types';

/**
 * El delta acumulado entre dos vueltas, metro a metro.
 *
 * La comparación de telemetría enseña dos trazas de velocidad superpuestas, y
 * de ahí se ve *quién va más rápido en cada curva* — pero no lo que de verdad
 * se quiere saber: **dónde se gana y se pierde la vuelta**. Una diferencia de
 * medio segundo casi nunca está donde uno cree; suele acumularse en tres
 * frenadas y devolverse en una recta.
 *
 * Este módulo responde a esa pregunta: en cada metro del trazado, cuánto tiempo
 * lleva ganado o perdido el primer piloto respecto al segundo. Es la lectura
 * que hace útil una comparación, y la que distingue a f1-tempo.
 *
 * ## Por qué hay que interpolar
 *
 * Las dos trazas NO se muestrean en los mismos metros: la telemetría llega a
 * intervalos de tiempo, así que quien va más rápido deja puntos más separados.
 * Medido en la clasificación de Zandvoort 2026: 529 puntos para uno y 538 para
 * el otro, y sus distancias finales difieren en seis metros. Restar el punto
 * *n* de uno con el punto *n* del otro compararía sitios distintos de la pista.
 *
 * Se construye una rejilla común y se interpola el tiempo de cada piloto en
 * cada punto de ella. Entre dos muestras la velocidad apenas cambia, así que la
 * interpolación lineal es suficiente y no inventa nada.
 *
 * ## Y por qué la rejilla va en FRACCIÓN de vuelta, no en metros
 *
 * Los dos no recorren la misma distancia: trazadas distintas y muestreo
 * distinto. En esa misma clasificación, uno marcó 4.238 m y el otro 4.244.
 * Cortando por el menor se pierden los últimos seis metros del más largo —siete
 * centésimas a esa velocidad—, y entonces el delta final **no coincide con la
 * diferencia real entre los dos tiempos de vuelta**: daba −0,385 s donde la
 * diferencia era de 0,455. Un gráfico que no cuadra con el crono no se cree,
 * con razón.
 *
 * Normalizando cada traza a su propia vuelta completa, el 50 % de la vuelta es
 * el mismo sitio de la pista para los dos, y al 100 % el delta es exactamente
 * la diferencia entre los dos tiempos. El eje se sigue enseñando en metros,
 * usando la longitud media, porque «metro 2.560» se lee y «fracción 0,604» no.
 */

export interface PuntoDelta {
  /** Metros recorridos desde la línea de meta. */
  metros: number;
  /** Segundos que el primer piloto lleva de más (positivo) o de menos. */
  delta: number;
}

export interface Delta {
  puntos: PuntoDelta[];
  /** El delta más grande en valor absoluto, para escalar el eje. */
  extremo: number;
  /** Con cuánto termina la vuelta: la diferencia final entre los dos. */
  final: number;
  /** Dónde el primer piloto llega a su mejor momento, y a su peor. */
  mejor: PuntoDelta | null;
  peor: PuntoDelta | null;
  /** Metros de la vuelta, para el eje. */
  longitud: number;
}

const VACIO: Delta = {
  puntos: [],
  extremo: 0,
  final: 0,
  mejor: null,
  peor: null,
  longitud: 0,
};

/** Cuántos puntos tiene la rejilla común. */
const RESOLUCION = 400;

interface Muestra {
  metros: number;
  segundos: number;
}

/**
 * Los puntos utilizables de una traza, ordenados y sin retrocesos.
 *
 * `Time` llega del servicio como texto formateado —«1:11.163»—, no como número,
 * aunque el tipo diga otra cosa. Y `Distance` puede venir ligeramente negativa
 * en el primer punto, porque la muestra cae justo antes de la línea.
 */
export function muestrasDe(traza: TelemetryPoint[]): Muestra[] {
  const muestras: Muestra[] = [];

  for (const punto of traza) {
    const ms = lapTimeToMs(punto.Time as unknown as string);
    if (ms === null || punto.Distance === undefined || punto.Distance === null) continue;

    muestras.push({ metros: punto.Distance, segundos: ms / 1000 });
  }

  muestras.sort((a, b) => a.metros - b.metros);

  // Dos muestras a la misma distancia romperían la interpolación (división por
  // cero); se conserva la primera.
  return muestras.filter((m, i) => i === 0 || m.metros > muestras[i - 1].metros);
}

/** La misma traza, con la distancia pasada a fracción de su propia vuelta. */
export function enFraccionDeVuelta(muestras: Muestra[]): { fraccion: Muestra[]; metros: number } {
  if (muestras.length < 2) return { fraccion: [], metros: 0 };

  const inicio = muestras[0].metros;
  const total = muestras[muestras.length - 1].metros - inicio;
  if (total <= 0) return { fraccion: [], metros: 0 };

  return {
    fraccion: muestras.map((m) => ({ metros: (m.metros - inicio) / total, segundos: m.segundos })),
    metros: total,
  };
}

/** El tiempo de un piloto en un punto del trazado, interpolado entre muestras. */
export function tiempoEn(muestras: Muestra[], metros: number): number | null {
  if (muestras.length === 0) return null;
  if (metros <= muestras[0].metros) return muestras[0].segundos;

  const ultima = muestras[muestras.length - 1];
  if (metros >= ultima.metros) return ultima.segundos;

  // Búsqueda binaria: la rejilla tiene cientos de puntos y las trazas también.
  let bajo = 0;
  let alto = muestras.length - 1;

  while (alto - bajo > 1) {
    const medio = (bajo + alto) >> 1;
    if (muestras[medio].metros <= metros) bajo = medio;
    else alto = medio;
  }

  const a = muestras[bajo];
  const b = muestras[alto];
  const proporcion = (metros - a.metros) / (b.metros - a.metros);

  return a.segundos + proporcion * (b.segundos - a.segundos);
}

export function prepararDelta(traza1: TelemetryPoint[], traza2: TelemetryPoint[]): Delta {
  const uno = enFraccionDeVuelta(muestrasDe(traza1));
  const dos = enFraccionDeVuelta(muestrasDe(traza2));

  if (uno.fraccion.length < 2 || dos.fraccion.length < 2) return VACIO;

  // La longitud que se enseña es la media de las dos: difieren en unos metros
  // por la trazada, y elegir la de uno de ellos sería arbitrario.
  const longitud = (uno.metros + dos.metros) / 2;

  const puntos: PuntoDelta[] = [];

  for (let i = 0; i < RESOLUCION; i++) {
    const parte = i / (RESOLUCION - 1);
    const t1 = tiempoEn(uno.fraccion, parte);
    const t2 = tiempoEn(dos.fraccion, parte);
    if (t1 === null || t2 === null) continue;

    puntos.push({ metros: parte * longitud, delta: t1 - t2 });
  }

  if (puntos.length === 0) return VACIO;

  let mejor = puntos[0];
  let peor = puntos[0];
  let extremo = 0;

  for (const punto of puntos) {
    if (punto.delta < mejor.delta) mejor = punto;
    if (punto.delta > peor.delta) peor = punto;
    extremo = Math.max(extremo, Math.abs(punto.delta));
  }

  return {
    puntos,
    extremo,
    final: puntos[puntos.length - 1].delta,
    mejor,
    peor,
    longitud,
  };
}

/** «+0,455 s» / «−0,128 s»: el signo se lee antes que el número. */
export function comoDelta(segundos: number): string {
  const signo = segundos > 0 ? '+' : segundos < 0 ? '−' : '';
  return `${signo}${Math.abs(segundos).toFixed(3)} s`;
}
