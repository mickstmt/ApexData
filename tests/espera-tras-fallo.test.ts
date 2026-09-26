import { beforeEach, describe, expect, it } from 'vitest';
import {
  anotarFallo,
  esperaTrasFallo,
  ESPERAS_MINUTOS,
  olvidarFallos,
  olvidarTodo,
  tocaIntentar,
} from '@/lib/push/espera-tras-fallo';

/**
 * El bucle que se alimentaba solo, medido el 2026-09-26.
 *
 * Un fallo de `clasificacionDeSesion` no marcaba la sesión, así que la vuelta
 * siguiente lo reintentaba — durante las 48 h enteras de la ventana, a ocho
 * peticiones HTTP por intento porque `/session_result` y `/drivers` van en
 * paralelo y con 401 cada una agota sus cuatro reintentos. Los avisos solos
 * eran el 66 % del tráfico a OpenF1 en un fin de semana con 401.
 */
describe('la espera tras un fallo', () => {
  beforeEach(() => olvidarTodo());

  describe('la escala', () => {
    it('sube con los fallos seguidos y se queda en el techo', () => {
      expect(esperaTrasFallo(1)).toBe(5);
      expect(esperaTrasFallo(2)).toBe(10);
      expect(esperaTrasFallo(3)).toBe(20);
      expect(esperaTrasFallo(4)).toBe(30);
      expect(esperaTrasFallo(50)).toBe(30);
    });

    it('sin fallos no se espera nada', () => {
      expect(esperaTrasFallo(0)).toBe(0);
    });

    it('el primer tropiezo no castiga: se reintenta a la vuelta siguiente', () => {
      // El reloj de avisos pasa cada cinco minutos, así que 5 significa «a la
      // siguiente». Un aviso de resultados es urgente y un fallo suelto no
      // puede costar media hora de silencio.
      expect(ESPERAS_MINUTOS[0]).toBe(5);
    });
  });

  describe('el freno', () => {
    const t = (min: number) => new Date(1_000_000 + min * 60_000);

    it('sin fallos previos, siempre toca intentarlo', () => {
      expect(tocaIntentar('openf1:11370', t(0))).toBe(true);
    });

    it('tras un fallo no se insiste hasta que pase la espera', () => {
      anotarFallo('openf1:11370', t(0));

      expect(tocaIntentar('openf1:11370', t(4))).toBe(false);
      expect(tocaIntentar('openf1:11370', t(5))).toBe(true);
    });

    it('cada fallo seguido alarga la espera', () => {
      expect(anotarFallo('openf1:11370', t(0))).toBe(5);
      expect(anotarFallo('openf1:11370', t(5))).toBe(10);
      expect(anotarFallo('openf1:11370', t(15))).toBe(20);
      expect(anotarFallo('openf1:11370', t(35))).toBe(30);
      expect(anotarFallo('openf1:11370', t(65))).toBe(30);
    });

    it('una sesión no frena a otra', () => {
      anotarFallo('openf1:11370', t(0));

      expect(tocaIntentar('openf1:11370', t(1))).toBe(false);
      expect(tocaIntentar('openf1:11371', t(1))).toBe(true);
    });

    it('cuando la fuente contesta, la racha se acaba', () => {
      anotarFallo('openf1:11370', t(0));
      anotarFallo('openf1:11370', t(5));
      olvidarFallos('openf1:11370');

      expect(tocaIntentar('openf1:11370', t(6))).toBe(true);
      // Y si volviera a fallar, empieza otra vez por abajo.
      expect(anotarFallo('openf1:11370', t(6))).toBe(5);
    });
  });

  /**
   * El número que justifica el cambio: cuántos intentos hace una sesión cuya
   * fuente no contesta nunca, durante las 48 h de su ventana.
   */
  it('recorta los intentos de una caída larga en más del 80 %', () => {
    const VENTANA_MIN = 48 * 60;
    const CADA_VUELTA = 5;

    // Como estaba: una por vuelta del reloj. Se cuenta la ventana entera
    // por simplicidad; en producción arranca en el minuto 35 y son 569.
    const antes = VENTANA_MIN / CADA_VUELTA;

    // Como queda: se cuenta simulando el reloj de cinco minutos.
    let despues = 0;
    for (let min = 0; min < VENTANA_MIN; min += CADA_VUELTA) {
      const ahora = new Date(1_000_000 + min * 60_000);
      if (!tocaIntentar('openf1:11370', ahora)) continue;

      despues++;
      anotarFallo('openf1:11370', ahora);
    }

    expect(antes).toBe(576);
    expect(despues).toBeLessThanOrEqual(100);
    expect(1 - despues / antes).toBeGreaterThan(0.8);
  });
});
