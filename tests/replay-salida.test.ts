import { describe, expect, it } from 'vitest';
import { arranques, ordenEn } from '@/lib/replay/progreso';

/**
 * Quién va delante en la salida, con alguien esperando en el pit lane.
 *
 * Lo reportado por el usuario en el GP de España 2026: BEA salió desde el pit
 * lane y **el replay lo daba por líder desde el primer segundo**. No era un
 * fallo de la proyección — el pit lane está físicamente por delante de la línea
 * de meta, así que proyectarlo sobre el trazado da un número mayor que el de
 * toda la parrilla.
 *
 * Medido con los datos reales: BEA proyectaba en el metro **549** con la
 * parrilla entre el 23 y el 170, y figuraba primero **doce segundos**. Y lo
 * mismo pasaba, un instante, en Italia, Países Bajos y Hungría con el coche que
 * arrancaba más tarde.
 */

const COUNT = 400;

/**
 * Una salida de juguete.
 *
 * `arranqueDe` dice en qué instante empieza a moverse cada coche, y `salidaDe`
 * dónde está proyectado al principio. El del pit lane sale **por delante en
 * metros** y **mucho más tarde**, que es justo la combinación del fallo.
 */
const RITMO = 4; // decímetros por instante, para que la parrilla tarde en
// pasar por delante del pit lane como pasa de verdad: en España fueron doce
// segundos desde la salida hasta que el ultimo rebasaba el metro 549.

function salida(coches: { arranque: number; desde: number }[]) {
  return coches.map(({ arranque, desde }) => {
    const suyo = new Float64Array(COUNT);
    for (let k = 0; k < COUNT; k++) {
      suyo[k] = k < arranque ? desde : desde + (k - arranque + 1) * RITMO;
    }
    return suyo;
  });
}

describe('cuándo arranca cada coche', () => {
  it('encuentra el primer movimiento de cada uno', () => {
    const progreso = salida([
      { arranque: 5, desde: 170 },
      { arranque: 12, desde: 23 },
      { arranque: 80, desde: 549 }, // el del pit lane
    ]);

    // Tres instantes después de empezar a rodar, no en el mismo: a 4 dm por
    // instante hacen falta tres para pasar el listón de un metro. Es el precio
    // de no confundir un temblor de la proyección con una salida.
    expect(Array.from(arranques(progreso))).toEqual([7, 14, 82]);
  });

  it('quien no se mueve nunca se marca con -1', () => {
    const quieto = new Float64Array(COUNT).fill(100);
    expect(arranques([quieto])[0]).toBe(-1);
  });

  it('no cuenta como arranque un temblor de la proyección', () => {
    const tiembla = new Float64Array(COUNT);
    for (let k = 0; k < COUNT; k++) tiembla[k] = 100 + (k < 200 ? 0 : 3);
    // Tres decímetros no son un arranque; el listón es un metro.
    expect(arranques([tiembla])[0]).toBe(-1);
  });
});

describe('el que sale desde el pit lane', () => {
  const progreso = salida([
    { arranque: 5, desde: 170 }, // 0 · primero de la parrilla
    { arranque: 7, desde: 116 }, // 1
    { arranque: 12, desde: 23 }, // 2 · último de la parrilla
    { arranque: 80, desde: 549 }, // 3 · espera en el pit lane, y por delante
  ]);
  const arrancados = arranques(progreso);

  it('sin la regla, figura líder desde el primer instante', () => {
    // El comportamiento de antes, para que se vea qué se está arreglando.
    expect(ordenEn(progreso, 0)[0]).toBe(3);
    expect(ordenEn(progreso, 40)[0]).toBe(3);
  });

  it('con la regla, sale último desde el instante cero', () => {
    const orden = ordenEn(progreso, 0, arrancados);
    expect(orden[orden.length - 1], 'el del pit lane debería ir el último').toBe(3);
    // Y los de la parrilla, en su orden de siempre.
    expect(orden.slice(0, 3)).toEqual([0, 1, 2]);
  });

  it('sigue detrás mientras espera, aunque tenga más metros', () => {
    for (const k of [10, 30, 50]) {
      const orden = ordenEn(progreso, k, arrancados);
      expect(orden[orden.length - 1], `en el instante ${k}`).toBe(3);
    }
  });

  it('cuando arranca deja de estar penalizado y manda lo que corre', () => {
    // Ya rodando, el orden vuelve a ser el de los metros y nada lo tuerce.
    const tarde = ordenEn(progreso, COUNT - 1, arrancados);
    const soloMetros = ordenEn(progreso, COUNT - 1);
    expect(tarde).toEqual(soloMetros);
  });
});

describe('la holgura de cinco segundos', () => {
  it('quien sale con la parrilla cuenta desde el instante cero', () => {
    // Medido en España: la parrilla se pone en marcha entre 1,3 y 3,0 s, y el
    // del pit lane a los 20. Sin holgura, en el instante cero no se ha movido
    // NADIE y el desempate vuelve a los metros — con el del pit lane delante.
    const progreso = salida([
      { arranque: 12, desde: 23 }, // tarda 3 s, pero está en la parrilla
      { arranque: 80, desde: 549 }, // el del pit lane
    ]);
    const orden = ordenEn(progreso, 0, arranques(progreso));
    expect(orden).toEqual([0, 1]);
  });

  it('el de la parrilla que se cala se queda detrás, que es lo correcto', () => {
    const calado = new Float64Array(COUNT).fill(170);
    const rodando = new Float64Array(COUNT);
    for (let k = 0; k < COUNT; k++) rodando[k] = 23 + Math.max(0, k - 5) * RITMO;

    const progreso = [calado, rodando];
    const orden = ordenEn(progreso, 100, arranques(progreso));
    expect(orden).toEqual([1, 0]);
  });
});
