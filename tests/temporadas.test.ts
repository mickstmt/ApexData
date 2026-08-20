import { describe, expect, it } from 'vitest';
import {
  PRIMERA_TEMPORADA,
  anosPedidos,
  temporadas,
} from '../scripts/seed/temporadas';

/**
 * El módulo es puro a propósito —no importa Prisma ni toca la red— para que
 * pueda entrar en esta suite: es lo único que se puede comprobar del sembrador
 * sin pedirle mil setecientas peticiones a Jolpica.
 */

describe('temporadas', () => {
  it('cubre desde la primera temporada del proyecto hasta el año que se le diga', () => {
    expect(temporadas(2026)).toHaveLength(2026 - PRIMERA_TEMPORADA + 1);
    expect(temporadas(2026)[0]).toBe(PRIMERA_TEMPORADA);
    expect(temporadas(2026).at(-1)).toBe(2026);
  });

  it('son 17 en 2026, que es lo que hay en producción', () => {
    expect(temporadas(2026)).toHaveLength(17);
  });

  it('crece sola al cambiar de año, sin tocar el código', () => {
    expect(temporadas(2027)).toHaveLength(18);
    expect(temporadas(2027).at(-1)).toBe(2027);
  });
});

describe('anosPedidos', () => {
  it('con --todas devuelve la cobertura entera: es el fallo que arregla', () => {
    // `seed:all` llevaba «2023 2024 2025 2026» escrito a mano, así que el
    // comando documentado para reconstruir la base solo reproducía 4 de 17.
    expect(anosPedidos(['--todas'], 2026)).toHaveLength(17);
    expect(anosPedidos(['--all'], 2026)).toHaveLength(17);
  });

  it('con --current, solo el año en curso', () => {
    expect(anosPedidos(['--current'], 2026)).toEqual([2026]);
  });

  it('respeta los años sueltos que se le pasen', () => {
    expect(anosPedidos(['2021', '2022'], 2026)).toEqual([2021, 2022]);
  });

  it('descarta lo que no es un año, en vez de sembrar un NaN', () => {
    expect(anosPedidos(['pepe', '1800', '2024'], 2026)).toEqual([2024]);
  });

  it('sin argumentos no devuelve nada, para que el script explique su uso', () => {
    expect(anosPedidos([], 2026)).toEqual([]);
  });
});
