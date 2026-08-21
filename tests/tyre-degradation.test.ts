import { describe, expect, it } from 'vitest';
import { caidaPorCompuesto, comoCaida, tandasPorCompuesto } from '@/lib/tyre-degradation';
import type { LapData } from '@/types';

/** Una vuelta de tanda, con lo que el cálculo mira. */
const vuelta = (
  Driver: string,
  Stint: number,
  Compound: string,
  TyreLife: number,
  LapTime: string,
  extra: Partial<LapData> = {}
): LapData => ({
  Driver,
  DriverNumber: '1',
  LapNumber: TyreLife,
  Stint,
  Compound,
  TyreLife,
  LapTime,
  ...extra,
});

/** Una tanda que pierde exactamente `caida` segundos por vuelta. */
const tanda = (code: string, stint: number, compuesto: string, caida: number, largo = 10) =>
  Array.from({ length: largo }, (_, i) =>
    vuelta(code, stint, compuesto, i + 1, `1:${(30 + i * caida).toFixed(3).padStart(6, '0')}`)
  );

describe('tandasPorCompuesto', () => {
  it('mide la caída de una tanda en segundos por vuelta', () => {
    const [resultado] = tandasPorCompuesto(tanda('VER', 1, 'SOFT', 0.1));

    expect(resultado.compuesto).toBe('SOFT');
    expect(resultado.vueltas).toHaveLength(10);
    expect(resultado.pendiente).toBeCloseTo(0.1, 3);
  });

  it('descarta las vueltas de entrada y salida de boxes', () => {
    // Una vuelta con parada mide veinte segundos de más: por sí sola inclinaría
    // la recta entera y diría que el neumático se cae el triple.
    const laps = [
      ...tanda('VER', 1, 'SOFT', 0.1),
      vuelta('VER', 1, 'SOFT', 11, '1:52.000', { PitInTime: '1:52.000' }),
    ];

    const [resultado] = tandasPorCompuesto(laps);
    expect(resultado.vueltas).toHaveLength(10);
    expect(resultado.pendiente).toBeCloseTo(0.1, 3);
  });

  it('descarta las vueltas que FastF1 marca como no fiables', () => {
    const laps = [
      ...tanda('VER', 1, 'SOFT', 0.1),
      vuelta('VER', 1, 'SOFT', 11, '2:10.000', { IsAccurate: false }),
    ];

    expect(tandasPorCompuesto(laps)[0].vueltas).toHaveLength(10);
  });

  it('ignora las tandas demasiado cortas para decir nada', () => {
    // Con tres vueltas no hay pendiente: hay tres puntos y una recta que finge.
    expect(tandasPorCompuesto(tanda('VER', 1, 'SOFT', 0.1, 3))).toEqual([]);
  });

  it('separa las tandas de distintos pilotos aunque compartan número', () => {
    const laps = [...tanda('VER', 1, 'SOFT', 0.1), ...tanda('NOR', 1, 'SOFT', 0.2)];
    const tandas = tandasPorCompuesto(laps);

    expect(tandas).toHaveLength(2);
    expect(tandas.map((t) => t.code).sort()).toEqual(['NOR', 'VER']);
  });
});

describe('caidaPorCompuesto', () => {
  it('resume cada compuesto con la mediana de sus tandas', () => {
    // La mediana y no la media: la tanda de PER está falseada —tráfico, coche
    // de seguridad, lo que sea— y con la media arrastraría el resultado.
    const laps = [
      ...tanda('VER', 1, 'SOFT', 0.1),
      ...tanda('NOR', 1, 'SOFT', 0.12),
      ...tanda('PER', 1, 'SOFT', 2.0),
      ...tanda('LEC', 1, 'HARD', 0.05),
      ...tanda('SAI', 1, 'HARD', 0.06),
    ];

    const caidas = caidaPorCompuesto(laps);
    const blando = caidas.find((c) => c.compuesto === 'SOFT')!;

    expect(blando.tandas).toBe(3);
    expect(blando.pendiente).toBeCloseTo(0.12, 2);
    expect(caidas.find((c) => c.compuesto === 'HARD')!.pendiente).toBeCloseTo(0.055, 2);
  });

  it('ordena del más blando al más duro', () => {
    const laps = [
      ...tanda('LEC', 1, 'HARD', 0.05),
      ...tanda('VER', 1, 'SOFT', 0.1),
      ...tanda('NOR', 1, 'MEDIUM', 0.08),
    ];

    expect(caidaPorCompuesto(laps).map((c) => c.compuesto)).toEqual(['SOFT', 'MEDIUM', 'HARD']);
  });

  it('con una sesión sin tandas devuelve una lista vacía', () => {
    expect(caidaPorCompuesto([])).toEqual([]);
  });
});

describe('comoCaida', () => {
  it('lo dice como en una retransmisión', () => {
    expect(comoCaida(0.083)).toBe('+0.083 s/vuelta');
    // Una pendiente negativa es un neumático que mejora: pasa con el duro al
    // principio de la tanda, cuando aún está entrando en temperatura.
    expect(comoCaida(-0.02)).toBe('−0.020 s/vuelta');
  });
});
