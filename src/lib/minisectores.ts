import { enFraccionDeVuelta, muestrasDe, tiempoEn } from '@/lib/delta-vuelta';
import type { TelemetryPoint } from '@/types';

/**
 * Quién fue más rápido en cada trozo del circuito.
 *
 * El delta acumulado dice **cuánto** se gana y se pierde a lo largo de la
 * vuelta; esto dice **dónde**, sobre el asfalto de verdad. Son la misma
 * pregunta contada en dos idiomas: una curva que baja no le dice nada a quien
 * no se sepa el trazado de memoria, y un trozo de pista pintado de naranja sí.
 *
 * La vuelta se parte en tramos iguales y cada uno se lo queda quien menos tardó
 * en recorrerlo. Es la lectura que se ve en televisión: no «quién ganó», sino
 * en qué parte del circuito cada uno es fuerte.
 *
 * ## Por qué en tramos y no punto a punto
 *
 * Comparar la velocidad muestra a muestra daría un mapa de confeti: las dos
 * trazas se cruzan decenas de veces por curva y el color cambiaría cada pocos
 * metros sin significar nada. Un tramo de un par de centenares de metros es lo
 * bastante largo para que la diferencia sea real y lo bastante corto para
 * distinguir la frenada de la salida de la misma curva.
 *
 * ## Y por qué el tiempo del tramo, no la velocidad media
 *
 * Lo que se reparte es tiempo. Dos pilotos pueden llevar la misma velocidad
 * media en un tramo y llegar con dos décimas de diferencia si uno frenó más
 * tarde. Restar el instante de entrada del de salida es la única medida que
 * responde a «quién tardó menos en pasar por aquí».
 */

export interface Minisector {
  /** De 1 a `total`, en el orden en que se recorren. */
  numero: number;
  /** Fracción de vuelta donde empieza y acaba, de 0 a 1. */
  desde: number;
  hasta: number;
  /** Metros recorridos al empezar el tramo. */
  metros: number;
  /** 1 o 2 según quién lo ganó; `null` si no hay datos suficientes. */
  gana: 1 | 2 | null;
  /** Cuánto tardó cada uno, en segundos. */
  tiempo1: number;
  tiempo2: number;
  /** La ventaja del ganador, siempre positiva. */
  ventaja: number;
}

export interface Minisectores {
  tramos: Minisector[];
  /** Cuántos se lleva cada uno. */
  gana1: number;
  gana2: number;
  /** Metros de la vuelta, para las etiquetas. */
  longitud: number;
}

const VACIO: Minisectores = { tramos: [], gana1: 0, gana2: 0, longitud: 0 };

/**
 * Cuántos tramos tiene una vuelta.
 *
 * Veinticinco sale de dividir un circuito normal —unos cinco kilómetros— en
 * trozos de doscientos metros: la escala de una curva con su frenada y su
 * salida. Con muchos más, el mapa se vuelve confeti; con muchos menos, un tramo
 * mezcla dos curvas donde mandaron pilotos distintos y el color miente por
 * promedio.
 */
export const TRAMOS = 25;

/**
 * Por debajo de esta ventaja, el tramo se considera empatado.
 *
 * Cinco milésimas están por debajo de lo que distingue la cronometría entre dos
 * trazadas distintas. Pintar un ganador ahí sería inventarse una diferencia, y
 * el mapa entero perdería credibilidad por los tramos que no importan.
 */
const EMPATE = 0.005;

export function prepararMinisectores(
  traza1: TelemetryPoint[],
  traza2: TelemetryPoint[],
  total: number = TRAMOS
): Minisectores {
  const uno = enFraccionDeVuelta(muestrasDe(traza1));
  const dos = enFraccionDeVuelta(muestrasDe(traza2));

  if (uno.fraccion.length < 2 || dos.fraccion.length < 2) return VACIO;

  // La misma normalización que el delta, y por la misma razón: los dos no
  // recorren la misma distancia, así que el tramo 12 tiene que ser el mismo
  // trozo de pista para los dos aunque sus cuentakilómetros no coincidan.
  const longitud = (uno.metros + dos.metros) / 2;

  const tramos: Minisector[] = [];
  let gana1 = 0;
  let gana2 = 0;

  for (let i = 0; i < total; i++) {
    const desde = i / total;
    const hasta = (i + 1) / total;

    const entrada1 = tiempoEn(uno.fraccion, desde);
    const salida1 = tiempoEn(uno.fraccion, hasta);
    const entrada2 = tiempoEn(dos.fraccion, desde);
    const salida2 = tiempoEn(dos.fraccion, hasta);

    if (entrada1 === null || salida1 === null || entrada2 === null || salida2 === null) continue;

    const tiempo1 = salida1 - entrada1;
    const tiempo2 = salida2 - entrada2;
    const ventaja = Math.abs(tiempo1 - tiempo2);

    const gana = ventaja < EMPATE ? null : tiempo1 < tiempo2 ? 1 : 2;
    if (gana === 1) gana1++;
    if (gana === 2) gana2++;

    tramos.push({
      numero: i + 1,
      desde,
      hasta,
      metros: desde * longitud,
      gana,
      tiempo1,
      tiempo2,
      ventaja,
    });
  }

  return { tramos, gana1, gana2, longitud };
}

/** En qué tramo cae unos metros de vuelta. Es lo que une el mapa con el cursor. */
export function tramoEnMetros(datos: Minisectores, metros: number): Minisector | null {
  if (datos.tramos.length === 0 || datos.longitud <= 0) return null;

  const parte = Math.min(Math.max(metros / datos.longitud, 0), 0.999999);

  return datos.tramos.find((t) => parte >= t.desde && parte < t.hasta) ?? null;
}

/**
 * Los puntos del trazado, con el tramo al que pertenece cada uno.
 *
 * El dibujo usa las coordenadas de UNA de las dos vueltas —da igual cuál, las
 * trazadas se parecen a esta escala— pero el reparto viene de comparar las dos.
 */
export interface PuntoDeTrazado {
  x: number;
  y: number;
  tramo: number;
  /** Metros recorridos de vuelta. Es lo que une el mapa con el delta y las trazas. */
  metros: number;
}

export function trazadoConTramos(
  traza: TelemetryPoint[],
  total: number = TRAMOS,
  longitud?: number
): PuntoDeTrazado[] {
  const puntos: PuntoDeTrazado[] = [];

  const conDistancia = traza.filter(
    (p) => p.X !== undefined && p.Y !== undefined && p.Distance !== undefined && p.Distance !== null
  );

  if (conDistancia.length < 2) return puntos;

  const primero = conDistancia[0].Distance as number;
  const ultimo = conDistancia[conDistancia.length - 1].Distance as number;
  const recorrido = ultimo - primero;

  if (recorrido <= 0) return puntos;

  for (const punto of conDistancia) {
    const parte = ((punto.Distance as number) - primero) / recorrido;
    const tramo = Math.min(total - 1, Math.max(0, Math.floor(parte * total))) + 1;

    // Los metros se dan en la escala de la vuelta común, no en el
    // cuentakilómetros de esta traza: si no, el cursor que llega del delta
    // señalaría un punto ligeramente desplazado.
    puntos.push({
      x: punto.X as number,
      y: punto.Y as number,
      tramo,
      metros: parte * (longitud ?? recorrido),
    });
  }

  return puntos;
}
