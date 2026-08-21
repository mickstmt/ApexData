import { describe, expect, it } from 'vitest';
import {
  CORTE,
  comoTiempo,
  prepararDispersion,
  resumirPiloto,
  resumirTodos,
} from '@/lib/lap-scatter';
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

describe('resumirTodos', () => {
  const sesion = (filas: [string, number, string][]) =>
    prepararDispersion(filas.map(([c, n, t]) => vuelta(c, n, t))).visibles;

  it('ordena por mediana, no por mejor vuelta', () => {
    // El caso que justifica la decisión: VER marca la vuelta rápida absoluta
    // pero su ritmo sostenido es peor. Ordenando por mejor vuelta saldría
    // primero y la lista mentiría sobre quién tenía ritmo.
    const visibles = sesion([
      ['VER', 1, '1:32.000'],
      ['VER', 2, '1:36.000'],
      ['VER', 3, '1:36.500'],
      ['VER', 4, '1:36.400'],
      ['VER', 5, '1:36.300'],
      ['NOR', 1, '1:34.000'],
      ['NOR', 2, '1:34.200'],
      ['NOR', 3, '1:34.100'],
      ['NOR', 4, '1:34.300'],
      ['NOR', 5, '1:34.150'],
    ]);

    const todos = resumirTodos(visibles);
    expect(todos.map((r) => r.code)).toEqual(['NOR', 'VER']);
    expect(todos[1].mejor).toBeLessThan(todos[0].mejor);
  });

  it('deja fuera a quien apenas rodó', () => {
    const visibles = sesion([
      ['VER', 1, '1:32.000'],
      ['VER', 2, '1:32.100'],
      ['VER', 3, '1:32.200'],
      ['VER', 4, '1:32.300'],
      ['VER', 5, '1:32.400'],
      ['ABA', 1, '1:33.000'],
      ['ABA', 2, '1:33.100'],
    ]);

    // Con dos vueltas no hay distribución: habría una caja que finge serlo.
    expect(resumirTodos(visibles).map((r) => r.code)).toEqual(['VER']);
  });

  it('calcula la caja y los bigotes', () => {
    const visibles = sesion(
      Array.from({ length: 11 }, (_, i) => ['VER', i + 1, `1:3${i % 10}.000`] as [string, number, string])
    );

    const [resumen] = resumirTodos(visibles);
    expect(resumen.q1).toBeLessThan(resumen.mediana);
    expect(resumen.mediana).toBeLessThan(resumen.q3);
    expect(resumen.p5).toBeLessThanOrEqual(resumen.q1);
    expect(resumen.p95).toBeGreaterThanOrEqual(resumen.q3);
  });
});
