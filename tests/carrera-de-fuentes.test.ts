import { describe, expect, it } from 'vitest';

import {
  FUENTES,
  MINUTOS_DENSOS,
  VENTANA_HORAS,
  dentroDeLaVentana,
  tocaSondear,
} from '@/lib/push/carrera-de-fuentes';

const AHORA = new Date('2026-09-11T14:00:00Z');
const haceMinutos = (m: number) => new Date(AHORA.getTime() - m * 60_000).toISOString();

describe('la ventana en que se sondea a las fuentes', () => {
  it('empieza en el segundo cero, no a los treinta minutos', () => {
    // OpenF1 declara que publica media hora después. Empezar a sondear en ese
    // momento daría por buena su propia afirmación en vez de medirla, y es
    // justo lo que este experimento existe para comprobar.
    expect(dentroDeLaVentana(haceMinutos(0), AHORA)).toBe(true);
    expect(dentroDeLaVentana(haceMinutos(1), AHORA)).toBe(true);
  });

  it('no sondea sesiones que aún no han terminado', () => {
    expect(dentroDeLaVentana(haceMinutos(-10), AHORA)).toBe(false);
  });

  it('deja de sondear pasadas las ocho horas', () => {
    expect(dentroDeLaVentana(haceMinutos(VENTANA_HORAS * 60 - 1), AHORA)).toBe(true);
    expect(dentroDeLaVentana(haceMinutos(VENTANA_HORAS * 60 + 1), AHORA)).toBe(false);
  });

  it('una fecha ilegible no entra', () => {
    expect(dentroDeLaVentana('no es una fecha', AHORA)).toBe(false);
  });

  it('compiten exactamente dos', () => {
    expect([...FUENTES]).toEqual(['openf1', 'fastf1']);
  });
});

/**
 * La cadencia: el fallo que dejó las dos primeras medidas sin valor.
 *
 * P1 y P2 de Madrid dieron 31 y 32 minutos con **un solo sondeo cada una**. Un
 * solo sondeo quiere decir que el primero ya encontró datos, así que lo medido
 * fue «las dos publicaron antes del minuto 31» — no cuál fue antes. Estas
 * pruebas fijan que ahora se pregunta pronto y a menudo donde está la
 * respuesta, y que se deja de insistir donde no la hay.
 */
describe('cada cuánto se pregunta', () => {
  const enMinutos = (m: number) => new Date(AHORA.getTime() - m * 60_000);

  it('la primera vez se pregunta siempre, sin esperar nada', () => {
    expect(tocaSondear('openf1', 0, null, AHORA)).toBe(true);
    expect(tocaSondear('fastf1', 0, null, AHORA)).toBe(true);
  });

  it('a OpenF1 se le pregunta cada minuto: es una petición JSON', () => {
    // Con el sondeo de cinco minutos, dos fuentes que publican con medio minuto
    // de diferencia empataban por definición.
    expect(tocaSondear('openf1', 10, enMinutos(1), AHORA)).toBe(true);
    expect(tocaSondear('openf1', 10, enMinutos(0.5), AHORA)).toBe(false);
  });

  it('a FastF1 cada dos, porque cada pregunta le cuesta doce segundos', () => {
    // Medido: 12 s por sondeo sin datos, ocupando el único hueco de carga del
    // servicio. Cada minuto serían doce segundos de cada sesenta, y quien
    // estuviera pidiendo telemetría esperaría detrás.
    expect(tocaSondear('fastf1', 10, enMinutos(1), AHORA)).toBe(false);
    expect(tocaSondear('fastf1', 10, enMinutos(2), AHORA)).toBe(true);
  });

  it('un reloj que llega una pizca antes de tiempo no se salta la ronda', () => {
    // `setInterval` no es puntual: 59,9 s no puede costar un minuto entero de
    // resolución justo en la ventana que importa.
    expect(tocaSondear('openf1', 10, enMinutos(0.99), AHORA)).toBe(true);
  });

  it('pasada la primera hora las dos se espacian a cinco minutos', () => {
    // Una fuente que lleva una hora sin publicar no va a contestar por
    // preguntarle sesenta veces más.
    for (const fuente of FUENTES) {
      expect(tocaSondear(fuente, 90, enMinutos(2), AHORA)).toBe(false);
      expect(tocaSondear(fuente, 90, enMinutos(5), AHORA)).toBe(true);
    }
  });

  it('el cambio de ritmo ocurre en la frontera declarada', () => {
    expect(tocaSondear('openf1', MINUTOS_DENSOS, enMinutos(1), AHORA)).toBe(true);
    expect(tocaSondear('openf1', MINUTOS_DENSOS + 1, enMinutos(1), AHORA)).toBe(false);
  });
});
