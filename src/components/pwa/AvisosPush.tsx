'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, Loader2, Share } from 'lucide-react';
import { VAPID_PUBLICA, claveABytes } from '@/lib/push-claves';
import { SESIONES, TODAS_LAS_SESIONES } from '@/lib/push/redaccion';
import { useFavorites } from '@/contexts/FavoritesContext';

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

/** Las siete sesiones, en el orden en que se corren. */
const SESIONES_DEL_FIN_DE_SEMANA = Object.values(SESIONES);

const CLAVE_SESIONES = 'apexdata_sesiones_aviso';

/**
 * Qué sesiones quiere quien abre esto, con todas encendidas por defecto.
 *
 * Se lee al construir el estado y no dentro de un efecto. No hay riesgo de que
 * el servidor y el navegador pinten cosas distintas: mientras el estado es
 * «cargando» este componente no dibuja nada, y para cuando dibuja algo ya está
 * en el navegador.
 */
function sesionesGuardadas(): string[] {
  if (typeof window === 'undefined') return TODAS_LAS_SESIONES;

  try {
    const crudo = localStorage.getItem(CLAVE_SESIONES);
    if (!crudo) return TODAS_LAS_SESIONES;

    const leidas = JSON.parse(crudo) as unknown;
    if (!Array.isArray(leidas)) return TODAS_LAS_SESIONES;

    return leidas.filter((c): c is string => typeof c === 'string' && TODAS_LAS_SESIONES.includes(c));
  } catch {
    return TODAS_LAS_SESIONES;
  }
}

export function AvisosPush() {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [sesiones, setSesiones] = useState<string[]>(sesionesGuardadas);
  const { favoriteDrivers, favoriteConstructors } = useFavorites();

  /**
   * Manda al servidor la suscripción con las preferencias de esta persona.
   *
   * Va todo junto en la misma petición a propósito. Los favoritos no son un
   * ajuste aparte: son lo que permite que el aviso diga «Antonelli 5.º» en vez
   * de limitarse a quién fue el más rápido, y sin ellos el servidor no tiene
   * forma de saberlo — viven en el `localStorage` del teléfono.
   */
  const guardar = useCallback(
    async (suscripcion: PushSubscription, cuales: string[]) => {
      const respuesta = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...suscripcion.toJSON(),
          favoriteDrivers,
          favoriteConstructors,
          sessions: cuales,
          // El huso horario lo sabe el navegador y el servidor no: es lo que
          // decide a qué hora son «las 20:00» de esta persona para la previa
          // del fin de semana. Va aquí y no en una pregunta en pantalla porque
          // nadie debería tener que elegir su propio huso a mano.
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (!respuesta.ok) throw new Error('El servidor no aceptó la suscripción');
    },
    [favoriteDrivers, favoriteConstructors]
  );

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

      await guardar(suscripcion, sesiones);
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

  /**
   * Mantiene al día lo que el servidor sabe de ti.
   *
   * Los favoritos se marcan en otra pantalla y en cualquier momento, así que no
   * basta con mandarlos al activar los avisos: si mañana dejas de seguir a
   * alguien, el aviso del domingo seguiría hablando de él. El retardo agrupa
   * las ráfagas —marcar cinco pilotos seguidos es una sola petición, no cinco—.
   */
  useEffect(() => {
    if (estado !== 'encendido') return;

    const espera = setTimeout(() => {
      void (async () => {
        try {
          const registro = await navigator.serviceWorker.ready;
          const suscripcion = await registro.pushManager.getSubscription();
          if (suscripcion) await guardar(suscripcion, sesiones);
        } catch (error) {
          console.error('[push] No se pudieron guardar las preferencias:', error);
        }
      })();
    }, 800);

    return () => clearTimeout(espera);
  }, [estado, sesiones, guardar]);

  const alternarSesion = (codigo: string) => {
    setSesiones((previas) => {
      const siguientes = previas.includes(codigo)
        ? previas.filter((c) => c !== codigo)
        : [...previas, codigo];

      try {
        localStorage.setItem(CLAVE_SESIONES, JSON.stringify(siguientes));
      } catch {
        // Sin almacenamiento el ajuste dura lo que la pestaña. El servidor ya
        // lo tiene guardado, que es lo que decide qué avisos salen.
      }

      return siguientes;
    });
  };

  if (estado === 'cargando' || estado === 'no-soportado') return null;

  return (
    <section className="mb-10 rounded-xl border border-border bg-card p-5">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
        <Bell className="h-5 w-5 text-primary" aria-hidden />
        Avisos del fin de semana
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        La noche antes, a las 20:00, qué se corre mañana. Y un aviso cuando termina cada sesión,
        media hora después de la bandera. Si has marcado pilotos favoritos, los avisos hablan de
        ellos. Nada más: ni resúmenes, ni promociones.
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

      {estado === 'encendido' && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            De qué sesiones
          </p>

          <div className="flex flex-wrap gap-2">
            {SESIONES_DEL_FIN_DE_SEMANA.map((sesion) => {
              const elegida = sesiones.includes(sesion.codigo);

              return (
                <button
                  key={sesion.codigo}
                  type="button"
                  onClick={() => alternarSesion(sesion.codigo)}
                  aria-pressed={elegida}
                  className={`min-h-[44px] rounded-full border px-4 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background ${
                    elegida
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-input text-muted-foreground hover:border-foreground/40'
                  }`}
                >
                  {sesion.nombre}
                </button>
              );
            })}
          </div>

          {sesiones.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              Con ninguna encendida no llegará ningún aviso.
            </p>
          )}

          <p className="mt-3 text-sm text-muted-foreground">
            {favoriteDrivers.length === 0
              ? 'Sin pilotos favoritos, los avisos cuentan quién ganó. Marca alguno más abajo y hablarán de él.'
              : `Los avisos hablarán de tus ${favoriteDrivers.length === 1 ? 'piloto favorito' : `${favoriteDrivers.length} pilotos favoritos`}.`}
          </p>
        </div>
      )}
    </section>
  );
}
