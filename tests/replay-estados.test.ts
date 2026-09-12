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
