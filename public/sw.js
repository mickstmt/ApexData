// ApexData service worker
//
// Strategies:
//   /_next/static/*        cache-first  (immutable, hashed filenames)
//   /images/*, /icons/*    stale-while-revalidate (driver photos, layouts, flags)
//   /api/*                 network-only (never serve stale F1 data)
//   navigations            cache-first con revalidación en segundo plano
//
// Bump the cache version on any release that changes page HTML or chunk URLs,
// otherwise an installed app can keep serving HTML that references deleted JS.
const CACHE_STATIC = 'apexdata-static-v3';
const CACHE_PAGES = 'apexdata-pages-v3';

const OFFLINE_URL = '/offline';
const INICIO_URL = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_PAGES)
      .then(async (cache) => {
        // Deliberately not cache.addAll: that is atomic, so a single non-2xx
        // response would fail the install and leave the app with no worker.
        // También la portada: es el `start_url`, así que es lo que se abre al
        // tocar el icono. Sin ella, la primera apertura después de instalar
        // sigue esperando a la red con la pantalla en negro.
        for (const ruta of [OFFLINE_URL, INICIO_URL]) {
          try {
            const response = await fetch(ruta, { cache: 'reload' });
            if (response.ok) await cache.put(ruta, response);
          } catch (error) {
            console.error(`[SW] No se pudo precachear ${ruta}:`, error);
          }
        }
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const current = new Set([CACHE_STATIC, CACHE_PAGES]);

  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !current.has(key)).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;
  if (request.method !== 'GET') return;

  // Live data must never come from cache.
  if (url.pathname.startsWith('/api/')) return;

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  // Los coches llevan el año en el nombre, así que un archivo nunca cambia:
  // pedirlos otra vez para que el servidor conteste «no ha cambiado» son once
  // idas y vueltas de latencia móvil por cada visita a la rejilla, gastadas en
  // algo que por definición es el mismo. Van a caché primero y no se revalidan.
  if (url.pathname.startsWith('/images/cars/')) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  if (
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/splash/') ||
    url.pathname.startsWith('/_next/image') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/icon.svg'
  ) {
    event.respondWith(staleWhileRevalidate(event, CACHE_STATIC));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(paginaGuardadaPrimero(event));
  }
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 504, statusText: 'Sin conexión' });
  }
}

async function staleWhileRevalidate(event, cacheName) {
  const { request } = event;
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const network = fetch(request).then(async (response) => {
    if (response.ok) await cache.put(request, response.clone());
    return response;
  });

  if (cached) {
    // Keep the worker alive until the refresh lands, otherwise an asset can
    // stay stale forever because the update was cut short.
    event.waitUntil(network.catch(() => undefined));
    return cached;
  }

  try {
    return await network;
  } catch {
    // Nothing cached and the network failed: respondWith rejects on undefined.
    return new Response('', { status: 504, statusText: 'Sin conexión' });
  }
}

/**
 * Las páginas se pintan desde la caché y se refrescan por detrás.
 *
 * Antes iban a la red primero, y eso significaba que al abrir la app instalada
 * **no se podía pintar nada hasta que llegara el HTML**: medido con red lenta,
 * 2.051 ms esperando el documento y 2.108 hasta el primer pintado, con el
 * servidor en la misma máquina. En un teléfono contra el VPS eran los tres o
 * cuatro segundos de pantalla negra que se veían al abrir.
 *
 * Ahora, si hay copia guardada se devuelve al instante y la red sigue por
 * detrás; cuando la respuesta fresca llega, se avisa a la página para que
 * vuelva a pedir sus datos al servidor. Así se abre en el acto y los datos se
 * ponen al día solos un momento después.
 *
 * La contrapartida, dicha en claro: durante ese momento se ven los datos de la
 * última visita. Para una app de resultados de carreras es un intercambio que
 * compensa —la alternativa era esperar en negro—, y el HTML viejo no puede
 * quedarse pegado: el aviso de versión nueva ya existe y se dispara con el
 * ciclo del propio worker.
 */
async function paginaGuardadaPrimero(event) {
  const { request } = event;
  const cache = await caches.open(CACHE_PAGES);
  const guardada = await cache.match(request);

  const red = fetch(request).then(async (response) => {
    if (response.ok) await cache.put(request, response.clone());
    return response;
  });

  if (guardada) {
    // Hay que clonarla ahora, en el mismo tirón síncrono: en cuanto se devuelve,
    // `respondWith` consume el cuerpo y ya no se puede leer para comparar.
    const paraComparar = guardada.clone();

    event.waitUntil(
      (async () => {
        const fresca = await red.catch(() => null);
        if (!fresca || !fresca.ok) return;

        // Solo se avisa si la copia fresca **dice algo distinto**.
        //
        // Antes se avisaba en cada navegación servida desde la caché, y eso
        // disparaba un `router.refresh()` siempre: al retroceder con el gesto
        // de iOS la página reaparecía y parpadeaba una vez, sin que hubiera
        // cambiado nada. Medido contra producción, dos peticiones seguidas a
        // portada, análisis y ficha de carrera devuelven un HTML idéntico byte
        // a byte —116.803, 84.214 y 116.989 bytes—, así que comparar los
        // cuerpos distingue de verdad «llegaron datos nuevos» de «es la misma
        // página». Leer los dos cuerpos cuesta una décima y ocurre por detrás,
        // con la página ya pintada.
        const [antes, ahora] = await Promise.all([
          paraComparar.text().catch(() => null),
          fresca.clone().text().catch(() => null),
        ]);

        if (antes === null || ahora === null || antes === ahora) return;

        const ventanas = await self.clients.matchAll({ type: 'window' });
        for (const ventana of ventanas) ventana.postMessage({ tipo: 'contenido-fresco' });
      })()
    );

    return guardada;
  }

  try {
    return await red;
  } catch {
    const offline = await caches.match(OFFLINE_URL);
    return (
      offline ??
      new Response('Sin conexión', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    );
  }
}

/* ---------------------------------------------------------------------------
   Avisos push.

   El aviso llega aquí aunque la app esté cerrada: el navegador despierta al
   worker solo para esto. Por eso el contenido viaja dentro del propio aviso y
   no se pide a la red — si la conexión falla, el aviso tiene que salir igual.
   --------------------------------------------------------------------------- */
self.addEventListener('push', (event) => {
  let aviso = {
    titulo: 'ApexData',
    cuerpo: 'Hay novedades.',
    url: '/',
  };

  try {
    if (event.data) aviso = { ...aviso, ...event.data.json() };
  } catch {
    // Un aviso sin cuerpo legible sigue siendo un aviso: se enseña el genérico
    // en vez de tragárselo, que es lo que hace `showNotification` si falla.
  }

  event.waitUntil(
    self.registration.showNotification(aviso.titulo, {
      body: aviso.cuerpo,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      // La etiqueta agrupa: un aviso nuevo de la misma carrera sustituye al
      // anterior en vez de apilarse.
      tag: aviso.etiqueta || 'apexdata',
      data: { url: aviso.url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // El destino se ancla a ESTE origen, siempre.
  //
  // `new URL(x, base)` ignora la base cuando `x` es absoluta, así que una `url`
  // con `https://otro-sitio/` en la carga del aviso abriría esa página desde
  // una notificación con nuestro icono: el patrón clásico de suplantación por
  // push. Hoy la carga la construye nuestro propio guion, pero el worker es el
  // código con más privilegios del origen y no debe confiar en su entrada.
  const pedida = new URL(event.notification.data?.url || '/', self.location.origin);
  const destino =
    pedida.origin === self.location.origin ? pedida.href : `${self.location.origin}/`;

  event.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

      // Si la app ya está abierta se reutiliza esa ventana: abrir una segunda
      // deja al usuario con dos copias de la misma app.
      for (const ventana of ventanas) {
        if ('focus' in ventana) {
          await ventana.focus();
          if ('navigate' in ventana) await ventana.navigate(destino);
          return;
        }
      }

      await self.clients.openWindow(destino);
    })()
  );
});
