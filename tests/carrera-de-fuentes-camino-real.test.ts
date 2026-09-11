import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * El camino real de `sondearFuentes`, con dobles.
 *
 * Las pruebas de `carrera-de-fuentes.test.ts` comprueban `tocaSondear` con
 * marcas de tiempo ideales, y por eso **pasaban mientras el código hacía otra
 * cosa**: sellaba la hora al terminar el sondeo, no al empezar, y le cargaba a
 * cada fuente su propia duración como si fuera latencia suya —0,3 s a OpenF1,
 * once segundos a FastF1—. Justo el sesgo por construcción que el experimento
 * existe para quitar.
 *
 * Una prueba que elige lo que le pasa a la función no puede ver eso. Estas
 * llaman a la función de verdad y miden el reloj.
 */

const filas = new Map<string, Record<string, unknown>>();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    sourceProbe: {
      findMany: async () => [...filas.values()],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      upsert: async ({ where, create, update }: any) => {
        const k = `${where.sessionKey_source.sessionKey}:${where.sessionKey_source.source}`;
        const previa = filas.get(k);
        const datos = previa ? { ...previa, ...update } : { ...create };
        filas.set(k, { ...datos, updatedAt: new Date() });
      },
    },
  },
}));

vi.mock('@/services/openf1/client', () => ({
  clasificacionDeSesion: async () => {
    await new Promise((r) => setTimeout(r, 5)); // rápido, como OpenF1
    return [{ puesto: 1 }];
  },
}));

vi.mock('@/services/fastf1/client', () => ({ isTelemetryServiceConfigured: true }));

vi.mock('@/services', () => ({
  fastf1Client: {
    getSessionInfo: async () => {
      await new Promise((r) => setTimeout(r, 300)); // lento, como FastF1
      return { results: [{}] };
    },
  },
}));

vi.mock('@/lib/push/gran-premio', () => ({
  granPremioDe: async () => ({ year: 2026, round: 14 }),
}));

const sesion = {
  session_key: 999,
  session_name: 'Practice 3',
  year: 2026,
  location: 'Madrid',
  date_end: new Date(Date.now() - 60_000).toISOString(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe('el camino real de sondearFuentes', () => {
  beforeEach(() => {
    filas.clear();
  });

  it('sella la hora ANTES de preguntar, no después', async () => {
    const { sondearFuentes } = await import('@/lib/push/carrera-de-fuentes');
    const t0 = Date.now();
    await sondearFuentes({ sesiones: [sesion] });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fastf1 = filas.get('999:fastf1') as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const openf1 = filas.get('999:openf1') as any;

    // El doble de FastF1 tarda 300 ms a propósito. Sellando al terminar, la
    // marca caería 300 ms tarde; sellando al empezar, cae de inmediato.
    // Medido con el arreglo puesto: 14 ms.
    const retraso = fastf1.firstSeenAt.getTime() - t0;
    expect(retraso).toBeLessThan(250);

    // Y ninguna de las dos paga lo que tardó ella. Medido: 13 ms de diferencia
    // entre ambas, no los 300 ms que separaban a sus sondeos.
    expect(Math.abs(fastf1.firstSeenAt - openf1.firstSeenAt)).toBeLessThan(250);
  }, 20_000);

  it('firstProbeAt no se reescribe en filas que ya existían', async () => {
    const viejo = new Date('2026-09-11T12:31:00Z');
    filas.set('999:openf1', {
      sessionKey: 999,
      source: 'openf1',
      firstProbeAt: viejo,
      probes: 1,
      endedAt: new Date(sesion.date_end),
      sessionName: 'Practice 3',
      year: 2026,
      updatedAt: new Date(0),
    });

    const { sondearFuentes } = await import('@/lib/push/carrera-de-fuentes');
    await sondearFuentes({ sesiones: [sesion] });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((filas.get('999:openf1') as any).firstProbeAt).toEqual(viejo);
  }, 20_000);
});
