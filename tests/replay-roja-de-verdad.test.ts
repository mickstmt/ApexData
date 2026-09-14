import { describe, expect, it } from 'vitest';
import { conLaParadaDeVerdad, estadoEn, nombreDeEstado } from '@/lib/replay/estados';
import type { PositionsTrackStatus } from '@/types';

/**
 * La bandera roja dura lo que duró la parada, no lo que el dato llegó a
 * declarar.
 *
 * Lo reportó el usuario: en Italia 2026, con LEC fuera y todos los coches en el
 * garaje, **el indicador cambiaba a amarilla**. Su razonamiento es exacto: por
 * una amarilla nadie va al garaje.
 *
 * Los tramos reales de ese GP:
 *
 * ```
 *    252s ->  355s  ( 103s)  ROJA
 *    355s ->  371s  (  16s)  verde
 *    371s -> 1578s  (1208s)  AMARILLA
 * ```
 *
 * Veinte minutos de «amarilla» con la carrera detenida: la parada real fue de
 * 1819 segundos.
 */

const PASO = 0.25;

/** Los tramos de Italia 2026, tal y como vienen. */
const ITALIA: PositionsTrackStatus[] = [
  { status: '1', start: 0, end: 182 },
  { status: '4', start: 199, end: 252 },
  { status: '5', start: 252, end: 355 },
  { status: '1', start: 355, end: 371 },
  { status: '2', start: 371, end: 1578 },
  { status: '1', start: 1578, end: 2583 },
  { status: '6', start: 4454, end: 4560 },
  { status: '1', start: 4571, end: 6754 },
];

/** En instantes, como los devuelve `paradasDeLaCarrera`. */
const enInstantes = (desde: number, hasta: number) => ({
  desde: Math.round(desde / PASO),
  hasta: Math.round(hasta / PASO),
});

const comoSeVe = (tramos: PositionsTrackStatus[], t: number) =>
  nombreDeEstado(estadoEn(tramos, t));

describe('la roja se alarga hasta que la carrera reanuda', () => {
  const corregidos = conLaParadaDeVerdad(ITALIA, [enInstantes(252, 2131)], PASO);

  it('los veinte minutos de «amarilla» pasan a ser lo que eran', () => {
    for (const t of [400, 700, 1200, 1500, 2000]) {
      expect(comoSeVe(ITALIA, t), `antes, en ${t}s`).not.toBe('Bandera roja');
      expect(comoSeVe(corregidos, t), `ahora, en ${t}s`).toBe('Bandera roja');
    }
  });

  it('lo de antes de la roja no se toca', () => {
    expect(comoSeVe(corregidos, 100)).toBe(comoSeVe(ITALIA, 100));
    expect(comoSeVe(corregidos, 220)).toBe('Safety car');
  });

  it('lo de después tampoco: el coche de seguridad virtual sigue ahí', () => {
    expect(comoSeVe(corregidos, 4500)).toBe('Virtual safety car');
    expect(comoSeVe(corregidos, 5000)).toBe('Pista libre');
  });

  it('no deja huecos ni solapes', () => {
    for (let i = 1; i < corregidos.length; i++) {
      expect(corregidos[i].start, `el tramo ${i} se solapa con el anterior`).toBeGreaterThanOrEqual(
        corregidos[i - 1].end
      );
    }
  });
});

describe('lo que NO se toca, que es lo que respeta el vocabulario', () => {
  it('una parada de parrilla no es una bandera roja', () => {
    // En Italia se detectan TRES detenciones: la de la roja y las **dos paradas
    // de parrilla del relanzamiento**, a 37:49 y 41:08. Ahí no hay ninguna
    // bandera roja que enseñar, y pintarla sería inventarse una.
    const conParadasDeParrilla = conLaParadaDeVerdad(
      ITALIA,
      [enInstantes(2269, 2340), enInstantes(2468, 2534)],
      PASO
    );

    expect(comoSeVe(conParadasDeParrilla, 2300)).toBe(comoSeVe(ITALIA, 2300));
    expect(comoSeVe(conParadasDeParrilla, 2500)).toBe(comoSeVe(ITALIA, 2500));
    expect(comoSeVe(conParadasDeParrilla, 2300)).not.toBe('Bandera roja');
  });

  it('sin paradas detectadas, los tramos salen tal cual', () => {
    expect(conLaParadaDeVerdad(ITALIA, [], PASO)).toBe(ITALIA);
  });

  it('sin ninguna roja declarada, no se inventa una', () => {
    const sinRoja = ITALIA.filter((t) => t.status !== '5');
    const corregidos = conLaParadaDeVerdad(sinRoja, [enInstantes(400, 1500)], PASO);
    expect(corregidos).toBe(sinRoja);
    expect(comoSeVe(corregidos, 800)).not.toBe('Bandera roja');
  });
});
