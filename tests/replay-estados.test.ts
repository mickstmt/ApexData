import { describe, expect, it } from 'vitest';
import {
  claseDeEstado,
  relojDeCarrera,
  degradadoDelScrubber,
  estadoEn,
  nombreDeEstado,
  tramosDelScrubber,
} from '@/lib/replay/estados';

const TRAMOS = [
  { status: '1', start: 0, end: 88 },
  { status: '2', start: 88, end: 119.62 },
  { status: '5', start: 119.62, end: 271.27 },
  { status: '7', start: 271.27, end: 300 },
];

describe('el estado en un instante', () => {
  it('el vigente, por sus bordes', () => {
    expect(estadoEn(TRAMOS, 0)).toBe('libre');
    expect(estadoEn(TRAMOS, 87.99)).toBe('libre');
    expect(estadoEn(TRAMOS, 88)).toBe('amarilla');
    expect(estadoEn(TRAMOS, 119.62)).toBe('roja');
    expect(estadoEn(TRAMOS, 280)).toBe('vsc');
  });

  it('fuera de todo tramo, pista libre', () => {
    expect(estadoEn(TRAMOS, 999)).toBe('libre');
    expect(estadoEn([], 10)).toBe('libre');
  });

  it('los códigos de FastF1 tienen nombre, y el desconocido es pista libre', () => {
    expect(nombreDeEstado(claseDeEstado('4'))).toBe('Safety car');
    expect(nombreDeEstado(claseDeEstado('6'))).toBe('Virtual safety car');
    expect(claseDeEstado('99')).toBe('libre');
  });
});

describe('el scrubber', () => {
  it('pinta solo lo que no es pista libre, en porcentaje', () => {
    const tramos = tramosDelScrubber(TRAMOS, 300);

    expect(tramos.map((t) => t.clase)).toEqual(['amarilla', 'roja', 'vsc']);
    expect(tramos[0].desde).toBeCloseTo(29.33, 2);
    expect(tramos[0].hasta).toBeCloseTo(39.87, 2);
    expect(tramos[2].hasta).toBe(100);
  });

  it('descarta lo que no se vería', () => {
    expect(tramosDelScrubber([{ status: '2', start: 10, end: 10.5 }], 1000)).toEqual([]);
  });

  // La tinta la pone quien llama, no una tabla de dentro: el replay sigue el
  // tema de la app y en la pantalla de verdad llegan `var(--replay-*)`. Aquí
  // se pasan colores de mentira, que es justo lo que demuestra que a esta
  // función el tema le da igual.
  const TINTA = {
    libre: 'GRIS',
    amarilla: 'AMARILLA',
    sc: 'NARANJA',
    vsc: 'NARANJA',
    roja: 'ROJA',
  };

  it('el degradado lleva paradas duras, no fundidos', () => {
    const css = degradadoDelScrubber(tramosDelScrubber(TRAMOS, 300), '#333', TINTA);
    expect(css.startsWith('linear-gradient(90deg, #333 0%')).toBe(true);
    // La amarilla empieza y acaba en el mismo porcentaje que el gris que la rodea.
    expect(css).toContain(`#333 29.33%, ${TINTA.amarilla} 29.33%`);
    expect(css).toContain(`${TINTA.amarilla} 39.87%, #333 39.87%`);
  });

  it('la tinta que se le pasa es la que sale, sea cual sea', () => {
    const css = degradadoDelScrubber(tramosDelScrubber(TRAMOS, 300), 'var(--gris)', {
      ...TINTA,
      roja: 'var(--replay-roja)',
    });
    expect(css).toContain('var(--replay-roja) 39.87%');
    expect(css).toContain('var(--gris) 0%');
  });
});

describe('el reloj de la carrera', () => {
  const PASO = 0.25;

  it('sin banderas rojas, cuenta todos los instantes', () => {
    const reloj = relojDeCarrera([{ status: '1', start: 0, end: 25 }], 100, PASO);
    expect(reloj[0]).toBe(0);
    expect(reloj[99]).toBe(99);
  });

  it('se detiene con la bandera roja y sigue al reanudar', () => {
    // Cuarenta instantes verdes, cuarenta rojos, veinte verdes.
    const reloj = relojDeCarrera(
      [
        { status: '1', start: 0, end: 40 * PASO },
        { status: '5', start: 40 * PASO, end: 80 * PASO },
        { status: '1', start: 80 * PASO, end: 100 * PASO },
      ],
      100,
      PASO
    );

    expect(reloj[39]).toBe(39);
    // Durante la parada no avanza ni uno.
    expect(reloj[79]).toBe(reloj[40]);
    // Y al reanudar cuenta otra vez: veinte instantes más, no sesenta.
    expect(reloj[99] - reloj[79]).toBe(20);
  });

  it('el safety car y la amarilla SÍ cuentan: ahí se corre', () => {
    // Es la distinción que importa. Con coche de seguridad la carrera sigue
    // —más despacio, pero sigue— así que los huecos son huecos de verdad.
    const reloj = relojDeCarrera(
      [
        { status: '2', start: 0, end: 10 },
        { status: '4', start: 10, end: 20 },
        { status: '6', start: 20, end: 25 },
      ],
      100,
      PASO
    );
    expect(reloj[99]).toBe(99);
  });
});

describe('el reloj también ve una suspensión mal declarada', () => {
  const PASO_S = 0.25;

  /**
   * Una carrera de juguete con el caso real dentro.
   *
   * Reproduce lo que pasó en el GP de Italia de 2026: `track_status` declara
   * una roja corta, pero la carrera sigue detenida mucho más tiempo bajo un
   * estado que dice verde y amarilla. Medido en producción: 1819 s parados
   * frente a 103 declarados, y el delta de Hamilton pasaba de 16 s a 1223,8
   * sin que su distancia al líder cambiara un metro.
   */
  function carrera(): { tramos: { status: string; start: number; end: number }[]; progreso: Float64Array[] } {
    const count = 200;
    const lider = new Float64Array(count);
    const segundo = new Float64Array(count);

    for (let k = 1; k < count; k++) {
      // Parados de verdad entre los instantes 60 y 160, pero solo los 20
      // primeros están declarados como roja.
      const corriendo = k < 60 || k >= 160;
      lider[k] = lider[k - 1] + (corriendo ? 10 : 0);
      segundo[k] = segundo[k - 1] + (corriendo ? 10 : 0);
    }

    return {
      tramos: [
        { status: '1', start: 0, end: 60 * PASO_S },
        { status: '5', start: 60 * PASO_S, end: 80 * PASO_S },
        { status: '2', start: 80 * PASO_S, end: 160 * PASO_S },
        { status: '1', start: 160 * PASO_S, end: 200 * PASO_S },
      ],
      progreso: [lider, segundo],
    };
  }

  it('sin las posiciones, cuenta los cien instantes parados como carrera', () => {
    // El comportamiento anterior, que se deja fijado a propósito: es lo que
    // pasa cuando nadie le pasa el progreso, y explica de dónde salía el fallo.
    const { tramos } = carrera();
    const reloj = relojDeCarrera(tramos, 200, PASO_S);

    // De 60 a 160 hay 100 instantes parados; solo 20 están declarados rojos.
    expect(reloj[199] - reloj[59]).toBe(120);
  });

  it('con las posiciones, no cuenta ninguno de los cien', () => {
    const { tramos, progreso } = carrera();
    const reloj = relojDeCarrera(tramos, 200, PASO_S, progreso);

    // Solo los 40 instantes finales, que son los únicos en que alguien avanza.
    expect(reloj[199] - reloj[59]).toBe(40);
  });

  it('un coche parado no detiene el reloj si los demás ruedan', () => {
    // El miedo que hizo descartar esto la primera vez. No se mira un coche: se
    // mira si NINGUNO avanza, y uno en boxes no puede congelar la carrera.
    const count = 100;
    const rodando = new Float64Array(count);
    const enBoxes = new Float64Array(count);
    for (let k = 1; k < count; k++) {
      rodando[k] = rodando[k - 1] + 10;
      enBoxes[k] = k < 40 ? enBoxes[k - 1] + 10 : enBoxes[k - 1];
    }

    const reloj = relojDeCarrera([{ status: '1', start: 0, end: 100 * PASO_S }], count, PASO_S, [
      rodando,
      enBoxes,
    ]);

    expect(reloj[99]).toBe(99);
  });

  it('un hueco de datos no es una parada', () => {
    // Sin posiciones no se sabe si alguien avanzó, y no saber no es motivo
    // para congelar: eso encogería los huecos sin que nada lo dijera.
    const count = 60;
    const via = new Float64Array(count);
    for (let k = 1; k < count; k++) via[k] = via[k - 1] + 10;
    for (let k = 20; k < 30; k++) via[k] = Number.NaN;

    const reloj = relojDeCarrera([{ status: '1', start: 0, end: 60 * PASO_S }], count, PASO_S, [via]);

    expect(reloj[59]).toBe(59);
  });
});
