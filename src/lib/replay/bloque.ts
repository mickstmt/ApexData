/**
 * El bloque binario de posiciones, tal como lo manda el servicio.
 *
 * Para cada piloto —en el orden del `meta`— `count` enteros `x` y después
 * `count` enteros `y`, de 16 bits, little-endian, en decímetros. Nada más: el
 * `meta` dice cuánto vale `count` y cuántos pilotos hay, así que el bloque no
 * necesita cabecera. `SIN_DATO` marca los instantes en que ese coche no tiene
 * posición.
 *
 * Se lee como `Int16Array` sobre el propio `ArrayBuffer`: cero copias, cero
 * parseo. Una carrera son 1,3 millones de enteros y JSON habría sido diez
 * millones de caracteres que el teléfono tendría que masticar.
 */

/** El mismo valor que escribe el servicio (`app/utils/positions.py`). */
export const SIN_DATO = -32768;

export interface BloqueDePosiciones {
  datos: Int16Array;
  pilotos: number;
  count: number;
}

export class BloqueInvalidoError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'BloqueInvalidoError';
  }
}

/**
 * Comprueba la forma y devuelve la vista.
 *
 * La comprobación es lo único que se puede hacer: un bloque que no mide lo que
 * el meta anuncia describe otra carrera, o llegó a medias, y leerlo daría
 * coches en sitios inventados sin ningún error.
 */
export function leerBloque(buffer: ArrayBuffer, pilotos: number, count: number): BloqueDePosiciones {
  const esperado = pilotos * 2 * count * 2;

  if (buffer.byteLength !== esperado) {
    throw new BloqueInvalidoError(
      `El bloque mide ${buffer.byteLength} bytes y el meta anuncia ${esperado} (${pilotos} pilotos × ${count} instantes).`
    );
  }

  return { datos: new Int16Array(buffer), pilotos, count };
}

/**
 * Dónde está un coche en un instante, que no tiene por qué ser entero.
 *
 * Entre dos muestras se interpola en línea recta: es lo que convierte cuatro
 * posiciones por segundo en movimiento continuo. Sin esto, el coche saltaría
 * de muestra en muestra, que es exactamente el tirón que se vio en el proyecto
 * original.
 */
export function posicionEn(
  bloque: BloqueDePosiciones,
  piloto: number,
  k: number
): [number, number] | null {
  const { datos, count } = bloque;
  if (k < 0 || k > count - 1 || piloto < 0 || piloto >= bloque.pilotos) return null;

  const base = piloto * 2 * count;
  const a = Math.floor(k);
  const f = k - a;

  const xa = datos[base + a], ya = datos[base + count + a];
  if (xa === SIN_DATO) return null;

  // En un instante exacto no hace falta la muestra siguiente: mirarla hacía
  // desaparecer el coche en la última muestra buena antes de un hueco.
  if (f === 0 || a === count - 1) return [xa, ya];

  const xb = datos[base + a + 1], yb = datos[base + count + a + 1];
  if (xb === SIN_DATO) return null;

  return [xa + (xb - xa) * f, ya + (yb - ya) * f];
}

/** La posición cruda en un instante entero, o `null` si no la hay. */
export function muestraEn(bloque: BloqueDePosiciones, piloto: number, k: number): [number, number] | null {
  const { datos, count } = bloque;
  const base = piloto * 2 * count;
  const x = datos[base + k];
  if (x === SIN_DATO) return null;
  return [x, datos[base + count + k]];
}
