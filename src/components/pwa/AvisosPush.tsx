'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2, Share } from 'lucide-react';
import { VAPID_PUBLICA, claveABytes } from '@/lib/push-claves';

/**
 * Encender o apagar los avisos de fin de carrera.
 *
 * Tres cosas que este control tiene que decir, y que casi ningún interruptor de
 * notificaciones dice:
 *
 * 1. **En el iPhone hay que instalar la app antes.** Safari no da avisos push a
 *    una pestaña: solo a la app añadida a la pantalla de inicio. Sin explicarlo,
 *    el botón simplemente no funcionaría y parecería roto.
 * 2. **Si el permiso está denegado, no hay nada que hacer desde aquí.** El
 *    navegador no vuelve a preguntar; hay que ir a sus ajustes. Un botón que
 *    insiste en pedir un permiso denegado no hace nada y desconcierta.
 * 3. **El permiso se pide al pulsar**, nunca al cargar la página. Pedirlo de
 *    entrada es la forma más rápida de que lo denieguen para siempre.
 */

type Estado =
  | 'cargando'
  | 'no-soportado'
  | 'instalar-primero'
  | 'apagado'
  | 'encendido'
  | 'bloqueado'
  | 'trabajando';

export function AvisosPush() {
  const [estado, setEstado] = useState<Estado>('cargando');

  useEffect(() => {
    const mirar = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setEstado('no-soportado');
        return;
      }

      const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const instalada =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as { standalone?: boolean }).standalone === true;

      if (esIOS && !instalada) {
        setEstado('instalar-primero');
        return;
      }

      if (Notification.permission === 'denied') {
        setEstado('bloqueado');
        return;
      }

      const registro = await navigator.serviceWorker.ready;
      const suscripcion = await registro.pushManager.getSubscription();
      setEstado(suscripcion ? 'encendido' : 'apagado');
    };

    void mirar().catch(() => setEstado('no-soportado'));
  }, []);

  const encender = async () => {
    setEstado('trabajando');

    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') {
      setEstado(permiso === 'denied' ? 'bloqueado' : 'apagado');
      return;
    }

    try {
      const registro = await navigator.serviceWorker.ready;
      const suscripcion = await registro.pushManager.subscribe({
        // Obligatorio en todos los navegadores: cada aviso recibido tiene que
        // acabar en algo que se vea. No se puede usar push para trabajar en
        // silencio, y está bien que sea así.
        userVisibleOnly: true,
        applicationServerKey: claveABytes(VAPID_PUBLICA),
      });

      const respuesta = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(suscripcion.toJSON()),
      });

      if (!respuesta.ok) throw new Error('El servidor no aceptó la suscripción');
      setEstado('encendido');
    } catch (error) {
      console.error('[push] No se pudo activar:', error);
      setEstado('apagado');
    }
  };

  const apagar = async () => {
    setEstado('trabajando');

    try {
      const registro = await navigator.serviceWorker.ready;
      const suscripcion = await registro.pushManager.getSubscription();

      if (suscripcion) {
        // Primero se avisa al servidor y luego se cancela: al revés, si la
        // segunda parte falla, quedaría una dirección viva en la base a la que
        // se seguiría enviando.
        await fetch('/api/push', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: suscripcion.endpoint }),
        });
        await suscripcion.unsubscribe();
      }

      setEstado('apagado');
    } catch (error) {
      console.error('[push] No se pudo desactivar:', error);
      setEstado('encendido');
    }
  };

  if (estado === 'cargando' || estado === 'no-soportado') return null;

  return (
    <section className="mb-10 rounded-xl border border-border bg-card p-5">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
        <Bell className="h-5 w-5 text-primary" aria-hidden />
        Avisos de carrera
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Un aviso cuando termine cada Gran Premio, con quién ganó. Nada más: ni resúmenes, ni
        recordatorios, ni promociones.
      </p>

      {estado === 'instalar-primero' && (
        <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <Share className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            En el iPhone los avisos solo funcionan con la app instalada. Toca <b>Compartir</b> y
            luego <b>Añadir a pantalla de inicio</b>; después vuelve aquí.
          </span>
        </p>
      )}

      {estado === 'bloqueado' && (
        <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          Los avisos están bloqueados para ApexData. El navegador no vuelve a preguntar, así que
          hay que permitirlos desde sus ajustes de notificaciones.
        </p>
      )}

      {(estado === 'apagado' || estado === 'encendido' || estado === 'trabajando') && (
        <button
          type="button"
          onClick={estado === 'encendido' ? apagar : encender}
          disabled={estado === 'trabajando'}
          aria-busy={estado === 'trabajando'}
          className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-5 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait ${
            estado === 'encendido'
              ? 'border-primary bg-primary/10 text-foreground'
              : 'border-input hover:border-foreground/40'
          }`}
        >
          {estado === 'trabajando' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : estado === 'encendido' ? (
            <Bell className="h-4 w-4 text-primary" aria-hidden />
          ) : (
            <BellOff className="h-4 w-4" aria-hidden />
          )}
          {estado === 'encendido' ? 'Avisos activados' : 'Activar avisos'}
        </button>
      )}
    </section>
  );
}
