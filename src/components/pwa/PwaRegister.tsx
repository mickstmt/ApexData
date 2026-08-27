'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

/**
 * Registers the service worker and tells the user when a new version is ready.
 *
 * The update path matters more than the registration: an installed PWA can sit
 * open for days, so it also re-checks whenever the app returns to the
 * foreground. Without this, a home-screen app can stay pinned to old HTML that
 * points at chunks the server no longer has.
 */
export function PwaRegister() {
  const [updateReady, setUpdateReady] = useState(false);
  const router = useRouter();

  /**
   * El worker sirve la página guardada para que la app abra en el acto, y
   * avisa por aquí cuando la copia fresca ha llegado. `router.refresh()` vuelve
   * a pedir los componentes de servidor: los datos se ponen al día en su sitio,
   * sin recargar ni perder dónde estabas.
   */
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const alRecibir = (evento: MessageEvent) => {
      if (evento.data?.tipo === 'contenido-fresco') router.refresh();
    };

    navigator.serviceWorker.addEventListener('message', alRecibir);
    return () => navigator.serviceWorker.removeEventListener('message', alRecibir);
  }, [router]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Never register in development: the worker caches hashed chunks
    // permanently and would also outlive this app on localhost.
    if (process.env.NODE_ENV !== 'production') return;

    let registration: ServiceWorkerRegistration | undefined;

    /** La compilación que está sirviendo el servidor ahora mismo. */
    const pedirVersion = async (): Promise<string | null> => {
      try {
        const respuesta = await fetch('/api/version', { cache: 'no-store' });
        if (!respuesta.ok) return null;
        const { buildId } = (await respuesta.json()) as { buildId?: string };
        return buildId ?? null;
      } catch {
        // Sin red no se puede saber, y no pasa nada: se conserva lo registrado.
        return null;
      }
    };

    /** La versión con la que se registró el worker que está en pie. */
    let versionRegistrada: string | null = null;
    let escuchando = false;

    /**
     * Registra el worker con la versión del servidor, o lo vuelve a registrar
     * si esa versión ha cambiado.
     *
     * El nombre de las cachés sale de esa versión, así que la dirección tiene
     * que llevarla: un worker **solo se reinstala si cambian sus bytes**, y con
     * `/sw.js` a secas un despliegue que no tocara ese archivo dejaba a la app
     * instalada sirviendo HTML viejo. Con la versión en la dirección, cada
     * compilación es un worker nuevo.
     *
     * Por eso tampoco vale `registration.update()` para buscar novedades:
     * volvería a pedir la misma dirección de siempre. Hay que preguntar qué
     * compilación hay y registrar de nuevo si no es la que teníamos.
     */
    const asegurarRegistro = async () => {
      try {
        const version = await pedirVersion();

        // Sin respuesta no se toca lo que ya hay. Registrar `/sw.js` a secas
        // sería **otro worker distinto** —la dirección cambia—, y su `activate`
        // borraría las cachés de la versión buena: una petición perdida en el
        // móvil costaría la caché entera y un aviso falso de «hay versión
        // nueva». Sólo se cae a la dirección sin versión cuando aún no hay
        // nada registrado, que es mejor que quedarse sin worker.
        if (version === null && registration) return;
        if (version !== null && version === versionRegistrada) return;

        registration = await navigator.serviceWorker.register(
          version ? `/sw.js?v=${encodeURIComponent(version)}` : '/sw.js',
          { scope: '/' }
        );
        versionRegistrada = version;

        // El oyente se engancha una sola vez: `register()` devuelve siempre la
        // misma inscripción para el mismo ámbito, así que repetirlo dispararía
        // el aviso de actualización tantas veces como registros.
        if (!escuchando) {
          escuchando = true;
          registration.addEventListener('updatefound', () => {
            const installing = registration?.installing;
            if (!installing) return;

            installing.addEventListener('statechange', () => {
              // Checked at `installed`, before activation: a controller can only
              // exist at that point if a previous worker was already running, so
              // this is an update rather than the first install. Waiting for
              // `activated` would be too late — the worker calls clients.claim(),
              // which sets the controller and would fire this on every install.
              if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateReady(true);
              }
            });
          });
        }
      } catch (error) {
        console.error('[PWA] No se pudo registrar el service worker:', error);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void asegurarRegistro();
    };

    const register = async () => {
      await asegurarRegistro();
      document.addEventListener('visibilitychange', onVisibilityChange);
    };

    if (document.readyState === 'complete') {
      void register();
    } else {
      window.addEventListener('load', register, { once: true });
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  if (!updateReady) return null;

  return (
    <div className="fixed inset-x-4 z-[60] flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-lg bottom-[calc(5rem+env(safe-area-inset-bottom))] md:inset-x-auto md:right-6 md:bottom-6 md:max-w-sm">
      <RefreshCw className="h-5 w-5 shrink-0 text-primary" />
      <p className="flex-1 text-sm">Hay una versión nueva de ApexData.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Actualizar
      </button>
    </div>
  );
}
