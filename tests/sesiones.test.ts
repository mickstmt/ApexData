import { describe, expect, it } from 'vitest';
import {
  estadoDeSesion,
  queEnseñar,
  sesionesOrdenadas,
  type FinDeSemana,
} from '@/lib/sesiones';

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

describe('estadoDeSesion', () => {
  const inicio = fecha('2026-08-21T09:30:00Z');
  const enMinutos = (m: number) => inicio.getTime() + m * 60_000;

  it('antes de empezar está pendiente', () => {
    expect(estadoDeSesion('Práctica 1', inicio, enMinutos(-10))).toBe('pendiente');
  });

  it('mientras rueda sigue en curso, no pasada', () => {
    // Sin esto, a los dos minutos de empezar la práctica la portada anunciaría
    // la clasificación como «la próxima» y quien mira se perdería lo que está
    // ocurriendo delante.
    expect(estadoDeSesion('Práctica 1', inicio, enMinutos(1))).toBe('en-curso');
    expect(estadoDeSesion('Práctica 1', inicio, enMinutos(59))).toBe('en-curso');
  });

  it('cuando termina, pasa', () => {
    expect(estadoDeSesion('Práctica 1', inicio, enMinutos(61))).toBe('pasada');
  });

  it('cada sesión dura lo suyo: la carrera no acaba en una hora', () => {
    expect(estadoDeSesion('Carrera', inicio, enMinutos(90))).toBe('en-curso');
    expect(estadoDeSesion('Sprint', inicio, enMinutos(50))).toBe('pasada');
  });

  it('una sesión con nombre desconocido no se queda colgada para siempre', () => {
    expect(estadoDeSesion('Sesión rara', inicio, enMinutos(61))).toBe('pasada');
  });
});

describe('queEnseñar', () => {
  const AHORA = new Date('2026-08-23T18:00:00Z').getTime();

  it('con resultados, los resultados', () => {
    expect(
      queEnseñar({ nombre: 'Carrera', cuando: fecha('2026-08-23T13:00:00Z'), tieneResultados: true, ahora: AHORA })
    ).toEqual({ tipo: 'resultados' });
  });

  it('distingue «todavía no se corre» de «no han publicado»', () => {
    // Es la diferencia entre «vuelve el domingo» y «vuelve en un rato», y una
    // pestaña vacía no la cuenta.
    const futura = queEnseñar({
      nombre: 'Carrera',
      cuando: fecha('2026-08-24T13:00:00Z'),
      tieneResultados: false,
      ahora: AHORA,
    });
    expect(futura.tipo).toBe('aun-no-corre');

    const terminada = queEnseñar({
      nombre: 'Carrera',
      cuando: fecha('2026-08-23T13:00:00Z'),
      tieneResultados: false,
      ahora: AHORA,
    });
    expect(terminada.tipo).toBe('sin-publicar');
  });

  it('mientras rueda, lo dice', () => {
    const enCurso = queEnseñar({
      nombre: 'Carrera',
      cuando: fecha('2026-08-23T17:00:00Z'),
      tieneResultados: false,
      ahora: AHORA,
    });
    expect(enCurso.tipo).toBe('en-curso');
  });

  it('las sesiones sin fuente se dicen aparte, no como un retraso', () => {
    // Prácticas y clasificación al sprint: esperar por ellas seria esperar por
    // algo que Jolpica no publica.
    expect(
      queEnseñar({
        nombre: 'Práctica 1',
        cuando: fecha('2026-08-21T09:30:00Z'),
        tieneResultados: false,
        hayFuente: false,
        ahora: AHORA,
      })
    ).toEqual({ tipo: 'sin-fuente' });
  });

  it('sin fecha guardada tampoco promete nada', () => {
    expect(
      queEnseñar({ nombre: 'Sprint', cuando: null, tieneResultados: false, ahora: AHORA }).tipo
    ).toBe('sin-fuente');
  });
});
