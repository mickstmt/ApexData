import { describe, expect, it } from 'vitest';
import { fastestLapIndex, lapTimeToMs, mejorVueltaPorPiloto } from '@/lib/lap-times';
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
