import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

/**
 * Qué hace el worker al navegar, ejecutado de verdad.
 *
 * Lo que se comprueba aquí es el aviso de «hay contenido fresco», porque de él
 * cuelga un `router.refresh()` en la página. Cuando el aviso salía en **toda**
 * navegación servida desde la caché, retroceder con el gesto de iOS hacía
 * reaparecer la página y parpadear una vez sin que hubiera cambiado nada.
 */

function cargarWorker() {
  const codigo = readFileSync(join(process.cwd(), 'public', 'sw.js'), 'utf8');

  const escuchadores: Record<string, (evento: unknown) => void> = {};
  const guardadas = new Map<string, Response>();
  const ventana = { postMessage: vi.fn() };

  const cache = {
    match: async (peticion: { url: string }) => guardadas.get(peticion.url),
    put: async (peticion: { url: string }, respuesta: Response) => {
      guardadas.set(peticion.url, respuesta);
    },
  };

  const self = {
    addEventListener: (evento: string, fn: (evento: unknown) => void) => {
      escuchadores[evento] = fn;
    },
    location: {
      origin: 'https://apexdata.meeks.fun',
      // El worker se registra con la version de la compilacion en la
      // direccion, y de ahi saca el nombre de sus caches.
      href: 'https://apexdata.meeks.fun/sw.js?v=prueba',
      search: '?v=prueba',
    },
    registration: { showNotification: vi.fn() },
    clients: { matchAll: vi.fn().mockResolvedValue([ventana]), claim: vi.fn() },
    skipWaiting: vi.fn(),
  };

  const caches = {
    open: vi.fn().mockResolvedValue(cache),
    match: vi.fn(),
    keys: vi.fn().mockResolvedValue([]),
  };

  const red = vi.fn();

  new Function('self', 'caches', 'fetch', codigo)(self, caches, red);

  return { escuchadores, guardadas, ventana, red };
}

function pagina(html: string) {
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html' } });
}

/** Una navegación, como la que entrega el navegador al abrir o al retroceder. */
async function navegar(
  worker: ReturnType<typeof cargarWorker>,
  url = 'https://apexdata.meeks.fun/results/2026/12'
) {
  const esperas: Promise<unknown>[] = [];
  let respuesta: Promise<Response> | undefined;

  worker.escuchadores.fetch({
    request: { url, method: 'GET', mode: 'navigate' },
    respondWith: (valor: Promise<Response>) => {
      respuesta = valor;
    },
    waitUntil: (promesa: Promise<unknown>) => esperas.push(promesa),
  });

  const servida = await respuesta!;
  await Promise.all(esperas);

  return servida;
}

describe('el worker al navegar', () => {
  it('sirve la copia guardada en el acto', async () => {
    const worker = cargarWorker();
    worker.guardadas.set('https://apexdata.meeks.fun/results/2026/12', pagina('<p>vieja</p>'));
    worker.red.mockResolvedValue(pagina('<p>vieja</p>'));

    const servida = await navegar(worker);

    expect(await servida.text()).toBe('<p>vieja</p>');
  });

  it('no avisa si la copia fresca dice lo mismo', async () => {
    // El caso del gesto de retroceder: la página no ha cambiado, así que no hay
    // nada que refrescar y no debe parpadear.
    const worker = cargarWorker();
    worker.guardadas.set('https://apexdata.meeks.fun/results/2026/12', pagina('<p>igual</p>'));
    worker.red.mockResolvedValue(pagina('<p>igual</p>'));

    await navegar(worker);

    expect(worker.ventana.postMessage).not.toHaveBeenCalled();
  });

  it('avisa cuando la copia fresca trae algo distinto', async () => {
    const worker = cargarWorker();
    worker.guardadas.set('https://apexdata.meeks.fun/results/2026/12', pagina('<p>sin resultados</p>'));
    worker.red.mockResolvedValue(pagina('<p>gana Russell</p>'));

    await navegar(worker);

    expect(worker.ventana.postMessage).toHaveBeenCalledWith({ tipo: 'contenido-fresco' });
  });

  it('no avisa si la red falla', async () => {
    const worker = cargarWorker();
    worker.guardadas.set('https://apexdata.meeks.fun/results/2026/12', pagina('<p>vieja</p>'));
    worker.red.mockRejectedValue(new Error('sin conexión'));

    const servida = await navegar(worker);

    expect(await servida.text()).toBe('<p>vieja</p>');
    expect(worker.ventana.postMessage).not.toHaveBeenCalled();
  });

  it('sin copia guardada va a la red y no avisa de nada', async () => {
    const worker = cargarWorker();
    worker.red.mockResolvedValue(pagina('<p>primera visita</p>'));

    const servida = await navegar(worker);

    expect(await servida.text()).toBe('<p>primera visita</p>');
    expect(worker.ventana.postMessage).not.toHaveBeenCalled();
  });

  it('las peticiones a la API nunca pasan por la caché', async () => {
    const worker = cargarWorker();
    let respondio = false;

    worker.escuchadores.fetch({
      request: {
        url: 'https://apexdata.meeks.fun/api/clasificacion/2026/12/SQ',
        method: 'GET',
        mode: 'cors',
      },
      respondWith: () => {
        respondio = true;
      },
      waitUntil: () => undefined,
    });

    expect(respondio).toBe(false);
  });
});
