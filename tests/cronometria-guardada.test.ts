import { describe, expect, it } from 'vitest';
import {
  comienzoDeLaSesion,
  cuantasVueltas,
  esDefinitiva,
  HORAS_HASTA_DEFINITIVA,
  recortada,
  type CarreraConHorarios,
} from '@/lib/cronometria-guardada';

/**
 * Lo que el usuario reportó dos veces —el 2026-09-15 y el 2026-09-26—:
 * «siempre en las prácticas libres pide la data cada vez que entramos».
 *
 * Los tiempos de una sesión terminada no cambian, y aun así caducaban: cinco
 * minutos en el navegador y una hora en el servicio. Medido en producción,
 * 0,06 s en caliente contra 4,35 s en frío.
 *
 * Guardarlos es fácil; lo único delicado es **cuándo**. Guardar demasiado
 * pronto congela para siempre una lista parcial o vacía, que es el fallo del
 * 24 pero sin fecha de caducidad. Eso es lo que fijan estas pruebas.
 */

/** Bakú 2026: FP1 el jueves 24 a las 08:30Z, carrera el sábado a las 11:00Z. */
const baku: CarreraConHorarios = {
  date: new Date('2026-09-26T00:00:00Z'),
  time: '11:00:00Z',
  fp1Date: new Date('2026-09-24T08:30:00Z'),
  fp2Date: new Date('2026-09-24T12:00:00Z'),
  fp3Date: new Date('2026-09-25T08:30:00Z'),
  sprintQualiDate: null,
  sprintDate: null,
  qualiDate: new Date('2026-09-25T12:00:00Z'),
};

describe('cuándo empieza cada sesión', () => {
  it('lee el campo que toca para cada tipo', () => {
    expect(comienzoDeLaSesion(baku, 'FP1')?.toISOString()).toBe('2026-09-24T08:30:00.000Z');
    expect(comienzoDeLaSesion(baku, 'FP2')?.toISOString()).toBe('2026-09-24T12:00:00.000Z');
    expect(comienzoDeLaSesion(baku, 'FP3')?.toISOString()).toBe('2026-09-25T08:30:00.000Z');
    expect(comienzoDeLaSesion(baku, 'Q')?.toISOString()).toBe('2026-09-25T12:00:00.000Z');
  });

  it('la carrera se compone: la fecha es medianoche y la hora va aparte', () => {
    // Sin esto la carrera se adelantaría un día entero, que es el fallo que ya
    // costó caro en la portada.
    expect(comienzoDeLaSesion(baku, 'R')?.toISOString()).toBe('2026-09-26T11:00:00.000Z');
  });

  it('un fin de semana sin sprint no inventa un sprint', () => {
    expect(comienzoDeLaSesion(baku, 'S')).toBeNull();
    expect(comienzoDeLaSesion(baku, 'SQ')).toBeNull();
  });
});

describe('cuándo es definitiva', () => {
  it('no lo es mientras se está corriendo', () => {
    // FP1 empieza a las 08:30 y dura una hora.
    expect(esDefinitiva(baku, 'FP1', new Date('2026-09-24T09:00:00Z'))).toBe(false);
  });

  it('tampoco justo al acabar, que es cuando la lista puede venir a medias', () => {
    // Este es el caso que congelaría el fallo del 24 para siempre.
    expect(esDefinitiva(baku, 'FP1', new Date('2026-09-24T09:45:00Z'))).toBe(false);
  });

  it('lo es pasadas las cuatro horas desde el comienzo', () => {
    expect(esDefinitiva(baku, 'FP1', new Date('2026-09-24T12:30:00Z'))).toBe(true);
    expect(HORAS_HASTA_DEFINITIVA).toBe(4);
  });

  it('el margen cubre una carrera larga, que es la sesión más larga posible', () => {
    // Dos horas por reglamento y hasta tres con una suspensión: a las cuatro
    // desde la salida, cualquier carrera ha terminado.
    expect(esDefinitiva(baku, 'R', new Date('2026-09-26T14:00:00Z'))).toBe(false);
    expect(esDefinitiva(baku, 'R', new Date('2026-09-26T15:00:00Z'))).toBe(true);
  });

  it('sin carrera en la base no se guarda nada', () => {
    // Preferimos volver a pedirlo que congelar algo sin saber si está entero.
    expect(esDefinitiva(null, 'FP1', new Date('2027-01-01T00:00:00Z'))).toBe(false);
  });

  it('sin horario de esa sesión tampoco', () => {
    expect(esDefinitiva(baku, 'S', new Date('2027-01-01T00:00:00Z'))).toBe(false);
  });
});

describe('el recorte al límite pedido', () => {
  const datos = { fastest_laps: [1, 2, 3, 4, 5] };

  it('recorta cuando hay de más', () => {
    expect(recortada(datos, 3).fastest_laps).toEqual([1, 2, 3]);
  });

  it('no toca nada cuando caben todas', () => {
    expect(recortada(datos, 10)).toBe(datos);
  });

  it('aguanta una respuesta sin vueltas', () => {
    const vacia = {};
    expect(recortada(vacia, 5)).toBe(vacia);
    expect(cuantasVueltas(vacia)).toBe(0);
    expect(cuantasVueltas(null)).toBe(0);
  });

  it('cuenta las vueltas que trae', () => {
    expect(cuantasVueltas(datos)).toBe(5);
  });
});
