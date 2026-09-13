import { describe, expect, it } from 'vitest';
import { estaFuera, paradasDeLaCarrera, INSTANTES_QUIETO } from '@/lib/replay/progreso';
import { relojDeCarrera } from '@/lib/replay/estados';
import type { PositionsTrackStatus } from '@/types';

/**
 * Quién se ha quedado fuera, con una bandera roja de por medio.
 *
 * Medido en Italia 2026 antes del arreglo: en el minuto 35:32 se daban por
 * retirados **veintiún pilotos de golpe** —la parrilla entera— y otros cinco en
 * la parada de la parrilla del relanzamiento. La torre se llenaba de OUT y el
 * mapa disparaba veintiún avisos de abandono con sus ondas.
 */

const PASO = 0.25;

/**
 * Una carrera de juguete con una parada larga en medio.
 *
 * Lo importante es que al reanudar **no arrancan todos a la vez**: el líder
 * sale primero y los demás se van soltando cada quince segundos, como en una
 * vuelta de formación. De ahí sale el fallo — el líder ya avanza mientras los
 * de atrás siguen con el progreso plano de la parada.
 *
 * `parado` es el que ya no vuelve a moverse nunca.
 */
function carrera({ parado, seCaeAntes }: { parado: number; seCaeAntes?: number }) {
  const PILOTOS = 5;
  const ARRANCA = 400;
  const PARA = 1200;
  const REANUDA = PARA + 3000; // la parada dura mucho más que el minuto de corte
  const ESCALON = 60; // quince segundos entre coche y coche al reanudar
  const COUNT = REANUDA + 2000;

  const progreso = Array.from({ length: PILOTOS }, (_, i) => {
    const salida = new Float64Array(COUNT);
    const suArranque = REANUDA + i * ESCALON;
    let recorrido = 0;

    // El que se cae antes de la parada deja de moverse ahi y ya no vuelve.
    const seCae = i === seCaeAntes;
    const cuandoSeCae = PARA - 100;

    for (let k = 0; k < COUNT; k++) {
      const antesDeLaParada = k > ARRANCA && k < PARA && !(seCae && k >= cuandoSeCae);
      const yaReanudo = k >= suArranque && i !== parado && !seCae;
      if (antesDeLaParada || yaReanudo) recorrido += 10;
      salida[k] = recorrido - i * 40;
    }
    return salida;
  });

  // El dato oficial declara la roja MUCHO más corta que la parada real, que es
  // justo lo que pasa de verdad: en Italia declaró 103 s sobre 1819 s parados.
  const tramos: PositionsTrackStatus[] = [
    { status: '1', start: 0, end: PARA * PASO },
    { status: '5', start: PARA * PASO, end: (PARA + 400) * PASO },
    { status: '2', start: (PARA + 400) * PASO, end: REANUDA * PASO },
    { status: '1', start: REANUDA * PASO, end: COUNT * PASO },
  ];

  const reloj = relojDeCarrera(tramos, COUNT, PASO, progreso);
  const paradas = paradasDeLaCarrera(reloj);
  return { progreso, reloj, paradas, COUNT, PARA, REANUDA, PILOTOS };
}

describe('al reanudar tras una parada larga', () => {
  it('no da por retirada a la parrilla entera', () => {
    const { progreso, reloj, REANUDA, PILOTOS } = carrera({ parado: 3 });

    // Mientras se van soltando: todos llevan quietos mucho más de un minuto de
    // RELOJ DE PARED, que es lo que hacía saltar a los veintiuno de golpe. En
    // tiempo de carrera la ventana se salta la parada y los ve rodando antes.
    for (const k of [REANUDA + 50, REANUDA + 150, REANUDA + 220]) {
      const fuera = Array.from({ length: PILOTOS }, (_, i) => estaFuera(progreso, i, k, 0, reloj));
      expect(fuera.filter(Boolean), `en el instante ${k} alguien sobra`).toHaveLength(0);
    }
  });

  it('sin el reloj de carrera, sí los daba por retirados a todos', () => {
    // La prueba de que el arreglo es el reloj y no otra cosa: con la misma
    // carrera y sin pasarlo, el fallo reaparece.
    const { progreso, REANUDA, PILOTOS } = carrera({ parado: 3 });

    const k = REANUDA + 50;
    const fuera = Array.from({ length: PILOTOS }, (_, i) => estaFuera(progreso, i, k, 0));
    // Todos menos el líder, que ya arrancó y nunca se cuenta a sí mismo.
    expect(fuera.filter(Boolean).length).toBe(PILOTOS - 1);
  });

  it('al que de verdad no arranca sí lo da por retirado, un minuto después', () => {
    const { progreso, reloj, REANUDA, PILOTOS } = carrera({ parado: 3 });

    const k = REANUDA + INSTANTES_QUIETO + 50;
    const fuera = Array.from({ length: PILOTOS }, (_, i) => estaFuera(progreso, i, k, 0, reloj));

    expect(fuera[3], 'el que no arrancó debería estar fuera').toBe(true);
    expect(fuera.filter(Boolean), 'y solo él').toHaveLength(1);
  });
});

describe('el que ya estaba parado cuando la carrera se detuvo', () => {
  it('se da por retirado durante la parada, no media hora despues', () => {
    // Lo que dijo el usuario: «estaria mal mostrar el DNF al minuto 36 ya que
    // en realidad es al 5». Durante la detencion no se mueve nadie, asi que lo
    // unico que distingue es cuanto llevaba parado cada uno ANTES: medido en
    // Italia, 23,3 s el retirado contra 0,0 de los demas.
    const { progreso, reloj, paradas, PARA, PILOTOS } = carrera({ parado: 3, seCaeAntes: 3 });

    const k = PARA + 200; // ya dentro de la parada, pasado el minimo de 30 s
    const fuera = Array.from({ length: PILOTOS }, (_, i) =>
      estaFuera(progreso, i, k, 0, reloj, paradas)
    );

    expect(fuera[3], 'el que se cayo antes deberia estar fuera ya').toBe(true);
    expect(fuera.filter(Boolean), 'y solo el; los demas estan parados por la bandera').toHaveLength(1);
  });

  it('sin esa regla, habria que esperar a que se corriera un minuto mas', () => {
    // La prueba de que es la regla nueva y no otra cosa: sin las paradas, en
    // ese mismo instante no esta fuera.
    const { progreso, reloj, PARA } = carrera({ parado: 3, seCaeAntes: 3 });
    expect(estaFuera(progreso, 3, PARA + 200, 0, reloj)).toBe(false);
  });

  it('sigue fuera al relanzar, sin parpadear', () => {
    // Sin esto haria lo peor de todo: salir fuera durante la parada, volver a
    // entrar al arrancar los demas, y salir otra vez un minuto despues.
    const { progreso, reloj, paradas, REANUDA, PILOTOS } = carrera({ parado: 3, seCaeAntes: 3 });

    for (const k of [REANUDA + 10, REANUDA + 100, REANUDA + 400]) {
      const fuera = Array.from({ length: PILOTOS }, (_, i) =>
        estaFuera(progreso, i, k, 0, reloj, paradas)
      );
      expect(fuera[3], `en el instante ${k} deberia seguir fuera`).toBe(true);
      expect(fuera.filter(Boolean), `en el instante ${k} sobra alguien`).toHaveLength(1);
    }
  });

  it('a quien se paro solo por la bandera no lo toca', () => {
    // Nadie se cae antes: todos se paran a la vez con la bandera. Ninguno esta
    // fuera, ni durante la parada ni al reanudar.
    const { progreso, reloj, paradas, PARA, PILOTOS } = carrera({ parado: 3 });

    const fuera = Array.from({ length: PILOTOS }, (_, i) =>
      estaFuera(progreso, i, PARA + 200, 0, reloj, paradas)
    );
    expect(fuera.filter(Boolean)).toHaveLength(0);
  });
});

describe('lo que no cambia', () => {
  it('sin posición, sigue estando fuera', () => {
    const { progreso, reloj } = carrera({ parado: 3 });
    progreso[2][500] = Number.NaN;
    expect(estaFuera(progreso, 2, 500, 0, reloj)).toBe(true);
  });

  it('el líder nunca se declara retirado a sí mismo', () => {
    const { progreso, reloj, COUNT } = carrera({ parado: 0 });
    expect(estaFuera(progreso, 0, COUNT - 1, 0, reloj)).toBe(false);
  });

  it('al principio, cuando aún no se ha corrido un minuto, nadie está fuera', () => {
    const { progreso, reloj, PILOTOS } = carrera({ parado: 3 });
    const fuera = Array.from({ length: PILOTOS }, (_, i) => estaFuera(progreso, i, 100, 0, reloj));
    expect(fuera.filter(Boolean)).toHaveLength(0);
  });
});
