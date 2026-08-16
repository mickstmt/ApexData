'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Never register in development: the worker caches hashed chunks
    // permanently and would also outlive this app on localhost.
    if (process.env.NODE_ENV !== 'production') return;

    let registration: ServiceWorkerRegistration | undefined;

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void registration?.update();
    };

    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

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

        document.addEventListener('visibilitychange', onVisibilityChange);
      } catch (error) {
        console.error('[PWA] No se pudo registrar el service worker:', error);
      }
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
        className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Actualizar
      </button>
    </div>
  );
}
