import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OpenF1NoDisponibleError, sesionesDeTemporada } from '@/services/openf1/client';

/**
 * Qué respuestas de OpenF1 se reintentan, y por qué el 401 es una de ellas.
 *
 * El 2026-09-12 dos vueltas del reloj de avisos murieron con «OpenF1 respondió
 * 401» mientras la misma URL devolvía 200 desde una conexión doméstica a la
 * misma hora. OpenF1 no pide credenciales para datos históricos, así que ese
 * 401 no era «no tienes permiso»: era su limitador cortando las IPs compartidas
 * de los runners de GitHub. Insistir lo arregla; rendirse al primero, no.
 */
describe('los reintentos de OpenF1', () => {
  let original: typeof globalThis.fetch;

  beforeEach(() => {
    original = globalThis.fetch;
    // Sin esperas de verdad: el cliente duerme 1, 3 y 7 segundos entre intentos.
    vi.useFakeTimers();
  });

  afterEach(() => {
    globalThis.fetch = original;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /**
   * Corre una promesa dejando que los `setTimeout` del cliente venzan solos.
   *
   * La expectativa se engancha ANTES de adelantar el reloj. Al revés, el
   * rechazo ocurre sin nadie escuchando y vitest lo cuenta como error suelto
   * aunque la prueba pase — que es lo que hacía la primera versión de esto.
   */
  async function conRelojAdelantado<T>(comprobar: (tarea: Promise<T>) => Promise<unknown>, tarea: Promise<T>) {
    const enganchada = comprobar(tarea);
    await vi.runAllTimersAsync();
    await enganchada;
  }

  function respuestas(...codigos: (number | 'ok')[]) {
    const cola = [...codigos];
    return vi.fn(async () => {
      const siguiente = cola.shift() ?? 'ok';
      if (siguiente === 'ok') {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      return new Response('no', { status: siguiente });
    });
  }

  it('un 401 se reintenta, y la petición acaba bien', async () => {
    const espia = respuestas(401, 'ok');
    globalThis.fetch = espia as unknown as typeof fetch;

    await conRelojAdelantado((t) => expect(t).resolves.toEqual([]), sesionesDeTemporada(2026));
    expect(espia).toHaveBeenCalledTimes(2);
  });

  it('también el 403 y el 429, que son el mismo «vuelve luego»', async () => {
    for (const codigo of [403, 429]) {
      const espia = respuestas(codigo, 'ok');
      globalThis.fetch = espia as unknown as typeof fetch;

      await conRelojAdelantado((t) => expect(t).resolves.toEqual([]), sesionesDeTemporada(2026));
      expect(espia, `el ${codigo} no se reintentó`).toHaveBeenCalledTimes(2);
    }
  });

  it('un 400 NO se reintenta: eso no mejora por insistir', async () => {
    const espia = respuestas(400, 'ok');
    globalThis.fetch = espia as unknown as typeof fetch;

    await conRelojAdelantado(
      (t) => expect(t).rejects.toBeInstanceOf(OpenF1NoDisponibleError),
      sesionesDeTemporada(2026)
    );
    expect(espia).toHaveBeenCalledTimes(1);
  });

  it('si el 401 no se va nunca, se rinde tras los cuatro intentos', async () => {
    const espia = respuestas(401, 401, 401, 401);
    globalThis.fetch = espia as unknown as typeof fetch;

    await conRelojAdelantado(
      (t) => expect(t).rejects.toBeInstanceOf(OpenF1NoDisponibleError),
      sesionesDeTemporada(2026)
    );
    expect(espia).toHaveBeenCalledTimes(4);
  });
});
