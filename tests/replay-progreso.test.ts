import { describe, expect, it } from 'vitest';
import { SIN_DATO, leerBloque } from '@/lib/replay/bloque';
import { relojDeCarrera } from '@/lib/replay/estados';
import {
  INSTANTES_QUIETO,
  calcularProgreso,
  estaFuera,
  huecoEn,
  ordenEn,
  prepararTrazado,
  puntoMasCercano,
  vueltaEn,
} from '@/lib/replay/progreso';
import type { TrackPoint } from '@/types';

/**
 * El orden del leaderboard y los huecos salen de proyectar cada coche sobre
 * el trazado. Es la parte que se equivocó en el mockup —todos con el mismo
 * hueco— y por eso aquí se prueba con un circuito de mentira donde todo se
 * puede calcular a mano.
 */

/** Un circuito circular de 1000 dm de radio: 100 puntos, ~6283 dm de vuelta. */
const RADIO = 1000;
const PUNTOS = 100;
const CIRCULO: TrackPoint[] = Array.from({ length: PUNTOS }, (_, i) => {
  const a = (i / PUNTOS) * Math.PI * 2;
  return { x: Math.cos(a) * RADIO, y: Math.sin(a) * RADIO, speed: 200, distance: (i / PUNTOS) * 2 * Math.PI * RADIO };
});
const L = CIRCULO[PUNTOS - 1].distance!;

/** Un coche que da vueltas al círculo a `metrosPorInstante`, empezando en `desde` metros. */
function coche(count: number, desde: number, metrosPorInstante: number): [number[], number[]] {
  const xs: number[] = [], ys: number[] = [];
  for (let k = 0; k < count; k++) {
    const d = (desde + k * metrosPorInstante) % (2 * Math.PI * RADIO);
    const a = d / RADIO;
    xs.push(Math.round(Math.cos(a) * RADIO));
    ys.push(Math.round(Math.sin(a) * RADIO));
  }
  return [xs, ys];
}

function bloqueDe(coches: [number[], number[]][]) {
  const count = coches[0][0].length;
  const datos = new Int16Array(coches.length * 2 * count);
  coches.forEach(([xs, ys], i) => { datos.set(xs, i * 2 * count); datos.set(ys, i * 2 * count + count); });
  return leerBloque(datos.buffer, coches.length, count);
}

const trazado = prepararTrazado(CIRCULO);

describe('el trazado', () => {
  it('encuentra el punto más cercano por la rejilla', () => {
    expect(puntoMasCercano(trazado, RADIO, 0)).toBe(0);
    expect(puntoMasCercano(trazado, 0, RADIO)).toBe(25);
    // Lejos de todo: se mira entero y sigue acertando.
    expect(puntoMasCercano(trazado, 5000, 0)).toBe(0);
  });

  it('sabe cuánto mide una vuelta', () => {
    expect(trazado.longitud).toBeCloseTo(L, 6);
  });
});

describe('el progreso', () => {
  it('sigue sumando al cruzar la meta en vez de volver a cero', () => {
    // 200 instantes a 50 dm: 10 000 dm, o sea una vuelta y media.
    const b = bloqueDe([coche(200, 0, 50)]);
    const [p] = calcularProgreso(b, trazado);

    expect(p[0]).toBeCloseTo(0, 0);
    expect(p[199]).toBeGreaterThan(L);
    expect(vueltaEn([p], 0, 199, L)).toBe(2);
    // Monótono de principio a fin.
    for (let k = 1; k < 200; k++) expect(p[k]).toBeGreaterThanOrEqual(p[k - 1]);
  });

  it('en la parrilla, estar detrás de la meta no cuenta como vuelta hecha', () => {
    // Arranca 300 dm ANTES de la meta, o sea al final del trazado.
    const b = bloqueDe([coche(40, L - 300, 50)]);
    const [p] = calcularProgreso(b, trazado);

    expect(p[0]).toBeLessThan(0);
    expect(vueltaEn([p], 0, 0, L)).toBe(1);
    expect(vueltaEn([p], 0, 39, L)).toBe(1);
  });

  it('sin dato es NaN, y se retoma sin inventar una vuelta', () => {
    const [xs, ys] = coche(20, 0, 50);
    xs[5] = SIN_DATO; ys[5] = SIN_DATO;
    const [p] = calcularProgreso(bloqueDe([[xs, ys]]), trazado);

    expect(Number.isNaN(p[5])).toBe(true);
    // El trazado de prueba tiene un punto cada 62,8 dm: la proyección es a
    // esa resolución, no al decímetro.
    expect(Math.abs(p[6] - 300)).toBeLessThan(40);
  });

  it('cuenta la vuelta aunque la meta se cruce durante un hueco sin datos', () => {
    // 140 instantes a 50 dm cruzan la meta hacia el 126. El hueco tapa justo
    // ese momento: borrar la referencia anterior dejaba el progreso plano una
    // vuelta entera, y con él al coche marcado como retirado sin estarlo.
    const [xs, ys] = coche(140, 0, 50);
    for (let k = 122; k <= 130; k++) { xs[k] = SIN_DATO; ys[k] = SIN_DATO; }
    const [p] = calcularProgreso(bloqueDe([[xs, ys]]), trazado);

    expect(vueltaEn([p], 0, 139, L)).toBe(2);
    expect(p[139]).toBeGreaterThan(L);
  });
});

describe('el orden y los huecos', () => {
  // Tres coches a 50 dm por instante: el líder sale en 0, los otros 200 y 500 dm detrás.
  const b = bloqueDe([coche(100, -500, 50), coche(100, 0, 50), coche(100, -200, 50)]);
  const progreso = calcularProgreso(b, trazado);

  it('ordena por metros recorridos, no por índice', () => {
    expect(ordenEn(progreso, 50)).toEqual([1, 2, 0]);
  });

  it('el hueco es cuánto antes pasó el líder por ahí, y es distinto para cada uno', () => {
    // A 50 dm por instante, 200 dm son 4 instantes y 500 dm son 10.
    const paso = 0.25;
    expect(huecoEn(progreso, 50, 1, 2, paso)).toBeCloseTo(4 * paso, 5);
    expect(huecoEn(progreso, 50, 1, 0, paso)).toBeCloseTo(10 * paso, 5);
    expect(huecoEn(progreso, 50, 1, 1, paso)).toBe(0);
  });

  it('si el líder nunca estuvo por detrás, el hueco es todo lo corrido', () => {
    // Un coche tan lento que a los veinte instantes sigue detrás de la meta:
    // el líder ya iba delante en la salida, así que no hay instante anterior
    // que encontrar. La bisección tiene que decirlo en vez de dar cero.
    const lentos = bloqueDe([coche(40, 0, 50), coche(40, -500, 5)]);
    const p = calcularProgreso(lentos, trazado);

    expect(p[1][20]).toBeLessThan(p[0][0]);
    expect(huecoEn(p, 20, 0, 1, 0.25)).toBeCloseTo(20 * 0.25, 5);
  });

  it('con la carrera parada el hueco crece, y por eso la pantalla lo oculta', () => {
    // Bandera roja: veinte instantes rodando y ochenta clavados. El instante
    // en que el líder pasó por ahí se queda atrás mientras el reloj sigue, así
    // que la cuenta engorda sin que nadie se mueva. No hay forma de arreglarlo
    // aquí —con todos quietos no hay distancia en pista que medir— y por eso
    // `ReplayClient` enseña «—» mientras dura la bandera.
    const parados: [number[], number[]][] = [coche(100, 0, 50), coche(100, -200, 50)];
    for (const [xs, ys] of parados) for (let k = 20; k < 100; k++) { xs[k] = xs[19]; ys[k] = ys[19]; }
    const p = calcularProgreso(bloqueDe(parados), trazado);

    const alPararse = huecoEn(p, 20, 0, 1, 0.25);
    const alFinal = huecoEn(p, 99, 0, 1, 0.25);

    expect(alPararse).toBeLessThan(2);
    expect(alFinal).toBeGreaterThan(alPararse + 15);
  });

  /**
   * La captura del usuario: la píldora decía PISTA LIBRE y toda la parrilla
   * marcaba +1416 s —veintitrés minutos y medio— repartidos en un rango de
   * solo quince segundos. Ese desplazamiento constante era la parada por
   * bandera roja, metida entera en el hueco de todos.
   */
  it('una bandera roja no se mete en los huecos, ni durante ni después', () => {
    const PASO = 0.25;
    const COUNT = 400;
    // Ciento veinte instantes rodando, ochenta parados, y el resto rodando
    // otra vez. La bandera no puede caer antes: el líder arranca por delante,
    // así que hasta que el de atrás no llega a donde el líder empezó no hay
    // «cuándo pasó por aquí» que buscar, y `huecoEn` devuelve todo lo corrido.
    const PARA = 120;
    const SIGUE = 200;
    const parado = (desde: number): [number[], number[]] => {
      const [xs, ys] = coche(COUNT, desde, 50);
      for (let k = PARA; k < SIGUE; k++) { xs[k] = xs[PARA - 1]; ys[k] = ys[PARA - 1]; }
      // Y al reanudar, siguen desde donde se quedaron.
      for (let k = SIGUE; k < COUNT; k++) {
        const d = (desde + (PARA - 1 + (k - SIGUE + 1)) * 50) % (2 * Math.PI * RADIO);
        const a = d / RADIO;
        xs[k] = Math.round(Math.cos(a) * RADIO);
        ys[k] = Math.round(Math.sin(a) * RADIO);
      }
      return [xs, ys];
    };

    // Los dos arrancan ya dentro de la vuelta —un desplazamiento negativo
    // proyecta al final del círculo y el de atrás saldría por delante— y el
    // de atrás va a 2000 dm: cuarenta instantes, diez segundos.
    //
    // El tamaño del hueco importa: la inflación dura mientras el coche no ha
    // pasado del progreso que el líder tenía al pararse, o sea más o menos lo
    // que mide el propio hueco. En la carrera real eran quince segundos, y por
    // eso la captura lo pilló.
    const p = calcularProgreso(bloqueDe([parado(3000), parado(1000)]), trazado);
    const reloj = relojDeCarrera(
      [
        { status: '1', start: 0, end: PARA * PASO },
        { status: '5', start: PARA * PASO, end: SIGUE * PASO },
        { status: '1', start: SIGUE * PASO, end: COUNT * PASO },
      ],
      COUNT,
      PASO
    );

    const antes = huecoEn(p, PARA - 1, 0, 1, PASO, reloj);
    expect(antes).toBeCloseTo(10, 0);

    // Sin el reloj, el hueco se traga los veinte segundos de parada. Se mide
    // recién reanudada —instante 120, veinte después del verde— que es donde
    // estaba la captura: la píldora ya decía PISTA LIBRE y la parrilla seguía
    // marcando la parada entera.
    const sinReloj = huecoEn(p, SIGUE + 20, 0, 1, PASO);
    expect(sinReloj).toBeGreaterThan(antes + 15);

    // Con él, el mismo hueco en los tres momentos: antes de la bandera, recién
    // reanudada y mucho después.
    for (const instante of [PARA - 1, SIGUE + 20, 350]) {
      expect(Math.abs(huecoEn(p, instante, 0, 1, PASO, reloj) - antes)).toBeLessThanOrEqual(PASO * 3);
    }
  });

  it('sin reloj se comporta como siempre', () => {
    // El reloj es opcional a propósito: quien no lo pasa obtiene exactamente
    // el mismo número de antes, y eso es lo que hace que este cambio no pueda
    // romper nada que ya funcionara.
    const p = calcularProgreso(bloqueDe([coche(100, 0, 50), coche(100, -200, 50)]), trazado);
    const todoCorre = relojDeCarrera([{ status: '1', start: 0, end: 100 * 0.25 }], 100, 0.25);
    expect(huecoEn(p, 50, 0, 1, 0.25, todoCorre)).toBeCloseTo(huecoEn(p, 50, 0, 1, 0.25), 10);
  });

  it('el hueco sobrevive al cruce de meta del líder', () => {
    // El líder cruza la meta hacia el instante 126; en el 150 los huecos
    // siguen siendo los de siempre. Era justo lo que fallaba con los cruces.
    const largo = bloqueDe([coche(200, -500, 50), coche(200, 0, 50), coche(200, -200, 50)]);
    const p = calcularProgreso(largo, trazado);
    // Con un instante de tolerancia, que es la resolución del trazado de
    // prueba. El fallo que se busca daba el MISMO hueco a los dos.
    expect(Math.abs(huecoEn(p, 150, 1, 2, 0.25) - 1)).toBeLessThanOrEqual(0.25);
    expect(Math.abs(huecoEn(p, 150, 1, 0, 0.25) - 2.5)).toBeLessThanOrEqual(0.25);
  });
});

describe('quedarse fuera', () => {
  const count = INSTANTES_QUIETO + 40;

  it('un minuto quieto mientras el líder avanza es estar fuera', () => {
    const [xs, ys] = coche(count, -200, 50);
    for (let k = 20; k < count; k++) { xs[k] = xs[19]; ys[k] = ys[19]; }
    const progreso = calcularProgreso(bloqueDe([coche(count, 0, 50), [xs, ys]]), trazado);

    expect(estaFuera(progreso, 1, count - 1, 0)).toBe(true);
    // Antes de que pase el minuto, todavía no.
    expect(estaFuera(progreso, 1, 30, 0)).toBe(false);
  });

  it('con bandera roja se paran todos y nadie está fuera', () => {
    const parados: [number[], number[]][] = [coche(count, 0, 50), coche(count, -200, 50)];
    for (const [xs, ys] of parados) for (let k = 20; k < count; k++) { xs[k] = xs[19]; ys[k] = ys[19]; }
    const progreso = calcularProgreso(bloqueDe(parados), trazado);

    expect(estaFuera(progreso, 1, count - 1, 0)).toBe(false);
  });

  it('sin posición es estar fuera', () => {
    const [xs, ys] = coche(count, -200, 50);
    xs[count - 1] = SIN_DATO;
    const progreso = calcularProgreso(bloqueDe([coche(count, 0, 50), [xs, ys]]), trazado);

    expect(estaFuera(progreso, 1, count - 1, 0)).toBe(true);
  });
});
