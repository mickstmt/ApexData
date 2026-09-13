import { describe, expect, it } from 'vitest';
import { finalDeCarrera, instanteDe } from '@/lib/replay/final';

/**
 * El final de carrera, con los casos que se midieron de verdad en producción.
 *
 * Los números salen de comparar el orden del replay con el resultado oficial
 * en tres carreras de 2026: por metros recorridos fallaba en 4 a 8 de los 10
 * primeros, y por cruces de meta en 0 a 2.
 */

const PASO = 0.25;

/** La clasificación oficial, en códigos, sin tiempos. */
const oficial = (...codes: string[]) => codes.map((code) => ({ code, tiempo: null }));

/** Una carrera de juguete: `vueltas` cruces, el último en `ultimo`. */
function piloto(code: string, vueltas: number, ultimo: number) {
  const laps: number[] = [];
  for (let v = 1; v <= vueltas; v++) laps.push((ultimo / vueltas) * v);
  return { code, laps };
}

describe('la bandera a cuadros', () => {
  it('cae cuando el ganador cruza por última vez, no al final de los datos', () => {
    // Lo medido en Italia 2026: la bandera en el segundo 6675,5 de 6754,3, o
    // sea 78,8 s antes del final. Ese minuto largo es la vuelta de celebración.
    const final = finalDeCarrera(
      [piloto('VER', 53, 6675.5), piloto('NOR', 53, 6677.2), piloto('LEC', 20, 2500)],
      { step: PASO, count: 27018 },
      null
    );

    expect(final).not.toBeNull();
    expect(final!.banderaEnSegundos).toBeCloseTo(6675.5, 1);
    expect(final!.bandera).toBe(Math.round(6675.5 / PASO));
    // Y no el último instante, que es donde el replay la daba antes.
    expect(final!.bandera).toBeLessThan(27017);
  });

  it('el ganador es el que más vueltas dio, y entre esos el que antes cruzó', () => {
    const final = finalDeCarrera(
      [piloto('A', 53, 6680), piloto('B', 53, 6675), piloto('C', 52, 6600)],
      { step: PASO, count: 28000 },
      null
    );

    expect(final!.orden[0]).toBe(1); // B cruzó antes
    expect(final!.orden[1]).toBe(0);
    expect(final!.orden[2]).toBe(2); // una vuelta menos, por detrás de los dos
  });
});

describe('quién ha tomado la bandera', () => {
  it('los que cruzan después del ganador, sí; el retirado, no', () => {
    // Un retirado también tiene un último cruce, pero muy anterior. Sin este
    // corte, la banderita de «ya cruzó» le saldría a quien abandonó en la 20.
    const final = finalDeCarrera(
      [piloto('VER', 53, 6675.5), piloto('NOR', 53, 6677.2), piloto('LEC', 20, 2500)],
      { step: PASO, count: 27018 },
      null
    );

    expect(final!.cruce[0]).toBeCloseTo(6675.5, 1);
    expect(final!.cruce[1]).toBeCloseTo(6677.2, 1);
    expect(final!.cruce[2]).toBe(Number.POSITIVE_INFINITY);
  });

  it('el que cruza justo después del último instante también la toma', () => {
    // Italia 2026: el decimoquinto cruzó en 6754,37 y los datos terminan en
    // 6754,25. Sin recortar, su banderita no salía nunca, ni con el replay
    // parado en el final, y su tiempo se quedaba en el hueco en vivo.
    const count = 27018;
    const duracion = (count - 1) * PASO; // 6754,25
    const final = finalDeCarrera(
      [piloto('ANT', 53, 6675.5), piloto('BEA', 53, 6754.37)],
      { step: PASO, count },
      null
    );

    expect(final!.cruce[1]).toBeLessThanOrEqual(duracion);
    // Y el hueco sigue siendo el de verdad, no el del recorte.
    expect(final!.llegada[1]).toBe('+78.9s');
  });

  it('un doblado también la toma, aunque lleve una vuelta menos', () => {
    const final = finalDeCarrera(
      [piloto('VER', 53, 6675.5), piloto('TSU', 52, 6690)],
      { step: PASO, count: 27018 },
      null
    );

    expect(final!.cruce[1]).toBeCloseTo(6690, 1);
  });
});

describe('el orden', () => {
  it('lo manda el oficial, porque es el único que sabe de sanciones', () => {
    // Lo medido en Hungría 2026: HAM cruzó antes que LEC —6015,9 contra
    // 6020,2— y sin embargo LEC es cuarto. Los cruces no pueden saber eso.
    const final = finalDeCarrera(
      [piloto('HAM', 70, 6015.9), piloto('LEC', 70, 6020.2), piloto('VER', 70, 6000)],
      { step: PASO, count: 25000 },
      oficial('VER', 'LEC', 'HAM')
    );

    expect(final!.orden.map((i) => ['HAM', 'LEC', 'VER'][i])).toEqual(['VER', 'LEC', 'HAM']);
  });

  it('sin oficial, los cruces: una carrera recién terminada no lo tiene', () => {
    const final = finalDeCarrera(
      [piloto('HAM', 70, 6015.9), piloto('LEC', 70, 6020.2), piloto('VER', 70, 6000)],
      { step: PASO, count: 25000 },
      null
    );

    expect(final!.orden.map((i) => ['HAM', 'LEC', 'VER'][i])).toEqual(['VER', 'HAM', 'LEC']);
  });

  it('un piloto que el oficial no nombra se queda detrás, no desaparece', () => {
    const final = finalDeCarrera(
      [piloto('VER', 53, 6675), piloto('NOR', 53, 6677), piloto('XXX', 53, 6679)],
      { step: PASO, count: 27018 },
      oficial('VER', 'NOR')
    );

    expect(final!.orden).toHaveLength(3);
    expect(final!.orden.map((i) => ['VER', 'NOR', 'XXX'][i])).toEqual(['VER', 'NOR', 'XXX']);
  });

  it('un oficial de otra carrera no se usa: manda lo que dicen estos datos', () => {
    // Si los códigos no casan, el orden oficial dejaría fuera a casi todos y
    // la torre quedaría al revés. Mejor los cruces, que son de esta sesión.
    const final = finalDeCarrera(
      [piloto('VER', 53, 6675), piloto('NOR', 53, 6677), piloto('PIA', 53, 6679)],
      { step: PASO, count: 27018 },
      oficial('ZZZ', 'YYY')
    );

    expect(final!.orden.map((i) => ['VER', 'NOR', 'PIA'][i])).toEqual(['VER', 'NOR', 'PIA']);
  });
});

describe('el tiempo con el que se termina', () => {
  it('manda el oficial, porque es el que casa con la posición', () => {
    // Hungría 2026: HAM cruzó 4,3 s antes que LEC —6015,9 contra 6020,2, con
    // la bandera en 5996,4— y sin embargo sale quinto, porque le cayeron cinco
    // segundos. Con el hueco medido en pista, la torre diría que el quinto
    // llegó antes que el cuarto.
    const final = finalDeCarrera(
      [piloto('HAM', 70, 6015.9), piloto('LEC', 70, 6020.2), piloto('NOR', 70, 5996.4)],
      { step: PASO, count: 25000 },
      [
        { code: 'NOR', tiempo: '1:39:56.180' },
        { code: 'LEC', tiempo: '+23.840' },
        { code: 'HAM', tiempo: '+24.540' },
      ]
    );

    expect(final!.llegada[2]).toBe('líder');
    expect(final!.llegada[1]).toBe('+23.8s'); // LEC, cuarto
    expect(final!.llegada[0]).toBe('+24.5s'); // HAM, quinto pese a cruzar antes
  });

  it('sin oficial, el hueco de verdad entre su bandera y la del ganador', () => {
    const final = finalDeCarrera(
      [piloto('NOR', 70, 5996.4), piloto('HAM', 70, 6015.9)],
      { step: PASO, count: 25000 },
      null
    );

    expect(final!.llegada[0]).toBe('líder');
    expect(final!.llegada[1]).toBe('+19.5s');
  });

  it('un hueco de más de un minuto viene como «+1:05.187», no como 1', () => {
    // Italia 2026: el undécimo terminó a 1:05 del ganador. `parseFloat` de esa
    // cadena devuelve 1, así que salía con «+1.0s» y por delante del décimo.
    const final = finalDeCarrera(
      [piloto('ANT', 53, 6675.5), piloto('BOR', 53, 6740.7)],
      { step: PASO, count: 27018 },
      [
        { code: 'ANT', tiempo: '1:51:15.281' },
        { code: 'BOR', tiempo: '+1:05.187' },
      ]
    );

    expect(final!.llegada[1]).toBe('+65.2s');
  });

  it('a un doblado se le dicen vueltas, no segundos', () => {
    // El oficial le pone «+28.033» a un doblado, que es su hueco en su propia
    // vuelta: enseñarlo dejaría al octavo con menos hueco que el séptimo.
    const final = finalDeCarrera(
      [piloto('NOR', 70, 5996.4), piloto('LAW', 69, 6024.4), piloto('BOR', 68, 6030)],
      { step: PASO, count: 25000 },
      [
        { code: 'NOR', tiempo: '1:39:56.180' },
        { code: 'LAW', tiempo: '+28.033' },
        { code: 'BOR', tiempo: '+31.000' },
      ]
    );

    expect(final!.llegada[1]).toBe('+1 vuelta');
    expect(final!.llegada[2]).toBe('+2 vueltas');
  });

  it('el que no cruzó no tiene tiempo de llegada: su fila enseña OUT', () => {
    const final = finalDeCarrera(
      [piloto('NOR', 70, 5996.4), piloto('LEC', 20, 2000)],
      { step: PASO, count: 25000 },
      null
    );

    expect(final!.llegada[1]).toBe('');
  });
});

describe('cuando no hay final que dar', () => {
  it('unos cruces que no llegan al final de los datos no son la bandera', () => {
    // Medido, la bandera cae en el 98,8 %, el 99,1 % y el 98,9 % de la línea
    // de tiempo. Unos cruces que la ponen a un quinto del replay son de otra
    // cosa —una sesión recortada, unas vueltas mal leídas— y congelar la torre
    // ahí la dejaría quieta media carrera, que es peor que no tocarla.
    const cortos = finalDeCarrera(
      [piloto('VER', 2, 28), piloto('NOR', 2, 29)],
      { step: PASO, count: 600 }, // 149,75 s: la «bandera» caería en el 19 %
      null
    );
    expect(cortos).toBeNull();

    // Y con la misma carrera acabando donde acaban los datos, sí.
    const buenos = finalDeCarrera(
      [piloto('VER', 2, 28), piloto('NOR', 2, 29)],
      { step: PASO, count: 120 }, // 29,75 s: la bandera en el 94 %
      null
    );
    expect(buenos).not.toBeNull();
  });

  it('sin cruces de meta devuelve null, y el replay se comporta como siempre', () => {
    expect(finalDeCarrera([{ code: 'VER', laps: [] }], { step: PASO, count: 100 }, null)).toBeNull();
    expect(finalDeCarrera([], { step: PASO, count: 100 }, null)).toBeNull();
  });
});

describe('instanteDe', () => {
  it('pasa segundos a instantes y no se sale de la línea de tiempo', () => {
    expect(instanteDe(10, 0.25, 1000)).toBe(40);
    expect(instanteDe(1e9, 0.25, 1000)).toBe(999);
    expect(instanteDe(-5, 0.25, 1000)).toBe(0);
    expect(instanteDe(Number.POSITIVE_INFINITY, 0.25, 1000)).toBe(999);
  });
});
