import { describe, expect, it } from 'vitest';
import { prepararMinisectores, tramoEnMetros, trazadoConTramos } from '@/lib/minisectores';
import type { TelemetryPoint } from '@/types';

/**
 * Un mapa de minisectores mal calculado se pinta igual de bonito y miente sobre
 * quién es fuerte dónde, que es justo lo único que cuenta. Por eso el reparto
 * vive aparte del dibujo.
 */

function traza(pares: [number, string][]): TelemetryPoint[] {
  return pares.map(([Distance, Time]) => ({ Distance, Time }) as unknown as TelemetryPoint);
}

describe('el reparto de tramos', () => {
  it('parte la vuelta en el número de tramos pedido', () => {
    const uno = traza([[0, '0.000'], [1000, '30.000']]);
    const datos = prepararMinisectores(uno, uno, 10);

    expect(datos.tramos).toHaveLength(10);
    expect(datos.tramos[0].numero).toBe(1);
    expect(datos.tramos[9].hasta).toBeCloseTo(1, 6);
  });

  it('reparte el tramo a quien tardó menos en pasarlo', () => {
    // El primero vuela en la primera mitad y se hunde en la segunda; el segundo
    // al revés. Cada uno tiene que llevarse su mitad.
    const uno = traza([[0, '0.000'], [500, '10.000'], [1000, '30.000']]);
    const dos = traza([[0, '0.000'], [500, '20.000'], [1000, '30.000']]);
    const datos = prepararMinisectores(uno, dos, 4);

    expect(datos.tramos.map((t) => t.gana)).toEqual([1, 1, 2, 2]);
    expect(datos.gana1).toBe(2);
    expect(datos.gana2).toBe(2);
  });

  it('no inventa un ganador cuando la diferencia es ruido', () => {
    // Cinco milésimas están por debajo de lo que distingue la cronometría entre
    // dos trazadas: pintar un dueño ahí quitaría credibilidad al mapa entero.
    const uno = traza([[0, '0.000'], [1000, '30.000']]);
    const dos = traza([[0, '0.000'], [1000, '30.002']]);
    const datos = prepararMinisectores(uno, dos, 5);

    expect(datos.tramos.every((t) => t.gana === null)).toBe(true);
    expect(datos.gana1).toBe(0);
    expect(datos.gana2).toBe(0);
  });

  it('mide TIEMPO del tramo, no velocidad media', () => {
    // Los dos recorren la misma distancia en el tramo, pero uno tarda menos.
    const uno = traza([[0, '0.000'], [500, '9.000'], [1000, '30.000']]);
    const dos = traza([[0, '0.000'], [500, '11.000'], [1000, '30.000']]);
    const datos = prepararMinisectores(uno, dos, 2);

    expect(datos.tramos[0].gana).toBe(1);
    expect(datos.tramos[0].tiempo1).toBeCloseTo(9, 3);
    expect(datos.tramos[0].tiempo2).toBeCloseTo(11, 3);
    expect(datos.tramos[0].ventaja).toBeCloseTo(2, 3);
  });

  it('el tramo N es el mismo trozo de pista para los dos', () => {
    // La razón de normalizar por fracción de vuelta: sus cuentakilómetros no
    // coinciden —trazadas y muestreo distintos— pero el tramo 2 tiene que ser
    // la misma curva para ambos. Aquí las dos vueltas son idénticas salvo por
    // la distancia total, así que ningún tramo debería tener dueño.
    const uno = traza([[0, '0.000'], [500, '15.000'], [1000, '30.000']]);
    const dos = traza([[0, '0.000'], [503, '15.000'], [1006, '30.000']]);
    const datos = prepararMinisectores(uno, dos, 5);

    expect(datos.tramos.every((t) => t.gana === null)).toBe(true);
  });

  it('con datos insuficientes no devuelve nada', () => {
    expect(prepararMinisectores([], []).tramos).toEqual([]);
    expect(prepararMinisectores(traza([[0, '0.000']]), traza([[0, '0.000']])).tramos).toEqual([]);
  });
});

describe('del cursor al tramo', () => {
  const uno = traza([[0, '0.000'], [1000, '30.000']]);
  const datos = prepararMinisectores(uno, uno, 10);

  it('encuentra el tramo donde caen unos metros', () => {
    expect(tramoEnMetros(datos, 0)?.numero).toBe(1);
    expect(tramoEnMetros(datos, 250)?.numero).toBe(3);
    expect(tramoEnMetros(datos, 999)?.numero).toBe(10);
  });

  it('el último metro sigue cayendo dentro', () => {
    // Sin acotar, la meta cae fuera de todos los tramos y el mapa se apaga
    // justo al cruzar la línea.
    expect(tramoEnMetros(datos, 1000)?.numero).toBe(10);
    expect(tramoEnMetros(datos, 99999)?.numero).toBe(10);
  });
});

describe('el trazado con sus tramos', () => {
  const conCoordenadas = [
    { X: 0, Y: 0, Distance: 0 },
    { X: 10, Y: 0, Distance: 250 },
    { X: 10, Y: 10, Distance: 500 },
    { X: 0, Y: 10, Distance: 750 },
    { X: 0, Y: 0, Distance: 1000 },
  ] as unknown as TelemetryPoint[];

  it('etiqueta cada punto con el tramo que le toca', () => {
    expect(trazadoConTramos(conCoordenadas, 4).map((p) => p.tramo)).toEqual([1, 2, 3, 4, 4]);
  });

  it('da los metros en la escala de la vuelta común', () => {
    // Si diera el cuentakilómetros de esta traza, el cursor que llega del
    // delta —que va en la escala común— señalaría un punto desplazado.
    const puntos = trazadoConTramos(conCoordenadas, 4, 2000);

    expect(puntos[0].metros).toBeCloseTo(0, 3);
    expect(puntos[2].metros).toBeCloseTo(1000, 3);
    expect(puntos[4].metros).toBeCloseTo(2000, 3);
  });

  it('descarta los puntos sin coordenadas', () => {
    const sucia = [
      { X: 0, Y: 0, Distance: 0 },
      { X: undefined, Y: 5, Distance: 500 },
      { X: 10, Y: 10, Distance: 1000 },
    ] as unknown as TelemetryPoint[];

    expect(trazadoConTramos(sucia, 2)).toHaveLength(2);
  });

  it('sin trazado utilizable devuelve una lista vacía', () => {
    expect(trazadoConTramos([])).toEqual([]);
    expect(trazadoConTramos([{ X: 1, Y: 1, Distance: 5 }] as unknown as TelemetryPoint[])).toEqual(
      []
    );
  });
});
