import { describe, expect, it } from 'vitest';
import { CORTE, comoTiempo, prepararDispersion, resumirPiloto } from '@/lib/lap-scatter';
import type { LapData } from '@/types';

/** Una vuelta como la que manda el servicio, con lo justo para el gráfico. */
const vuelta = (Driver: string, LapNumber: number, LapTime?: string): LapData => ({
  Driver,
  DriverNumber: '1',
  LapNumber,
  LapTime,
});

describe('prepararDispersion', () => {
  it('convierte los tiempos y encuentra la vuelta más rápida', () => {
    const datos = prepararDispersion([
      vuelta('VER', 1, '1:33.000'),
      vuelta('VER', 2, '1:32.500'),
      vuelta('LEC', 1, '1:33.500'),
    ]);

    expect(datos.puntos).toHaveLength(3);
    expect(datos.mejor).toBe(92500);
    expect(datos.totalVueltas).toBe(2);
    expect(datos.pilotos).toEqual(['LEC', 'VER']);
  });

  it('descarta las vueltas sin tiempo en vez de contarlas como cero', () => {
    // Pasa de verdad: la vuelta de salida y las de bandera roja llegan sin
    // tiempo. Contarlas como 0 pondría la referencia de la escala en cero.
    const datos = prepararDispersion([
      vuelta('VER', 1),
      vuelta('VER', 2, '1:32.500'),
      vuelta('VER', 3, undefined),
    ]);

    expect(datos.puntos).toHaveLength(1);
    expect(datos.mejor).toBe(92500);
  });

  it('deja fuera de escala las vueltas que se pasan del corte, y las cuenta', () => {
    const datos = prepararDispersion([
      vuelta('VER', 1, '1:32.000'), // la referencia
      vuelta('VER', 2, '1:33.000'), // dentro
      vuelta('VER', 3, '1:55.000'), // parada en boxes
    ]);

    expect(datos.visibles).toHaveLength(2);
    // No se esconde: el gráfico lo dice al pie.
    expect(datos.fuera).toBe(1);
    expect(datos.techo).toBeCloseTo(92000 * CORTE, 5);
  });

  it('aguanta una sesión sin una sola vuelta cronometrada', () => {
    const datos = prepararDispersion([vuelta('VER', 1)]);

    expect(datos.puntos).toEqual([]);
    expect(datos.mejor).toBe(0);
    expect(datos.fuera).toBe(0);
  });
});

describe('resumirPiloto', () => {
  it('resume ritmo y constancia con la mediana y el intercuartílico', () => {
    const { visibles } = prepararDispersion([
      vuelta('VER', 1, '1:32.000'),
      vuelta('VER', 2, '1:33.000'),
      vuelta('VER', 3, '1:34.000'),
      vuelta('VER', 4, '1:35.000'),
      vuelta('VER', 5, '1:36.000'),
    ]);

    const resumen = resumirPiloto(visibles, 'VER')!;
    expect(resumen.vueltas).toBe(5);
    expect(resumen.mejor).toBe(92000);
    expect(resumen.mediana).toBe(94000);
    // Los cuartiles caen en 93 y 95 segundos: dos segundos de horquilla.
    expect(resumen.intercuartil).toBe(2000);
  });

  it('no se deja desfigurar por una parada en boxes', () => {
    // El intercuartílico existe justo para esto: con la desviación típica, una
    // sola vuelta de 1:55 haría parecer irregular a quien fue un metrónomo.
    const { visibles } = prepararDispersion([
      vuelta('VER', 1, '1:32.000'),
      vuelta('VER', 2, '1:32.100'),
      vuelta('VER', 3, '1:32.200'),
      vuelta('VER', 4, '1:55.000'),
    ]);

    const resumen = resumirPiloto(visibles, 'VER')!;
    expect(resumen.vueltas).toBe(3);
    expect(resumen.intercuartil).toBeCloseTo(100, 0);
  });

  it('devuelve nulo para un piloto sin vueltas visibles', () => {
    expect(resumirPiloto([], 'VER')).toBeNull();
  });
});

describe('comoTiempo', () => {
  it('escribe los tiempos como se leen en la pantalla de un circuito', () => {
    expect(comoTiempo(92608)).toBe('1:32.608');
    expect(comoTiempo(59900)).toBe('59.900');
    // El relleno importa: sin él, 1:02.500 saldría como «1:2.500».
    expect(comoTiempo(62500)).toBe('1:02.500');
  });
});
