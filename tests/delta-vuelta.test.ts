import { describe, expect, it } from 'vitest';
import { comoDelta, muestrasDe, prepararDelta, tiempoEn } from '@/lib/delta-vuelta';
import type { TelemetryPoint } from '@/types';

/**
 * Lo que puede salir mal aquí no es visible en el gráfico: un delta mal
 * calculado se dibuja igual de bonito y miente. Por eso el cálculo vive aparte.
 */

/** Una traza a partir de pares [metros, «tiempo»], como los sirve el servicio. */
function traza(pares: [number, string][]): TelemetryPoint[] {
  return pares.map(([Distance, Time]) => ({ Distance, Time }) as unknown as TelemetryPoint);
}

describe('las muestras utilizables', () => {
  it('lee el tiempo, que llega como texto y no como número', () => {
    // El tipo del servicio dice `number`, pero lo que llega es «1:11.163».
    const muestras = muestrasDe(traza([[0, '0.000'], [100, '1:02.500']]));
    expect(muestras).toEqual([
      { metros: 0, segundos: 0 },
      { metros: 100, segundos: 62.5 },
    ]);
  });

  it('descarta lo que no se puede usar', () => {
    const sucia = [
      { Distance: 0, Time: '0.000' },
      { Distance: undefined, Time: '1.000' },
      { Distance: 50, Time: null },
      { Distance: 100, Time: '2.000' },
    ] as unknown as TelemetryPoint[];

    expect(muestrasDe(sucia).map((m) => m.metros)).toEqual([0, 100]);
  });

  it('ordena y quita distancias repetidas', () => {
    // Dos muestras en el mismo metro dividirían por cero al interpolar.
    const muestras = muestrasDe(traza([[100, '2.000'], [0, '0.000'], [100, '2.100']]));
    expect(muestras.map((m) => m.metros)).toEqual([0, 100]);
  });
});

describe('el tiempo en un punto del trazado', () => {
  const muestras = muestrasDe(traza([[0, '0.000'], [100, '10.000'], [200, '30.000']]));

  it('interpola entre dos muestras', () => {
    expect(tiempoEn(muestras, 50)).toBeCloseTo(5, 6);
    expect(tiempoEn(muestras, 150)).toBeCloseTo(20, 6);
  });

  it('acierta justo encima de una muestra', () => {
    expect(tiempoEn(muestras, 100)).toBeCloseTo(10, 6);
  });

  it('no extrapola fuera de la traza', () => {
    // Inventar más allá del último punto sería dibujar datos que no existen.
    expect(tiempoEn(muestras, -50)).toBe(0);
    expect(tiempoEn(muestras, 999)).toBe(30);
  });
});

describe('el delta acumulado', () => {
  it('es cero cuando las dos vueltas son idénticas', () => {
    const igual = traza([[0, '0.000'], [1000, '30.000'], [2000, '60.000']]);
    const delta = prepararDelta(igual, igual);

    expect(delta.puntos.length).toBeGreaterThan(0);
    expect(delta.extremo).toBeCloseTo(0, 6);
    expect(delta.final).toBeCloseTo(0, 6);
  });

  it('positivo significa que el PRIMERO va perdiendo', () => {
    // El primero tarda 62 s en la vuelta; el segundo, 60. Termina +2.
    const lento = traza([[0, '0.000'], [2000, '1:02.000']]);
    const rapido = traza([[0, '0.000'], [2000, '1:00.000']]);

    expect(prepararDelta(lento, rapido).final).toBeCloseTo(2, 3);
    expect(prepararDelta(rapido, lento).final).toBeCloseTo(-2, 3);
  });

  it('compara el mismo METRO, no la misma muestra', () => {
    // Este es el motivo de existir del módulo. Las dos vueltas duran lo mismo,
    // pero se muestrean en sitios distintos: restar punto a punto daría una
    // diferencia inventada, y el delta real es cero en todos lados.
    const uno = traza([[0, '0.000'], [500, '15.000'], [1000, '30.000']]);
    const dos = traza([[0, '0.000'], [250, '7.500'], [750, '22.500'], [1000, '30.000']]);

    expect(prepararDelta(uno, dos).extremo).toBeCloseTo(0, 6);
  });

  it('encuentra dónde se gana y dónde se pierde', () => {
    // El primero pierde un segundo en la primera mitad y lo recupera entero en
    // la segunda: termina igualado, pero el gráfico tiene que enseñar la curva.
    const uno = traza([[0, '0.000'], [500, '16.000'], [1000, '30.000']]);
    const dos = traza([[0, '0.000'], [500, '15.000'], [1000, '30.000']]);
    const delta = prepararDelta(uno, dos);

    expect(delta.final).toBeCloseTo(0, 3);
    expect(delta.extremo).toBeGreaterThan(0.9);
    expect(delta.peor?.metros).toBeCloseTo(500, -2);
  });

  it('el delta final es EXACTAMENTE la diferencia entre los dos tiempos', () => {
    // La prueba que de verdad importa, y la que obligó a comparar por fracción
    // de vuelta y no por metro absoluto.
    //
    // Los dos no recorren la misma distancia —trazadas y muestreo distintos—.
    // Cortando por el más corto se perdían los últimos metros del otro, y con
    // datos reales de Zandvoort el delta final daba −0,385 s donde la
    // diferencia entre los cronos era de 0,455. Un gráfico que no cuadra con el
    // crono no se cree, con razón.
    const corto = traza([[0, '0.000'], [800, '24.000']]);
    const largo = traza([[0, '0.000'], [1000, '30.000']]);

    expect(prepararDelta(corto, largo).final).toBeCloseTo(24 - 30, 3);
    expect(prepararDelta(largo, corto).final).toBeCloseTo(30 - 24, 3);
  });

  it('la longitud que enseña es la media de las dos', () => {
    // Difieren en unos metros por la trazada; quedarse con la de uno de los dos
    // sería arbitrario.
    const corto = traza([[0, '0.000'], [800, '24.000']]);
    const largo = traza([[0, '0.000'], [1000, '30.000']]);

    expect(prepararDelta(corto, largo).longitud).toBeCloseTo(900, 3);
  });

  it('con datos insuficientes no inventa nada', () => {
    expect(prepararDelta([], []).puntos).toEqual([]);
    expect(prepararDelta(traza([[0, '0.000']]), traza([[0, '0.000']])).puntos).toEqual([]);
  });
});

describe('cómo se lee un delta', () => {
  it('el signo va delante, que es lo primero que se mira', () => {
    expect(comoDelta(0.455)).toBe('+0.455 s');
    expect(comoDelta(-0.128)).toBe('−0.128 s');
    expect(comoDelta(0)).toBe('0.000 s');
  });
});
