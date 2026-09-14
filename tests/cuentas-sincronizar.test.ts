import { describe, expect, it } from 'vitest';

import { sincronizar } from '@/lib/cuentas/sincronizar';
import { VACIOS, type Favoritos } from '@/lib/cuentas/favoritos';

/**
 * Qué queda cuando el aparato y la cuenta no dicen lo mismo.
 *
 * Es la única parte de las cuentas que puede **perder** lo que alguien marcó a
 * mano, así que es la que se prueba de verdad. La regla la fijó el usuario:
 * subir los del aparato la primera vez, y no preguntar después — «con que al
 * entrar se carguen y se guarden los datos ya existentes».
 */

const de = (pilotos: string[], equipos: string[] = [], acento: string | null = null): Favoritos => ({
  pilotos,
  equipos,
  acento,
});

describe('poner de acuerdo el aparato y la cuenta', () => {
  it('cuenta recién estrenada: suben los del aparato', () => {
    const { resultado, hayQueSubir } = sincronizar(de(['verstappen']), VACIOS);

    expect(resultado.pilotos).toEqual(['verstappen']);
    expect(hayQueSubir).toBe(true);
  });

  it('aparato nuevo: bajan los de la cuenta, y no se vuelve a escribir', () => {
    const { resultado, hayQueSubir } = sincronizar(VACIOS, de(['norris'], ['mclaren']));

    expect(resultado.pilotos).toEqual(['norris']);
    expect(resultado.equipos).toEqual(['mclaren']);
    // Escribir lo que acaba de llegar de la cuenta es un viaje para nada.
    expect(hayQueSubir).toBe(false);
  });

  it('si ya dicen lo mismo, no se toca nada', () => {
    const iguales = de(['leclerc'], ['ferrari'], 'ferrari');
    const { hayQueSubir } = sincronizar(iguales, de(['leclerc'], ['ferrari'], 'ferrari'));

    expect(hayQueSubir).toBe(false);
  });

  it('el orden no cuenta como diferencia', () => {
    const { hayQueSubir } = sincronizar(de(['a', 'b']), de(['b', 'a']));

    expect(hayQueSubir).toBe(false);
  });

  it('cada lado con lo suyo: se juntan, y no se pierde ninguno', () => {
    // El caso que `decidirFusion` llama «preguntar». Aquí no se pregunta, pero
    // tampoco se elige: la unión no borra a nadie, y cualquier otra salida sí.
    const { resultado, hayQueSubir } = sincronizar(
      de(['verstappen'], ['red_bull']),
      de(['norris'], ['mclaren'])
    );

    expect(resultado.pilotos.sort()).toEqual(['norris', 'verstappen']);
    expect(resultado.equipos.sort()).toEqual(['mclaren', 'red_bull']);
    expect(hayQueSubir).toBe(true);
  });

  it('el acento lo gana el aparato, que es el color que se está viendo', () => {
    const { resultado } = sincronizar(
      de(['verstappen'], [], 'red_bull'),
      de(['norris'], [], 'mclaren')
    );

    expect(resultado.acento).toBe('red_bull');
  });

  it('y si el aparato no tiene acento, hereda el de la cuenta', () => {
    const { resultado } = sincronizar(de(['verstappen'], [], null), de(['norris'], [], 'mclaren'));

    expect(resultado.acento).toBe('mclaren');
  });

  it('si el aparato es un subconjunto de la cuenta, no hay nada que escribir', () => {
    // Juntar da exactamente lo que la cuenta ya tenía: subirlo seria un viaje
    // a la base para dejarla igual.
    const { resultado, hayQueSubir } = sincronizar(
      de(['norris'], [], 'mclaren'),
      de(['norris', 'piastri'], [], 'mclaren')
    );

    expect(resultado.pilotos.sort()).toEqual(['norris', 'piastri']);
    expect(hayQueSubir).toBe(false);
  });
});
