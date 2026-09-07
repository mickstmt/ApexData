import { describe, expect, it } from 'vitest';

import monza from './fixtures/monza-2026.json';

import {
  LIMITE_CARACTERES,
  SESIONES,
  apellido,
  diferencia,
  redactarAviso,
  quiereLaSesion,
  redactarCuerpo,
  vuelta,
  type Favorito,
  type TipoDeSesion,
} from '@/lib/push/redaccion';
import { ultimoValor } from '@/services/openf1/client';
import type { FilaDeSesion } from '@/services/openf1/tipos';

/**
 * El GP de Italia 2026, tal como lo publicó OpenF1.
 *
 * Es el fin de semana que destapó todo esto —el aviso llegó ocho horas tarde— y
 * sirve de banco de pruebas porque tiene los casos raros de verdad y no
 * inventados: tres abandonos (Stroll, Alonso y Leclerc), un piloto que no salió
 * en la Práctica 1, una pole inesperada de Gasly y un ganador, Antonelli, que
 * no venía de la primera fila.
 */
const SESION: Record<string, FilaDeSesion[]> = monza as unknown as Record<string, FilaDeSesion[]>;

const TIPOS: Record<string, TipoDeSesion> = {
  FP1: 'practica',
  FP2: 'practica',
  FP3: 'practica',
  Q: 'quali',
  R: 'carrera',
};

/** Un favorito por su código, con el nombre sacado del propio fin de semana. */
function fav(codigo: string): Favorito {
  for (const filas of Object.values(SESION)) {
    const fila = filas.find((f) => f.codigo === codigo);
    if (fila) return { codigo, nombre: fila.nombre };
  }
  throw new Error(`No hay ningún piloto con el código ${codigo} en el fijo de pruebas`);
}

function cuerpo(sesion: string, favoritos: string[]): string {
  const tipo = TIPOS[sesion];

  return redactarCuerpo({
    tipo,
    filas: SESION[sesion],
    favoritos: favoritos.map(fav),
    podio: tipo === 'carrera',
  });
}

describe('apellido', () => {
  it('quita el nombre de pila y baja las mayúsculas de OpenF1', () => {
    expect(apellido('Kimi ANTONELLI')).toBe('Antonelli');
    expect(apellido('Charles LECLERC')).toBe('Leclerc');
  });

  it('respeta los apellidos compuestos', () => {
    expect(apellido('Juan Manuel FANGIO DEL CARRIL')).toBe('Fangio Del Carril');
    expect(apellido('Jean-Eric VERGNE-DUPONT')).toBe('Vergne-Dupont');
  });

  it('se queda con lo único que hay si no hay nombre de pila', () => {
    expect(apellido('VERSTAPPEN')).toBe('Verstappen');
  });
});

describe('vuelta y diferencia', () => {
  it('escribe una vuelta como se lee en un cronómetro', () => {
    expect(vuelta(83.008)).toBe('1:23.008');
    expect(vuelta(81.786)).toBe('1:21.786');
  });

  it('da milésimas por debajo de diez segundos y décimas por encima', () => {
    expect(diferencia(0.636)).toBe('0.636');
    expect(diferencia(14.718)).toBe('14.7');
  });

  it('no inventa nada cuando no hay tiempo', () => {
    expect(vuelta(null)).toBeNull();
    expect(diferencia(null)).toBeNull();
  });
});

describe('con un solo favorito', () => {
  it('cuenta la práctica desde tu piloto, con el hueco al más rápido', () => {
    expect(cuerpo('FP1', ['ANT'])).toBe('Antonelli 5.º, a 0.636 del más rápido (Leclerc).');
  });

  it('dice que tu piloto fue el más rápido cuando lo fue', () => {
    expect(cuerpo('FP1', ['LEC'])).toBe('Leclerc fue el más rápido, 1:23.008.');
  });

  it('en clasificación habla de la parrilla, no del cronómetro', () => {
    expect(cuerpo('Q', ['ANT'])).toBe('Antonelli saldrá 7.º, a 0.307 de la pole de Gasly.');
  });

  it('celebra la pole de tu piloto', () => {
    expect(cuerpo('Q', ['GAS'])).toBe('¡Pole para Gasly! 1:21.786.');
  });

  it('cuando tu piloto gana, lo dice antes que nada', () => {
    expect(cuerpo('R', ['ANT'])).toBe(
      'Ganó Antonelli. 25 puntos para Mercedes. Detrás, Russell y Verstappen.'
    );
  });
});

describe('lo que no se puede callar', () => {
  /**
   * El fallo que motivó estas pruebas.
   *
   * La primera versión filtraba a quien no tenía puesto, así que a un
   * aficionado de Ferrari el aviso de Monza le decía «Ganó Antonelli» sin
   * mencionar que su piloto se había retirado. Era la única sesión del fin de
   * semana que había que contarle.
   */
  it('nombra el abandono de tu piloto', () => {
    expect(cuerpo('R', ['LEC'])).toBe(
      'Ganó Antonelli (Mercedes). Detrás, Russell y Verstappen. Leclerc abandonó.'
    );
  });

  it('dice cuando tu piloto ni siquiera salió a pista', () => {
    expect(cuerpo('FP1', ['VER'])).toContain('Verstappen no salió a pista');
  });
});

describe('con varios favoritos', () => {
  it('los ordena por puesto, no por el orden en que los marcaste', () => {
    expect(cuerpo('FP3', ['LEC', 'ANT'])).toBe('Más rápido: Russell. Antonelli 4.º, Leclerc 6.º.');
  });

  it('no repite a quien ya salió nombrado como líder', () => {
    const texto = cuerpo('FP1', ['LEC', 'ANT']);
    expect(texto).toBe('Leclerc fue el más rápido. Antonelli 5.º.');
    expect(texto.match(/Leclerc/g)).toHaveLength(1);
  });

  it('nombra como mucho a dos: listar tres al azar es peor que listar los mejores', () => {
    const texto = cuerpo('FP3', ['ANT', 'LEC', 'HAM']);
    expect(texto).toContain('Hamilton');
    expect(texto).toContain('Antonelli');
    expect(texto).not.toContain('Leclerc');
  });
});

describe('el presupuesto de caracteres', () => {
  it('sacrifica el podio antes que a tu piloto', () => {
    // Cuatro favoritos del fondo de la parrilla: el aviso ya no da para todo.
    const texto = cuerpo('R', ['HUL', 'BOR', 'STR', 'ALO']);

    expect(texto.length).toBeLessThanOrEqual(LIMITE_CARACTERES);
    expect(texto).toContain('Hulkenberg');
    expect(texto).toContain('Ganó Antonelli');
  });

  it('ningún aviso se corta, mire quien mire', () => {
    const codigos = SESION.FP1.map((f) => f.codigo);
    let masLargo = 0;
    let peor = '';

    // Las 1.540 combinaciones de tres favoritos, por las cinco sesiones.
    for (let a = 0; a < codigos.length; a++) {
      for (let b = a + 1; b < codigos.length; b++) {
        for (let c = b + 1; c < codigos.length; c++) {
          for (const sesion of Object.keys(SESION)) {
            const texto = cuerpo(sesion, [codigos[a], codigos[b], codigos[c]]);

            if (texto.length > masLargo) {
              masLargo = texto.length;
              peor = `${sesion}: ${texto}`;
            }
          }
        }
      }
    }

    expect(masLargo, peor).toBeLessThanOrEqual(LIMITE_CARACTERES);
  });
});

describe('sin favoritos', () => {
  it('el aviso sale igual, contando lo que pasó', () => {
    expect(cuerpo('R', [])).toBe('Ganó Antonelli (Mercedes). Detrás, Russell y Verstappen.');
    expect(cuerpo('FP1', [])).toBe('Más rápido: Leclerc.');
  });
});

describe('el aviso entero', () => {
  it('lleva la sesión y el Gran Premio en el título', () => {
    const aviso = redactarAviso({
      sesion: SESIONES['Practice 1'],
      granPremio: 'GP de Italia',
      filas: SESION.FP1,
      favoritos: [fav('ANT')],
    });

    expect(aviso.titulo).toBe('Práctica 1 · GP de Italia');
    expect(aviso.cuerpo).toBe('Antonelli 5.º, a 0.636 del más rápido (Leclerc).');
  });

  it('no mete el podio en una práctica: ahí la noticia es tu piloto', () => {
    const aviso = redactarAviso({
      sesion: SESIONES['Practice 3'],
      granPremio: 'GP de Italia',
      filas: SESION.FP3,
      favoritos: [fav('ANT')],
    });

    expect(aviso.cuerpo).not.toContain('Detrás');
  });

  it('conoce las siete sesiones de un fin de semana', () => {
    expect(Object.keys(SESIONES)).toHaveLength(7);
    expect(SESIONES.Race.tipo).toBe('carrera');
    expect(SESIONES['Sprint Qualifying'].tipo).toBe('sprint-quali');
  });
});

describe('qué sesiones quiere cada quien', () => {
  it('sin preferencia guardada, las siete', () => {
    expect(quiereLaSesion(null, 'FP1')).toBe(true);
    expect(quiereLaSesion(undefined, 'R')).toBe(true);
  });

  it('respeta la lista elegida', () => {
    expect(quiereLaSesion('Q,R', 'R')).toBe(true);
    expect(quiereLaSesion('Q,R', 'FP1')).toBe(false);
  });

  it('lista vacía es «ninguna», no «todas»', () => {
    // Quien apaga las siete no quiere recibirlas todas: quiere silencio.
    expect(quiereLaSesion('', 'R')).toBe(false);
  });

  it('aguanta los espacios de una lista escrita a mano', () => {
    expect(quiereLaSesion(' Q , R ', 'Q')).toBe(true);
  });
});

describe('el tiempo que cuenta en clasificación', () => {
  it('se queda con el último segmento al que llegó el piloto', () => {
    // OpenF1 manda un valor por segmento: quien llega a Q3 se compara con su
    // vuelta de Q3, no con la de Q1.
    expect(ultimoValor([82.612, 82.077, 81.786])).toBe(81.786);
  });

  it('salta los segmentos que no corrió', () => {
    expect(ultimoValor([83.1, null as unknown as number])).toBe(83.1);
  });

  it('deja pasar un número suelto, que es lo que llega en carrera', () => {
    expect(ultimoValor(6675.281)).toBe(6675.281);
    expect(ultimoValor(null)).toBeNull();
  });
});
