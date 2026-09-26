import { describe, expect, it } from 'vitest';
import { decimal, entero, enteroOpcional, milisegundos } from '../scripts/seed/jolpica';

/**
 * El sembrado horario estuvo fallando toda la tarde del 2026-09-26, con el GP
 * de Azerbaiyán recién corrido, porque Jolpica publicó **los resultados antes
 * que la parrilla**: `grid` llegaba vacío, `parseInt` daba `NaN` y Prisma
 * rechazaba el `Int`.
 *
 * Lo caro no fue el fallo, fue el mensaje: «Argument `race` is missing», que
 * manda a mirar la relación con la carrera cuando el `raceId` estaba puesto y
 * era correcto. Prisma, al no encajar la entrada sin comprobar por culpa del
 * `NaN`, cae a la entrada con relación y echa en falta `race`.
 *
 * Estas pruebas fijan la regla: **de aquí nunca sale un NaN**.
 */
describe('los números que llegan de Jolpica', () => {
  describe('entero', () => {
    it('lee un número normal', () => {
      expect(entero('8', 0)).toBe(8);
    });

    it('reproduce el fallo del 26: la parrilla que aún no ha llegado', () => {
      // Cómo estaba antes, y por qué Prisma se quejaba: esto es lo que se le
      // mandaba a una columna `Int`.
      expect(Number.isNaN(parseInt('', 10))).toBe(true);

      // Lo que de verdad venía en la respuesta de aquella hora.
      expect(entero('', 0)).toBe(0);
      expect(entero(undefined, 0)).toBe(0);
      expect(entero(null, 0)).toBe(0);
    });

    it('nunca devuelve NaN, ni con basura', () => {
      for (const valor of ['', ' ', 'N/A', '-', undefined, null]) {
        expect(Number.isFinite(entero(valor, 99))).toBe(true);
      }
    });

    it('conserva el cero en vez de tomarlo por ausente', () => {
      // `parseInt(x) || 99` convertía el 0 en 99. Salir del pit lane es grid 0.
      expect(entero('0', 99)).toBe(0);
    });
  });

  describe('enteroOpcional', () => {
    it('devuelve el número cuando lo hay, y null cuando no', () => {
      expect(enteroOpcional('12')).toBe(12);
      expect(enteroOpcional(undefined)).toBeNull();
      expect(enteroOpcional('')).toBeNull();
    });
  });

  describe('decimal', () => {
    it('lee los puntos, incluidos los medios', () => {
      expect(decimal('25')).toBe(25);
      expect(decimal('0.5')).toBe(0.5);
    });

    it('no deja pasar un NaN a la columna', () => {
      expect(decimal(undefined)).toBe(0);
      expect(decimal('')).toBe(0);
    });
  });

  describe('milisegundos', () => {
    it('convierte el texto a BigInt', () => {
      expect(milisegundos('5882143')).toBe(5882143n);
    });

    it('no revienta con un valor ausente o malformado', () => {
      expect(milisegundos(undefined)).toBeNull();
      expect(milisegundos('')).toBeNull();
      // `BigInt('1:38:02')` lanza; antes se llamaba sin protección.
      expect(milisegundos('1:38:02.143')).toBeNull();
    });
  });

  /**
   * La fila del ganador de Bakú, tal y como llegó cuando falló: con la
   * parrilla vacía. Es la que Prisma rechazó.
   */
  it('la fila que rompió el sembrado ahora se escribe entera', () => {
    const deJolpica = {
      position: '1',
      points: '25',
      grid: '',
      laps: '51',
      Time: { millis: '5882143' },
    };

    const fila = {
      positionOrder: entero(deJolpica.position, 99),
      points: decimal(deJolpica.points),
      grid: entero(deJolpica.grid, 0),
      laps: entero(deJolpica.laps, 0),
      milliseconds: milisegundos(deJolpica.Time?.millis),
    };

    expect(fila).toEqual({
      positionOrder: 1,
      points: 25,
      grid: 0,
      laps: 51,
      milliseconds: 5882143n,
    });

    const numeros = [fila.positionOrder, fila.points, fila.grid, fila.laps];
    expect(numeros.every(Number.isFinite)).toBe(true);
  });
});
