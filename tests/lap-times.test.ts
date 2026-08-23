import { describe, expect, it } from 'vitest';
import {
  fastestLapIndex,
  intervalosAlAnterior,
  lapTimeToMs,
  mejorVueltaPorPiloto,
} from '@/lib/lap-times';
import type { LapData } from '@/types';

describe('lapTimeToMs', () => {
  it('reads the "M:SS.mmm" the telemetry service sends', () => {
    expect(lapTimeToMs('1:29.165')).toBe(89165);
    expect(lapTimeToMs('1:29.179')).toBe(89179);
  });

  it('reads a sub-minute lap, which arrives without the minute part', () => {
    expect(lapTimeToMs('59.900')).toBe(59900);
  });

  it('returns null for missing or unreadable values', () => {
    expect(lapTimeToMs(null)).toBeNull();
    expect(lapTimeToMs(undefined)).toBeNull();
    expect(lapTimeToMs('')).toBeNull();
    expect(lapTimeToMs('-')).toBeNull();
    expect(lapTimeToMs('P0DT0H1M29.165S')).toBeNull();
  });
});

describe('fastestLapIndex', () => {
  it('picks the quickest lap, not the one that sorts first as text', () => {
    // The bug this guards: as strings, "59.900" sorts after "1:29.165".
    expect(fastestLapIndex(['1:29.165', '59.900', '1:28.900'])).toBe(1);
  });

  it('ignores laps with no time', () => {
    expect(fastestLapIndex([null, '1:31.000', undefined, '1:30.500'])).toBe(3);
  });

  it('returns null when nothing can be read', () => {
    expect(fastestLapIndex([])).toBeNull();
    expect(fastestLapIndex([null, '-'])).toBeNull();
  });

  it('keeps the first of two identical times', () => {
    expect(fastestLapIndex(['1:30.000', '1:30.000'])).toBe(0);
  });
});

describe('mejorVueltaPorPiloto', () => {
  const vuelta = (Driver: string, LapTime: string | null, LapNumber = 1) =>
    ({ Driver, DriverNumber: '0', LapNumber, LapTime }) as LapData;

  it('deja una sola vuelta por piloto: la más rápida', () => {
    // El defecto que vigila: `/fastest?limit=20` devuelve las veinte vueltas
    // más rápidas de la sesión, no la de cada piloto, así que quien está en
    // forma ocupa varios puestos y otros pilotos no salen.
    const resultado = mejorVueltaPorPiloto([
      vuelta('PIA', '1:12.500', 8),
      vuelta('PIA', '1:12.100', 14),
      vuelta('LEC', '1:12.300', 9),
      vuelta('PIA', '1:12.900', 3),
    ]);

    expect(resultado.map((v) => v.Driver)).toEqual(['PIA', 'LEC']);
    expect(resultado[0].LapNumber).toBe(14);
  });

  it('ordena de la más rápida a la más lenta, aunque lleguen desordenadas', () => {
    const resultado = mejorVueltaPorPiloto([
      vuelta('RUS', '1:13.074'),
      vuelta('ANT', '1:12.949'),
      vuelta('NOR', '1:13.070'),
    ]);

    expect(resultado.map((v) => v.Driver)).toEqual(['ANT', 'NOR', 'RUS']);
  });

  it('no se fía del orden de llegada: compara en milisegundos', () => {
    // Como texto, "59.900" va después de "1:12.949" y ganaría el más lento.
    const resultado = mejorVueltaPorPiloto([
      vuelta('ANT', '1:12.949'),
      vuelta('NOR', '59.900'),
    ]);

    expect(resultado[0].Driver).toBe('NOR');
  });

  it('descarta las vueltas sin tiempo, y con ellas a quien no marcó ninguna', () => {
    const resultado = mejorVueltaPorPiloto([
      vuelta('HUL', null),
      vuelta('VER', '1:12.000'),
      vuelta('VER', null),
    ]);

    expect(resultado.map((v) => v.Driver)).toEqual(['VER']);
  });
});

describe('intervalosAlAnterior', () => {
  const fila = (time: string | null, segment: number | null = 3) => ({ time, segment });

  it('da la diferencia con el piloto de delante, no con el primero', () => {
    const r = intervalosAlAnterior([
      fila('1:11.567'),
      fila('1:11.608'),
      fila('1:11.622'),
    ]);

    expect(r).toEqual([null, '+0.041', '+0.014']);
  });

  it('no compara a través de un cambio de tramo', () => {
    // El primero de Q2 no tiene con quién compararse: el de delante marcó su
    // tiempo en Q3, y restar eso da un número que no significa nada.
    const r = intervalosAlAnterior([fila('1:11.567', 3), fila('1:12.100', 2), fila('1:12.300', 2)]);

    expect(r).toEqual([null, null, '+0.200']);
  });

  it('deja sin diferencia a quien no marcó tiempo, y al siguiente', () => {
    const r = intervalosAlAnterior([fila('1:11.567'), fila(null), fila('1:12.000')]);

    expect(r).toEqual([null, null, null]);
  });

  it('enseña el signo cuando el de delante fue más lento', () => {
    // Pasa de verdad dentro de un tramo si la fuente ordena por otra cosa; se
    // dice tal cual en vez de esconderlo detrás de un «+».
    const r = intervalosAlAnterior([fila('1:12.000'), fila('1:11.800')]);

    expect(r[1]).toBe('−0.200');
  });

  it('sin tramos, compara toda la lista seguida', () => {
    const r = intervalosAlAnterior([{ time: '1:12.949' }, { time: '1:13.070' }]);

    expect(r).toEqual([null, '+0.121']);
  });
});
