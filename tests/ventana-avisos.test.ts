import { describe, expect, it } from 'vitest';

import {
  ESPERA_MINUTOS,
  NADA_ANTES_DE,
  VENTANA_HORAS,
  estaEnPunto,
} from '@/lib/push/ventana';
import type { SesionOpenF1 } from '@/services/openf1/tipos';

/** Una sesión de OpenF1 recortada a lo que mira la ventana. */
function sesion(finISO: string): SesionOpenF1 {
  return {
    session_key: 1,
    session_name: 'Race',
    session_type: 'Race',
    date_start: finISO,
    date_end: finISO,
    meeting_key: 1,
    circuit_short_name: 'Monza',
    country_name: 'Italy',
    location: 'Monza',
    year: 2026,
    is_cancelled: false,
  };
}

/** Una hora concreta, y la sesión que terminó tantos minutos antes. */
function haceMinutos(minutos: number, ahora: Date): SesionOpenF1 {
  return sesion(new Date(ahora.getTime() - minutos * 60_000).toISOString());
}

const AHORA = new Date('2026-09-20T18:00:00Z');

describe('qué sesión toca avisar', () => {
  it('todavía no, si acaba de terminar', () => {
    // OpenF1 cobra por el directo hasta media hora después de la bandera: pedir
    // antes es gastar una petición que vuelve vacía.
    expect(estaEnPunto(haceMinutos(5, AHORA), AHORA)).toBe(false);
    expect(estaEnPunto(haceMinutos(ESPERA_MINUTOS - 1, AHORA), AHORA)).toBe(false);
  });

  it('sí, en cuanto pasa la espera', () => {
    expect(estaEnPunto(haceMinutos(ESPERA_MINUTOS, AHORA), AHORA)).toBe(true);
    expect(estaEnPunto(haceMinutos(90, AHORA), AHORA)).toBe(true);
  });

  it('sigue valiendo casi dos días después, por si el servidor estuvo caído', () => {
    expect(estaEnPunto(haceMinutos(VENTANA_HORAS * 60 - 1, AHORA), AHORA)).toBe(true);
  });

  it('ya no, pasada la ventana', () => {
    expect(estaEnPunto(haceMinutos(VENTANA_HORAS * 60 + 1, AHORA), AHORA)).toBe(false);
  });

  it('nunca avisa de algo que aún no ha terminado', () => {
    expect(estaEnPunto(haceMinutos(-30, AHORA), AHORA)).toBe(false);
  });

  it('una fecha ilegible no cuela', () => {
    // `new Date('lo que sea')` devuelve un objeto, no un nulo, así que hay que
    // mirarlo a mano.
    //
    // Comprobado: esta prueba pasa igual si se quita el `Number.isFinite`, y no
    // porque sea floja — es que `NaN` pierde todas las comparaciones y el
    // resultado sale falso de todas formas. La comprobación explícita se queda
    // por decir la intención, no porque cambie la respuesta. Lo que esta prueba
    // fija es el comportamiento, que es lo que importa si alguien reordena.
    expect(estaEnPunto(sesion('no es una fecha'), AHORA)).toBe(false);
  });
});

describe('la frontera con el sistema viejo', () => {
  /**
   * El fallo que esta prueba fija.
   *
   * La primera defensa era «si la tabla de avisados está vacía, anota sin
   * avisar». Sonaba bien y estaba mal: el despliegue llegó más de 48 horas
   * después de la última sesión de Monza, así que no había nada que anotar, la
   * tabla se quedó vacía, y la siguiente sesión de verdad se la habría tragado
   * en silencio. Una defensa que se come el primer aviso bueno es peor que no
   * tener defensa.
   */
  it('no avisa de sesiones anteriores a que esto existiera', () => {
    const justoAntes = new Date(NADA_ANTES_DE.getTime() - 60_000);
    const ahora = new Date(NADA_ANTES_DE.getTime() + 60 * 60_000);

    expect(estaEnPunto(sesion(justoAntes.toISOString()), ahora)).toBe(false);
  });

  it('sí avisa de las de después, aunque la tabla esté recién estrenada', () => {
    const justoDespues = new Date(NADA_ANTES_DE.getTime() + 60_000);
    const ahora = new Date(justoDespues.getTime() + (ESPERA_MINUTOS + 5) * 60_000);

    expect(estaEnPunto(sesion(justoDespues.toISOString()), ahora)).toBe(true);
  });
});
