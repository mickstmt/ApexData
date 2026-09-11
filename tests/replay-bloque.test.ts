import { describe, expect, it } from 'vitest';
import { BloqueInvalidoError, SIN_DATO, leerBloque, muestraEn, posicionEn } from '@/lib/replay/bloque';

/**
 * El bloque binario es lo único del replay que no se puede leer a ojo: un
 * error de forma pinta coches en sitios inventados sin ningún aviso.
 */

/** Un bloque a mano: por piloto, `count` x y después `count` y. */
function bloque(pilotos: number[][][]): ArrayBuffer {
  const count = pilotos[0][0].length;
  const datos = new Int16Array(pilotos.length * 2 * count);
  pilotos.forEach(([xs, ys], i) => {
    datos.set(xs, i * 2 * count);
    datos.set(ys, i * 2 * count + count);
  });
  return datos.buffer;
}

describe('leer el bloque', () => {
  it('acepta el que mide lo que el meta anuncia', () => {
    const b = leerBloque(bloque([[[1, 2, 3], [4, 5, 6]]]), 1, 3);
    expect(b.count).toBe(3);
    expect(b.pilotos).toBe(1);
  });

  it('rechaza el que no mide: describe otra carrera o llegó a medias', () => {
    expect(() => leerBloque(bloque([[[1, 2, 3], [4, 5, 6]]]), 2, 3)).toThrow(BloqueInvalidoError);
    expect(() => leerBloque(new ArrayBuffer(10), 1, 3)).toThrow(/12 \(1 pilotos × 3 instantes\)/);
  });
});

describe('la posición en un instante', () => {
  const b = leerBloque(bloque([[[0, 100, SIN_DATO], [10, 30, SIN_DATO]], [[7, 7, 7], [8, 8, 8]]]), 2, 3);

  it('entre dos muestras se interpola en línea recta', () => {
    expect(posicionEn(b, 0, 0.5)).toEqual([50, 20]);
    expect(posicionEn(b, 0, 0)).toEqual([0, 10]);
    expect(posicionEn(b, 0, 1)).toEqual([100, 30]);
  });

  it('sin dato a un lado, no hay posición', () => {
    // Interpolar hacia un SIN_DATO mandaría el coche al infinito negativo.
    expect(posicionEn(b, 0, 1.5)).toBeNull();
    expect(posicionEn(b, 0, 2)).toBeNull();
  });

  it('cada piloto lee su propio bloque', () => {
    expect(posicionEn(b, 1, 0.5)).toEqual([7, 8]);
    expect(muestraEn(b, 1, 2)).toEqual([7, 8]);
  });

  it('fuera de rango no revienta', () => {
    expect(posicionEn(b, 0, -1)).toBeNull();
    expect(posicionEn(b, 0, 3)).toBeNull();
    expect(posicionEn(b, 5, 0)).toBeNull();
  });
});
