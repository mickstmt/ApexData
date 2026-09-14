'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { signIn, signOut } from 'next-auth/react';
import { Bell, LogOut, Moon, Settings, Sun, User } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Los ajustes de la app, detrás de un engranaje.
 *
 * ## Por qué un panel y no botones sueltos
 *
 * La cabecera tenía un interruptor de tema suelto, y cuando llegó la cuenta la
 * primera idea fue ponerle otro botón al lado. El usuario lo cortó: en las apps
 * que trajo de referencia —FotMob, Flashscore— la cuenta no es un icono en la
 * cabecera, es la primera fila de un panel de ajustes, y el tema es OTRA fila
 * del mismo panel. Es la diferencia entre una cabecera que va acumulando
 * iconos y una que tiene un sitio donde van las cosas que se tocan una vez.
 *
 * ## Por qué es un menú anclado y no una hoja modal
 *
 * Porque nace de un botón que está arriba a la derecha y vuelve a él. Una hoja
 * que sube desde abajo —la que usa el menú de secciones— tiene sentido cuando
 * la abre el pulgar desde la barra inferior; aquí dejaría el origen del gesto
 * fuera de la vista. Eso obliga a escribir a mano lo que `<dialog>` regala, y
 * es lo que hay debajo: `Escape`, cerrar al tocar fuera, cerrar al salir
 * tabulando y el foco devuelto al engranaje.
 *
 * ## Qué NO tiene
 *
 * No hay zona horaria: la app usa la del aparato y no hay nada que elegir.
 * «Avisos» no es un interruptor aquí sino un enlace, porque el control de
 * verdad —con las siete sesiones del fin de semana— vive en Favoritos y
 * duplicarlo sería tener dos mandos para lo mismo.
 */

/** Lo que el armazón sabe de quien ha entrado. `null` es «no ha entrado». */
export interface Cuenta {
  nombre: string | null;
  correo: string | null;
  foto: string | null;
}

/** La inicial para cuando Google no da foto, o el navegador no la carga. */
function inicial(cuenta: Cuenta): string {
  const texto = cuenta.nombre ?? cuenta.correo ?? '';
  return texto.trim().charAt(0).toUpperCase() || '?';
}

export function PanelDeAjustes({
  cuenta,
  hayCuentas,
}: {
  cuenta: Cuenta | null;
  /** Sin credenciales de Google no hay a dónde ir, así que no se ofrece. */
  hayCuentas: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;

    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      setAbierto(false);
      boton.current?.focus();
    };

    // `pointerdown` y no `click`: con `click` el panel se cerraba DESPUÉS de
    // que el navegador decidiera a quién iba dirigido, así que tocar fuera
    // sobre un enlace lo seguía activando.
    const alTocar = (evento: PointerEvent) => {
      if (caja.current?.contains(evento.target as Node)) return;
      setAbierto(false);
    };

    document.addEventListener('keydown', alPulsar);
    document.addEventListener('pointerdown', alTocar);
    return () => {
      document.removeEventListener('keydown', alPulsar);
      document.removeEventListener('pointerdown', alTocar);
    };
  }, [abierto]);

  return (
    <div
      ref={caja}
      className="relative"
      // Tabular hasta salirse del panel lo cierra. Sin esto, el foco seguía
      // avanzando por la página de detrás con el panel abierto encima.
      onBlur={(evento) => {
        if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) setAbierto(false);
      }}
    >
      <button
        ref={boton}
        type="button"
        onClick={() => setAbierto((estaba) => !estaba)}
        aria-expanded={abierto}
        aria-haspopup="dialog"
        aria-controls="panel-de-ajustes"
        aria-label="Ajustes"
        className="flex h-11 w-11 items-center justify-center rounded-md border border-input bg-background text-foreground ring-offset-background transition-colors hover:border-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-9 md:w-9"
      >
        <Settings className="h-5 w-5" aria-hidden />
      </button>

      {abierto && (
        <div
          id="panel-de-ajustes"
          role="dialog"
          aria-label="Ajustes"
          // Anclado al botón, y nunca más ancho que la pantalla: en un iPhone
          // de 390 un panel de 288 pegado a la derecha cabe, pero el margen de
          // seguridad evita que un idioma largo lo saque por el borde.
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[288px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-2xl"
        >
          {cuenta ? (
            <FilaDeCuenta cuenta={cuenta} />
          ) : hayCuentas ? (
            <button
              type="button"
              onClick={() => signIn('google')}
              className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left ring-offset-background transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/[0.16] text-primary"
              >
                <User className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">Entrar</span>
                <span className="block text-xs text-muted-foreground">
                  Para que tus favoritos te sigan
                </span>
              </span>
            </button>
          ) : null}

          {(cuenta || hayCuentas) && <Separador />}

          <FilaDelTema />

          <Link
            href="/favorites"
            onClick={() => setAbierto(false)}
            className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm ring-offset-background transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Bell className="h-[17px] w-[17px] shrink-0 text-muted-foreground" aria-hidden />
            Avisos
            <span className="ml-auto text-xs text-muted-foreground">En Favoritos</span>
          </Link>

          {cuenta && (
            <>
              <Separador />
              <button
                type="button"
                onClick={() => signOut()}
                className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm ring-offset-background transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <LogOut className="h-[17px] w-[17px] shrink-0 text-muted-foreground" aria-hidden />
                Salir
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Separador() {
  return <span aria-hidden className="mx-1 my-2 block h-px bg-border" />;
}

function FilaDeCuenta({ cuenta }: { cuenta: Cuenta }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3">
      {/* Un `<img>` normal y no `next/image`: la foto viene del dominio de
          Google y meterla por el optimizador obligaría a abrirle un hueco en
          `remotePatterns` y a pagar una transformación por cada visita, para
          una miniatura de 36 px que Google ya sirve del tamaño pedido. */}
      {cuenta.foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cuenta.foto}
          alt=""
          width={36}
          height={36}
          referrerPolicy="no-referrer"
          className="h-9 w-9 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/[0.16] font-display text-sm font-bold text-primary"
        >
          {inicial(cuenta)}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">
          {cuenta.nombre ?? 'Tu cuenta'}
        </span>
        {cuenta.correo && (
          <span className="block truncate text-xs text-muted-foreground">{cuenta.correo}</span>
        )}
      </span>
    </div>
  );
}

/**
 * El tema, como fila del panel y no como botón suelto.
 *
 * Dos segmentos y no un interruptor de encendido: un interruptor obliga a
 * deducir qué pasa al tocarlo, y aquí se ve cuál de los dos está puesto. Lo
 * que se marca es `resolvedTheme` —el que se está viendo—, no `theme`, que
 * vale «system» mientras nadie elige.
 */
function FilaDelTema() {
  const [montado, setMontado] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMontado(true);
  }, []);

  const oscuro = resolvedTheme === 'dark';

  return (
    <div className="flex min-h-[44px] items-center gap-3 px-3">
      <Sun className="h-[17px] w-[17px] shrink-0 text-muted-foreground" aria-hidden />
      <span className="text-sm">Tema</span>
      <div
        role="group"
        aria-label="Tema"
        className="ml-auto flex gap-0.5 rounded-full border border-input p-0.5"
      >
        {([
          ['light', 'Claro', Sun],
          ['dark', 'Oscuro', Moon],
        ] as const).map(([valor, etiqueta, Icono]) => {
          // Hasta que monta no se sabe cuál está puesto, y marcar uno al azar
          // provocaría un parpadeo en cuanto se supiera.
          const puesto = montado && (valor === 'dark') === oscuro;

          return (
            <button
              key={valor}
              type="button"
              onClick={() => setTheme(valor)}
              aria-pressed={puesto}
              className={cn(
                'flex h-7 w-8 items-center justify-center rounded-full ring-offset-background transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                puesto ? 'bg-primary/[0.16] text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icono className="h-[14px] w-[14px]" aria-hidden />
              <span className="sr-only">{etiqueta}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
