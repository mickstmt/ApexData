import { describe, expect, it } from 'vitest';
import { contarSalida, resumirVictorias, type VictoriaEnCircuito } from '@/lib/circuit-history';

function victoria(parcial: Partial<VictoriaEnCircuito>): VictoriaEnCircuito {
  return {
    year: 2024,
    round: 1,
    raceName: 'Gran Premio',
    driverId: 'piloto',
    driver: 'Un Piloto',
    teamId: 'equipo',
    team: 'Un Equipo',
    grid: 1,
    time: '1:30:00.000',
    ...parcial,
  };
}

describe('resumirVictorias', () => {
  it('cuenta las victorias por piloto y por equipo', () => {
    const resumen = resumirVictorias([
      victoria({ year: 2024, driverId: 'verstappen', driver: 'Max Verstappen', teamId: 'red_bull', team: 'Red Bull' }),
      victoria({ year: 2023, driverId: 'verstappen', driver: 'Max Verstappen', teamId: 'red_bull', team: 'Red Bull' }),
      victoria({ year: 2022, driverId: 'leclerc', driver: 'Charles Leclerc', teamId: 'ferrari', team: 'Ferrari' }),
    ]);

    expect(resumen.pilotos).toEqual([
      { id: 'verstappen', nombre: 'Max Verstappen', victorias: 2 },
      { id: 'leclerc', nombre: 'Charles Leclerc', victorias: 1 },
    ]);
    expect(resumen.equipos[0]).toEqual({ id: 'red_bull', nombre: 'Red Bull', victorias: 2 });
  });

  it('ordena los empates por nombre, para que dos visitas vean lo mismo', () => {
    const alterno = resumirVictorias([
      victoria({ driverId: 'b', driver: 'Zutano' }),
      victoria({ driverId: 'a', driver: 'Mengano' }),
    ]);

    expect(alterno.pilotos.map((p) => p.nombre)).toEqual(['Mengano', 'Zutano']);
  });

  it('mide desde dónde se gana aquí', () => {
    // Monza: se gana desde atrás. Cuatro victorias, una desde la pole.
    const resumen = resumirVictorias([
      victoria({ year: 2025, grid: 1 }),
      victoria({ year: 2024, grid: 4 }),
      victoria({ year: 2023, grid: 2 }),
      victoria({ year: 2022, grid: 7 }),
    ]);

    expect(resumen.desdeLaPole).toBe(25);
    expect(resumen.gridMedio).toBe(3.5);
    expect(resumen.remontada?.year).toBe(2022);
  });

  it('no llama remontada a ganar desde la pole', () => {
    const resumen = resumirVictorias([victoria({ grid: 1 }), victoria({ year: 2023, grid: 1 })]);

    expect(resumen.desdeLaPole).toBe(100);
    expect(resumen.remontada).toBeNull();
  });

  it('trata la parrilla 0 como el pit lane, no como la posición cero', () => {
    // En los datos de Ergast salir del pit lane se guarda como parrilla 0: hay
    // 56 salidas así en la base. Sin este cuidado, esa victoria contaría como
    // la mejor parrilla posible y hundiría la media.
    const resumen = resumirVictorias([
      victoria({ year: 2024, grid: 0 }),
      victoria({ year: 2023, grid: 5 }),
    ]);

    expect(resumen.remontada?.year).toBe(2024);
    expect(resumen.gridMedio).toBe(5);
    expect(resumen.desdeLaPole).toBe(0);
  });

  it('aguanta un circuito sin resultados cargados', () => {
    expect(resumirVictorias([])).toEqual({
      pilotos: [],
      equipos: [],
      desdeLaPole: null,
      gridMedio: null,
      remontada: null,
    });
  });
});

describe('contarSalida', () => {
  it('nombra la salida en vez de dar un número suelto', () => {
    expect(contarSalida(1)).toBe('desde la pole');
    expect(contarSalida(7)).toBe('desde 7.º');
  });

  it('llama pit lane a la parrilla 0', () => {
    expect(contarSalida(0)).toBe('desde el pit lane');
  });
});
