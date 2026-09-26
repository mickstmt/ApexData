import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * El calendario sobrevive a un fallo de OpenF1, y no se pide cada cinco minutos.
 *
 * Las dos cosas que esto fija nacen del mismo registro de producción: desde el
 * 2026-09-20, «[avisos] La vuelta falló: OpenF1 no contestó tras 4 intentos:
 * HTTP 401», en bucle. La vuelta empezaba pidiéndole a OpenF1 el calendario
 * entero de la temporada, así que un 401 suyo se llevaba por delante los
 * avisos, las previas y el sondeo — todo, por no poder releer una lista que
 * cambia una vez por fin de semana.
 *
 * Comprobado el 2026-09-25 que la API no está cerrada: doce peticiones seguidas
 * desde una conexión doméstica dan 200. Lo que rechazan es la IP de producción,
 * y pedirles lo mismo 288 veces al día no ayuda.
 */

const llamadas = { n: 0, falla: false };

vi.mock('@/services/openf1/client', () => ({
  sesionesDeTemporada: async (anio: number) => {
    llamadas.n++;
    if (llamadas.falla) throw new Error('OpenF1 no contestó tras 4 intentos: HTTP 401');
    return [{ session_key: 1, session_name: 'Practice 1', year: anio }];
  },
}));

describe('el calendario de la temporada', () => {
  beforeEach(async () => {
    const { olvidarCalendario } = await import('@/services/openf1/calendario');
    olvidarCalendario();
    llamadas.n = 0;
    llamadas.falla = false;
  });

  it('se pide una vez y se reutiliza durante horas', async () => {
    const { calendarioDeTemporada, VIGENCIA_MS } = await import('@/services/openf1/calendario');
    const t0 = 1_000_000;

    await calendarioDeTemporada(2026, t0);
    await calendarioDeTemporada(2026, t0 + 5 * 60_000);
    await calendarioDeTemporada(2026, t0 + VIGENCIA_MS - 1);

    // Tres vueltas del reloj, una sola petición: antes eran tres.
    expect(llamadas.n).toBe(1);
  });

  it('pasada su vigencia se vuelve a pedir', async () => {
    const { calendarioDeTemporada, VIGENCIA_MS } = await import('@/services/openf1/calendario');
    const t0 = 1_000_000;

    await calendarioDeTemporada(2026, t0);
    await calendarioDeTemporada(2026, t0 + VIGENCIA_MS + 1);

    expect(llamadas.n).toBe(2);
  });

  it('si OpenF1 falla, se sigue con el último calendario bueno', async () => {
    const { calendarioDeTemporada, VIGENCIA_MS } = await import('@/services/openf1/calendario');
    const t0 = 1_000_000;

    const bueno = await calendarioDeTemporada(2026, t0);
    llamadas.falla = true;

    // Ya caducado, así que se intenta pedir de nuevo y OpenF1 dice 401.
    const despues = await calendarioDeTemporada(2026, t0 + VIGENCIA_MS + 1);

    // Esto es lo que salva la vuelta entera: un calendario de hace seis horas
    // sigue siendo el calendario.
    expect(despues).toEqual(bueno);
  });

  it('sin ninguna copia buena, el error sube', async () => {
    const { calendarioDeTemporada } = await import('@/services/openf1/calendario');
    llamadas.falla = true;

    // Aquí sí no hay nada que hacer, y el registro tiene que decirlo en vez de
    // fingir un calendario vacío que dejaría a la vuelta sin avisar de nada.
    await expect(calendarioDeTemporada(2026, 1_000_000)).rejects.toThrow(/401/);
  });

  it('otro año no reutiliza el calendario del anterior', async () => {
    const { calendarioDeTemporada } = await import('@/services/openf1/calendario');
    const t0 = 1_000_000;

    await calendarioDeTemporada(2026, t0);
    await calendarioDeTemporada(2027, t0 + 1000);

    expect(llamadas.n).toBe(2);
  });

  /**
   * El agujero que esto tapa, medido el 2026-09-26.
   *
   * El camino de fallo devolvía la copia vieja pero **no tocaba `pedidoEn`**,
   * así que la caché seguía caducada y se volvía a preguntar en cada una de
   * las 288 vueltas del día. La caché de seis horas se apagaba sola justo
   * cuando estaba salvando la vuelta: 4 peticiones diarias se convertían en
   * 1 152, y con cuatro reintentos por 401 delante.
   */
  it('mientras OpenF1 falla no se le pregunta en cada vuelta', async () => {
    const { calendarioDeTemporada, VIGENCIA_MS, ESPERA_TRAS_FALLO_MS } = await import(
      '@/services/openf1/calendario'
    );
    const t0 = 1_000_000;

    await calendarioDeTemporada(2026, t0);
    llamadas.falla = true;

    // Caduca y falla: una petición más, y a partir de ahí se sirve lo viejo.
    const tFallo = t0 + VIGENCIA_MS + 1;
    await calendarioDeTemporada(2026, tFallo);
    expect(llamadas.n).toBe(2);

    // Cinco vueltas del reloj de cinco minutos dentro de la espera: ninguna
    // petición. Antes era una por vuelta.
    for (let i = 1; i <= 5; i++) {
      await calendarioDeTemporada(2026, tFallo + i * 5 * 60_000);
    }
    expect(llamadas.n).toBe(2);

    // Un instante antes de cumplirse la espera todavía no se pregunta.
    await calendarioDeTemporada(2026, tFallo + ESPERA_TRAS_FALLO_MS - 1);
    expect(llamadas.n).toBe(2);

    // Y al cumplirse sí, que para eso es una espera y no una rendición.
    await calendarioDeTemporada(2026, tFallo + ESPERA_TRAS_FALLO_MS);
    expect(llamadas.n).toBe(3);
  });

  it('al recuperarse, vuelve al ritmo normal', async () => {
    const { calendarioDeTemporada, VIGENCIA_MS, ESPERA_TRAS_FALLO_MS } = await import(
      '@/services/openf1/calendario'
    );
    const t0 = 1_000_000;

    await calendarioDeTemporada(2026, t0);
    llamadas.falla = true;
    const tFallo = t0 + VIGENCIA_MS + 1;
    await calendarioDeTemporada(2026, tFallo);

    llamadas.falla = false;
    const tBueno = tFallo + ESPERA_TRAS_FALLO_MS + 1;
    await calendarioDeTemporada(2026, tBueno);
    expect(llamadas.n).toBe(3);

    // Y la copia nueva vuelve a valer seis horas, no media.
    await calendarioDeTemporada(2026, tBueno + ESPERA_TRAS_FALLO_MS + 1);
    expect(llamadas.n).toBe(3);
  });
});
