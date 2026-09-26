import { describe, expect, it } from 'vitest';
import { conFechasDeVerdad, isUpcoming, raceStart } from '@/lib/race-time';
import { yaTermino } from '@/lib/ultimo-resultado';

/**
 * Jolpica splits a session into a date-only field and a separate time, so
 * `Race.date` lands at midnight UTC. Reading it alone announced every grand
 * prix a day early and expired the countdown hours before the start.
 */
describe('raceStart', () => {
  it('combines the stored date with the session time', () => {
    const start = raceStart({ date: new Date('2026-08-23T00:00:00Z'), time: '13:00:00Z' });

    expect(start.toISOString()).toBe('2026-08-23T13:00:00.000Z');
  });

  it('accepts a time without the trailing Z', () => {
    const start = raceStart({ date: new Date('2026-08-23T00:00:00Z'), time: '13:00:00' });

    expect(start.toISOString()).toBe('2026-08-23T13:00:00.000Z');
  });

  it('falls back to the stored date when no time is recorded', () => {
    // Historical races often have no start time.
    const start = raceStart({ date: new Date('1994-05-01T00:00:00Z'), time: null });

    expect(start.toISOString()).toBe('1994-05-01T00:00:00.000Z');
  });

  it('falls back rather than returning an invalid date', () => {
    const start = raceStart({ date: new Date('2026-08-23T00:00:00Z'), time: 'not a time' });

    expect(Number.isNaN(start.getTime())).toBe(false);
    expect(start.toISOString()).toBe('2026-08-23T00:00:00.000Z');
  });
});

describe('isUpcoming', () => {
  const race = { date: new Date('2026-08-23T00:00:00Z'), time: '13:00:00Z' };

  it('is still upcoming during the morning of race day', () => {
    // The whole point: at 09:00 UTC the race has not started, even though the
    // stored date (midnight) is already in the past.
    expect(isUpcoming(race, new Date('2026-08-23T09:00:00Z'))).toBe(true);
  });

  it('is no longer upcoming once the start time passes', () => {
    expect(isUpcoming(race, new Date('2026-08-23T13:30:00Z'))).toBe(false);
  });

  it('is upcoming on previous days', () => {
    expect(isUpcoming(race, new Date('2026-08-21T18:00:00Z'))).toBe(true);
  });
});

describe('conFechasDeVerdad', () => {
  /**
   * La fila tal y como vuelve de `unstable_cache`: fechas serializadas a
   * cadena. Es lo que rompió la portada dos veces.
   */
  const deLaCache = {
    year: 2026,
    round: 15,
    raceName: 'Azerbaijan Grand Prix',
    date: '2026-09-26T00:00:00.000Z',
    time: '11:00:00Z',
    qualiDate: '2026-09-25T12:00:00.000Z',
  };

  it('reproduce el fallo: sin rehidratar, raceStart revienta', () => {
    // @ts-expect-error justo lo que pasaba: una cadena donde se espera un Date.
    expect(() => raceStart(deLaCache)).toThrow(TypeError);
  });

  it('devuelve las fechas a ser fechas, y raceStart vuelve a funcionar', () => {
    const fila = conFechasDeVerdad(deLaCache);

    expect(fila.date).toBeInstanceOf(Date);
    expect(fila.qualiDate).toBeInstanceOf(Date);
    expect(raceStart(fila as never).toISOString()).toBe('2026-09-26T11:00:00.000Z');
  });

  it('no toca lo que ya era una fecha, ni los campos ausentes', () => {
    const fecha = new Date('2026-09-26T00:00:00.000Z');
    const fila = conFechasDeVerdad({ date: fecha, time: null });

    expect(fila.date).toBe(fecha);
    expect(fila.time).toBeNull();
  });

  /**
   * El caso concreto del 2026-09-26: la fila de «la última que ya corrió» solo
   * se mira cuando esa carrera no tiene resultados, así que el fallo llevaba
   * latente desde el arreglo anterior y salió el día del GP de Azerbaiyán.
   */
  it('deja lista la fila de la última corrida para yaTermino', () => {
    const fila = conFechasDeVerdad(deLaCache);

    expect(yaTermino(fila as never, new Date('2026-09-26T18:00:00Z'))).toBe(true);
    expect(yaTermino(fila as never, new Date('2026-09-26T12:00:00Z'))).toBe(false);
  });
});
