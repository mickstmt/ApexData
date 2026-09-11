import { describe, expect, it } from 'vitest';
import {
  TINTA,
  claseDeEstado,
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

  it('el degradado lleva paradas duras, no fundidos', () => {
    const css = degradadoDelScrubber(tramosDelScrubber(TRAMOS, 300), '#333');
    expect(css.startsWith('linear-gradient(90deg, #333 0%')).toBe(true);
    // La amarilla empieza y acaba en el mismo porcentaje que el gris que la rodea.
    expect(css).toContain(`#333 29.33%, ${TINTA.amarilla} 29.33%`);
    expect(css).toContain(`${TINTA.amarilla} 39.87%, #333 39.87%`);
  });
});
