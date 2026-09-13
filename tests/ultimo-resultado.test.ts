import { describe, expect, it } from 'vitest';
import { esperandoResultados, yaTermino } from '@/lib/ultimo-resultado';

/**
 * «Último resultado» cuando la carrera más nueva ya corrió y sus resultados no
 * han llegado.
 *
 * Lo reportado: a las cuatro horas del GP de España 2026 la portada decía
 * «próxima carrera: Azerbaiyán» y debajo «último resultado: Italian Grand
 * Prix», mientras el usuario ya tenía en el teléfono nuestro aviso diciendo
 * quién había ganado en España. Comprobado entonces: la ronda 14 con 0
 * resultados, la 13 como última con resultados, y Jolpica sin publicar nada.
 */

const ESPANA = {
  year: 2026,
  round: 14,
  date: new Date('2026-09-13T00:00:00Z'),
  time: '13:00:00Z',
};
const ITALIA = { year: 2026, round: 13 };

describe('cuándo se da por terminada una carrera', () => {
  it('se compone la hora, no se mira la fecha a secas', () => {
    // `Race.date` cae a medianoche porque Jolpica guarda día y hora por
    // separado: mirándola sola, la carrera se daría por corrida desde las 00:00.
    expect(yaTermino(ESPANA, new Date('2026-09-13T01:00:00Z'))).toBe(false);
    expect(yaTermino(ESPANA, new Date('2026-09-13T13:30:00Z'))).toBe(false);
  });

  it('tres horas después de la salida, seguro que acabó', () => {
    expect(yaTermino(ESPANA, new Date('2026-09-13T15:59:00Z'))).toBe(false);
    expect(yaTermino(ESPANA, new Date('2026-09-13T16:00:00Z'))).toBe(true);
    expect(yaTermino(ESPANA, new Date('2026-09-13T19:00:00Z'))).toBe(true);
  });
});

describe('si toca decir «resultados en camino»', () => {
  const ahora = new Date('2026-09-13T19:00:00Z'); // cuatro horas después

  it('sí: la más nueva ya corrió, no tiene resultados, y es posterior', () => {
    expect(esperandoResultados({ ...ESPANA, resultados: 0 }, ITALIA, ahora)).toBe(true);
  });

  it('no, si ya llegaron', () => {
    expect(esperandoResultados({ ...ESPANA, resultados: 22 }, ITALIA, ahora)).toBe(false);
  });

  it('no, mientras la carrera se está corriendo', () => {
    const durante = new Date('2026-09-13T13:45:00Z');
    expect(esperandoResultados({ ...ESPANA, resultados: 0 }, ITALIA, durante)).toBe(false);
  });

  it('no, si la que tiene resultados es la misma o más nueva', () => {
    expect(
      esperandoResultados({ ...ESPANA, resultados: 0 }, { year: 2026, round: 14 }, ahora)
    ).toBe(false);
    expect(
      esperandoResultados({ ...ESPANA, resultados: 0 }, { year: 2026, round: 15 }, ahora)
    ).toBe(false);
  });

  it('cruza bien el cambio de año', () => {
    const enero = {
      year: 2027,
      round: 1,
      date: new Date('2027-03-07T00:00:00Z'),
      time: '15:00:00Z',
      resultados: 0,
    };
    const ahoraEnero = new Date('2027-03-07T19:00:00Z');
    expect(esperandoResultados(enero, { year: 2026, round: 24 }, ahoraEnero)).toBe(true);
  });

  it('sin ninguna con resultados, basta con que la última ya corriera', () => {
    expect(esperandoResultados({ ...ESPANA, resultados: 0 }, null, ahora)).toBe(true);
  });

  it('sin carreras, no dice nada', () => {
    expect(esperandoResultados(null, ITALIA, ahora)).toBe(false);
  });
});
