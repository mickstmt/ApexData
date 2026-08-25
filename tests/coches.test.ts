import { describe, expect, it } from 'vitest';
import { cocheDe, TEMPORADA_DE_LOS_COCHES } from '@/lib/coches';
import { TEAM_IDS } from '@/lib/team-colors';

/**
 * Qué escuderías tienen coche, y qué pasa con las que no.
 *
 * La base guarda unas cuarenta entre actuales e históricas; solo once tienen
 * imagen. Que su ausencia sea una decisión y no un hueco es justo lo que estas
 * pruebas fijan.
 */

describe('el coche de un equipo', () => {
  it('da las dos anchuras en los dos formatos', () => {
    const coche = cocheDe('ferrari');

    expect(coche).not.toBeNull();
    expect(coche!.avif.ancho).toBe(`/images/cars/ferrari-${TEMPORADA_DE_LOS_COCHES}.avif`);
    expect(coche!.avif.estrecho).toBe(`/images/cars/ferrari-${TEMPORADA_DE_LOS_COCHES}@517.avif`);
    expect(coche!.webp.ancho).toBe(`/images/cars/ferrari-${TEMPORADA_DE_LOS_COCHES}.webp`);
  });

  it('trae las medidas del lienzo, para reservar el hueco', () => {
    // Sin esto, once bandas cargando en diferido son once saltos de maquetación
    // mientras se baja por la rejilla.
    const coche = cocheDe('mclaren')!;

    expect(coche.ancho).toBe(1034);
    expect(coche.alto).toBe(298);
    expect(coche.ancho / coche.alto).toBeCloseTo(3.47, 2);
  });

  it('las once escuderías de 2026 tienen coche', () => {
    const parrilla = [
      'alpine', 'aston_martin', 'audi', 'cadillac', 'ferrari', 'haas',
      'mclaren', 'mercedes', 'rb', 'red_bull', 'williams',
    ];

    for (const id of parrilla) {
      expect(cocheDe(id), id).not.toBeNull();
    }
  });

  it('una escudería histórica no tiene, y eso no es un fallo', () => {
    // El componente no dibuja nada: una caja de «imagen no disponible» para un
    // recurso decorativo es peor que su ausencia.
    expect(cocheDe('alfa')).toBeNull();
    expect(cocheDe('sauber')).toBeNull();
    expect(cocheDe('alphatauri')).toBeNull();
  });

  it('sin equipo, ni se intenta', () => {
    expect(cocheDe(null)).toBeNull();
    expect(cocheDe(undefined)).toBeNull();
    expect(cocheDe('equipo-inventado')).toBeNull();
  });

  it('la mayoría de las escuderías de la base NO tiene, y por eso la lista es explícita', () => {
    // Si algún día esto se acercara al total, tocaría replantear el respaldo.
    const conCoche = TEAM_IDS.filter((id) => cocheDe(id) !== null);

    expect(conCoche.length).toBe(11);
    expect(TEAM_IDS.length).toBeGreaterThan(20);
  });
});
