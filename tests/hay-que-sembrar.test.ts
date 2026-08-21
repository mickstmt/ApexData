import { describe, expect, it } from 'vitest';
import {
  comienzoDeCarrera,
  sesionesRevisables,
  type CarreraParaRevisar,
} from '../scripts/hay-que-sembrar';

/**
 * El caso que de verdad importa —que note lo que falta— no se puede provocar
 * contra la base de producción sin borrar datos de verdad, así que la decisión
 * vive en una función pura y se prueba aquí.
 */

const AHORA = new Date('2026-08-23T18:00:00Z').getTime();
const hace = (horas: number) => new Date(AHORA - horas * 3_600_000);

const carrera = (parcial: Partial<CarreraParaRevisar> = {}): CarreraParaRevisar => ({
  year: 2026,
  round: 12,
  raceName: 'Dutch Grand Prix',
  date: new Date('2026-08-23T00:00:00Z'),
  time: '13:00:00Z',
  qualiDate: null,
  sprintDate: null,
  resultados: 0,
  clasificaciones: 0,
  sprints: 0,
  ...parcial,
});

describe('comienzoDeCarrera', () => {
  it('junta la fecha de medianoche con la hora que va aparte', () => {
    // La base guarda `date` a medianoche UTC y la hora real en `time`: sin
    // juntarlas, una carrera de las 13:00 se daría por terminada a las 02:30.
    const comienzo = comienzoDeCarrera(new Date('2026-08-23T00:00:00Z'), '13:00:00Z');
    expect(comienzo.toISOString()).toBe('2026-08-23T13:00:00.000Z');
  });

  it('sin hora, se queda con la fecha', () => {
    const comienzo = comienzoDeCarrera(new Date('2026-08-23T00:00:00Z'), null);
    expect(comienzo.toISOString()).toBe('2026-08-23T00:00:00.000Z');
  });
});

describe('sesionesRevisables', () => {
  it('no mira las sesiones que aún no han terminado', () => {
    // La carrera empieza dentro de dos horas: no hay nada que esperar todavía.
    const revisadas = sesionesRevisables(
      [carrera({ date: new Date('2026-08-23T20:00:00Z'), time: '20:00:00Z' })],
      AHORA,
      48
    );

    expect(revisadas).toEqual([]);
  });

  it('tampoco mientras la carrera está rodando', () => {
    // Empezó hace una hora y dura dos y media: aún no ha acabado.
    const revisadas = sesionesRevisables([carrera({ time: '17:00:00Z' })], AHORA, 48);
    expect(revisadas).toEqual([]);
  });

  it('encuentra la sesión terminada cuyos datos faltan', () => {
    const revisadas = sesionesRevisables([carrera({ time: '13:00:00Z' })], AHORA, 48);

    expect(revisadas).toHaveLength(1);
    expect(revisadas[0].sesion).toBe('Carrera');
    expect(revisadas[0].tenemos).toBe(0);
    // Empezó a las 13:00, dura 2 h 30 min, y son las 18:00.
    expect(revisadas[0].horasDesdeQueTermino).toBeCloseTo(2.5, 1);
  });

  it('deja de mirar lo que se salió de la ventana', () => {
    // Sin esta poda, cada tic volvería a revisar carreras de hace meses.
    const revisadas = sesionesRevisables(
      [carrera({ date: hace(200), time: null })],
      AHORA,
      48
    );

    expect(revisadas).toEqual([]);
  });

  it('revisa las tres sesiones de un fin de semana al sprint', () => {
    const revisadas = sesionesRevisables(
      [
        carrera({
          qualiDate: hace(28),
          sprintDate: hace(32),
          time: '13:00:00Z',
          clasificaciones: 22,
          sprints: 0,
        }),
      ],
      AHORA,
      48
    );

    expect(revisadas.map((r) => r.sesion)).toEqual(['Clasificación', 'Sprint', 'Carrera']);
    // La clasificación ya está; el sprint y la carrera, no: eso es lo que
    // dispara el sembrado.
    expect(revisadas.filter((r) => r.tenemos === 0).map((r) => r.sesion)).toEqual([
      'Sprint',
      'Carrera',
    ]);
  });

  it('con todo sembrado no queda nada pendiente', () => {
    const revisadas = sesionesRevisables(
      [carrera({ time: '13:00:00Z', resultados: 22 })],
      AHORA,
      48
    );

    expect(revisadas.every((r) => r.tenemos > 0)).toBe(true);
  });
});
