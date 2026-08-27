import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

/**
 * El manejo de avisos del service worker, ejecutado de verdad.
 *
 * No se puede comprobar en un navegador automatizado: se entrega el push por
 * CDP y llega, pero un Chromium sin escritorio no tiene dónde enseñar la
 * notificación, así que `getNotifications()` vuelve vacío y no se demuestra
 * nada. Aquí se carga `public/sw.js` con un `self` de mentira, se le entrega un
 * evento y se mira qué hace — que es exactamente el contrato que importa.
 */

interface Escuchadores {
  [evento: string]: (evento: unknown) => void;
}

function cargarWorker() {
  const codigo = readFileSync(join(process.cwd(), 'public', 'sw.js'), 'utf8');

  const escuchadores: Escuchadores = {};
  const mostrar = vi.fn().mockResolvedValue(undefined);
  const abrirVentana = vi.fn().mockResolvedValue(undefined);
  const ventanas: Array<{ focus: ReturnType<typeof vi.fn>; navigate: ReturnType<typeof vi.fn> }> = [];

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
    registration: { showNotification: mostrar },
    clients: {
      matchAll: vi.fn().mockImplementation(() => Promise.resolve(ventanas)),
      claim: vi.fn(),
      openWindow: abrirVentana,
    },
    skipWaiting: vi.fn(),
    caches: { open: vi.fn(), match: vi.fn(), keys: vi.fn().mockResolvedValue([]) },
  };

  // `caches` y `fetch` son globales dentro del worker, no propiedades de `self`.
  new Function('self', 'caches', 'fetch', codigo)(self, self.caches, vi.fn());

  return { escuchadores, mostrar, abrirVentana, ventanas };
}

/** Un evento de push como el que entrega el navegador. */
function eventoPush(datos: unknown) {
  const esperas: Promise<unknown>[] = [];
  return {
    evento: {
      data: { json: () => datos },
      waitUntil: (promesa: Promise<unknown>) => esperas.push(promesa),
    },
    esperas,
  };
}

describe('el worker al recibir un aviso', () => {
  it('enseña la carrera, el ganador y a dónde lleva', async () => {
    const { escuchadores, mostrar } = cargarWorker();

    const { evento, esperas } = eventoPush({
      titulo: 'Gran Premio de Hungría 2026',
      cuerpo: 'Ganó Lando Norris (McLaren).',
      url: '/results/2026/11',
      etiqueta: 'carrera-2026-11',
    });

    escuchadores.push(evento);
    await Promise.all(esperas);

    expect(mostrar).toHaveBeenCalledTimes(1);
    const [titulo, opciones] = mostrar.mock.calls[0];
    expect(titulo).toBe('Gran Premio de Hungría 2026');
    expect(opciones.body).toBe('Ganó Lando Norris (McLaren).');
    // La etiqueta agrupa: dos avisos de la misma carrera no se apilan.
    expect(opciones.tag).toBe('carrera-2026-11');
    expect(opciones.data.url).toBe('/results/2026/11');
  });

  it('con un cuerpo ilegible enseña el aviso genérico en vez de tragárselo', async () => {
    const { escuchadores, mostrar } = cargarWorker();

    const esperas: Promise<unknown>[] = [];
    escuchadores.push({
      data: {
        json: () => {
          throw new Error('esto no es JSON');
        },
      },
      waitUntil: (p: Promise<unknown>) => esperas.push(p),
    });
    await Promise.all(esperas);

    expect(mostrar).toHaveBeenCalledTimes(1);
    expect(mostrar.mock.calls[0][0]).toBe('ApexData');
  });
});

describe('el worker al tocar el aviso', () => {
  it('reutiliza la ventana abierta en vez de abrir una segunda', async () => {
    const { escuchadores, ventanas, abrirVentana } = cargarWorker();

    const ventana = { focus: vi.fn().mockResolvedValue(undefined), navigate: vi.fn().mockResolvedValue(undefined) };
    ventanas.push(ventana);

    const esperas: Promise<unknown>[] = [];
    escuchadores.notificationclick({
      notification: { close: vi.fn(), data: { url: '/results/2026/11' } },
      waitUntil: (p: Promise<unknown>) => esperas.push(p),
    });
    await Promise.all(esperas);

    expect(ventana.focus).toHaveBeenCalled();
    expect(ventana.navigate).toHaveBeenCalledWith('https://apexdata.meeks.fun/results/2026/11');
    expect(abrirVentana).not.toHaveBeenCalled();
  });

  it('sin ninguna ventana abierta, abre una', async () => {
    const { escuchadores, abrirVentana } = cargarWorker();

    const esperas: Promise<unknown>[] = [];
    escuchadores.notificationclick({
      notification: { close: vi.fn(), data: { url: '/standings' } },
      waitUntil: (p: Promise<unknown>) => esperas.push(p),
    });
    await Promise.all(esperas);

    expect(abrirVentana).toHaveBeenCalledWith('https://apexdata.meeks.fun/standings');
  });
});
