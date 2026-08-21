import { describe, expect, it } from 'vitest';
import { sesionesOrdenadas, type FinDeSemana } from '@/lib/sesiones';

const vacio: FinDeSemana = {
  fp1Date: null,
  fp2Date: null,
  fp3Date: null,
  sprintQualiDate: null,
  sprintDate: null,
  qualiDate: null,
};

const fecha = (iso: string) => new Date(iso);

describe('sesionesOrdenadas', () => {
  it('ordena un fin de semana normal', () => {
    const nombres = sesionesOrdenadas(
      {
        ...vacio,
        fp1Date: fecha('2026-08-21T11:30:00Z'),
        fp2Date: fecha('2026-08-21T15:00:00Z'),
        fp3Date: fecha('2026-08-22T10:30:00Z'),
        qualiDate: fecha('2026-08-22T14:00:00Z'),
      },
      fecha('2026-08-23T13:00:00Z')
    ).map((s) => s.nombre);

    expect(nombres).toEqual(['Práctica 1', 'Práctica 2', 'Práctica 3', 'Clasificación', 'Carrera']);
  });

  it('ordena un fin de semana al sprint como ocurre de verdad', () => {
    // El defecto que esto arregla: la lista iba en un orden escrito a mano y
    // enseñaba «Práctica 1 → Sprint», saltándose la clasificación del viernes
    // que ordena la parrilla del sprint y dejando la de la carrera detrás.
    const nombres = sesionesOrdenadas(
      {
        ...vacio,
        fp1Date: fecha('2026-08-21T09:30:00Z'),
        sprintQualiDate: fecha('2026-08-21T13:30:00Z'),
        sprintDate: fecha('2026-08-22T09:00:00Z'),
        qualiDate: fecha('2026-08-22T13:00:00Z'),
      },
      fecha('2026-08-23T12:00:00Z')
    ).map((s) => s.nombre);

    expect(nombres).toEqual([
      'Práctica 1',
      'Clasif. sprint',
      'Sprint',
      'Clasificación',
      'Carrera',
    ]);
  });

  it('no inventa sesiones que no están', () => {
    const sesiones = sesionesOrdenadas(vacio, fecha('2026-08-23T12:00:00Z'));

    expect(sesiones).toHaveLength(1);
    expect(sesiones[0].nombre).toBe('Carrera');
  });

  it('el orden sale de las horas, no de la lista', () => {
    // Si algún día un formato nuevo pone la clasificación antes que la última
    // práctica, la portada lo enseñará bien sin tocar una línea.
    const nombres = sesionesOrdenadas(
      {
        ...vacio,
        fp3Date: fecha('2026-08-22T16:00:00Z'),
        qualiDate: fecha('2026-08-22T12:00:00Z'),
      },
      fecha('2026-08-23T12:00:00Z')
    ).map((s) => s.nombre);

    expect(nombres).toEqual(['Clasificación', 'Práctica 3', 'Carrera']);
  });
});
