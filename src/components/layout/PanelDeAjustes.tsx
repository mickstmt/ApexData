'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { signIn, signOut } from 'next-auth/react';
import { Bell, Check, LogOut, Loader2, Mail, Moon, Settings, Sun } from 'lucide-react';
import type { ViasDeAcceso } from '@/lib/cuentas/disponible';

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
}

/**
 * La inicial, y por qué no la foto de Google.
 *
 * La sesión trae la URL de la foto, y se llegó a pintar: salía rota. La
 * política de contenido de la app declara `img-src 'self' data: blob:`, así que
 * el navegador bloquea cualquier imagen de otro dominio —incluido
 * `lh3.googleusercontent.com`— sin decir nada en pantalla.
 *
 * Enseñarla de verdad significa abrirle la política a un dominio de Google y
 * pedirle una imagen a Google en cada página que se abra. Eso es una decisión
 * del usuario, no mía, así que hasta que la tome va la inicial: no depende de
 * nadie de fuera y no se rompe.
 */
function inicial(cuenta: Cuenta): string {
  const texto = cuenta.nombre ?? cuenta.correo ?? '';
  return texto.trim().charAt(0).toUpperCase() || '?';
}

/**
 * La «G» de Google, dibujada aquí.
 *
 * Va inline y no como archivo por lo mismo que la foto no se pinta: la política
 * de contenido solo deja imágenes propias. Y Google pide su marca en el botón
 * que lleva a su pantalla, así que dibujarla es la forma de cumplir sin abrir
 * nada.
 */
function MarcaGoogle() {
  return (
    <svg viewBox="0 0 48 48" className="h-[18px] w-[18px]" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17Z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46Z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7Z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07Z"
      />
    </svg>
  );
}

export function PanelDeAjustes({
  cuenta,
  vias,
}: {
  cuenta: Cuenta | null;
  /** Qué vías de acceso existen hoy. No se ofrece lo que no está configurado. */
  vias: ViasDeAcceso;
}) {
  const hayCuentas = vias.google || vias.correo;
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
          ) : vias.google ? (
            /**
             * «Iniciar sesión con Google», y no «Entrar».
             *
             * «Entrar» lo escribí yo y el usuario lo cuestionó con razón: no
             * dice a dónde se entra ni qué va a pedir, y no es lo que usa
             * nadie. Un botón tiene que decir exactamente lo que pasa al
             * pulsarlo, y lo que pasa es que se abre la pantalla de Google.
             * Cuando exista el correo como segunda vía habrá dos filas, cada
             * una diciendo la suya.
             */
            <button
              type="button"
              onClick={() => signIn('google')}
              className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left ring-offset-background transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background"
              >
                <MarcaGoogle />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">Iniciar sesión con Google</span>
                <span className="block text-xs text-muted-foreground">
                  Para que tus favoritos te sigan
                </span>
              </span>
            </button>
          ) : null}

          {!cuenta && vias.correo && <AccesoPorCorreo conGoogle={vias.google} />}

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


/**
 * Entrar con el correo, sin contraseña.
 *
 * ## Por qué no pide contraseña
 *
 * Porque no hay ninguna que pedir: se escribe la dirección, llega un enlace y
 * al pulsarlo se entra. Nadie tiene que inventarse una contraseña para una app
 * de resultados de Fórmula 1, y aquí no se custodia el secreto de nadie.
 *
 * ## Por qué el aviso se queda dentro del panel
 *
 * `signIn` de next-auth lleva por defecto a una página suya que dice «Check
 * your email» en inglés. Con `redirect: false` el envío se resuelve aquí y la
 * confirmación sale donde estaba la mano, sin salir de la página ni cambiar de
 * idioma.
 */
function AccesoPorCorreo({ conGoogle }: { conGoogle: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [correo, setCorreo] = useState('');
  const [estado, setEstado] = useState<'quieto' | 'enviando' | 'enviado' | 'falló'>('quieto');

  if (estado === 'enviado') {
    return (
      <p className="mt-2 flex items-start gap-2.5 rounded-xl border border-border bg-primary/[0.07] p-3 text-[12.5px] leading-relaxed">
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span>
          Te hemos enviado un enlace a <strong className="font-semibold">{correo}</strong>. Ábrelo
          desde este mismo aparato y entrarás.
        </span>
      </p>
    );
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="mt-2 flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left ring-offset-background transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground"
        >
          <Mail className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">
            {conGoogle ? 'O con tu correo' : 'Entrar con tu correo'}
          </span>
          <span className="block text-xs text-muted-foreground">Sin contraseña: te llega un enlace</span>
        </span>
      </button>
    );
  }

  return (
    <form
      className="mt-2 rounded-xl border border-border p-3"
      onSubmit={async (evento) => {
        evento.preventDefault();
        setEstado('enviando');

        // `redirect: false` para que la confirmación salga aquí. Un fallo de
        // red no puede quedarse en silencio: el botón volvería a decir «enviar»
        // y parecería que no se pulsó.
        const salida = await signIn('email', { email: correo, redirect: false });
        setEstado(salida?.ok ? 'enviado' : 'falló');
      }}
    >
      <label htmlFor="correo-de-acceso" className="mb-1.5 block text-xs text-muted-foreground">
        Tu correo
      </label>
      <input
        id="correo-de-acceso"
        name="email"
        type="email"
        required
        autoComplete="email"
        autoFocus
        value={correo}
        onChange={(evento) => setCorreo(evento.target.value)}
        placeholder="tu@correo.com"
        // 16 px de letra: por debajo de eso, Safari en el iPhone hace zoom al
        // enfocar el campo y deja la página torcida.
        className="mb-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm"
      />

      <button
        type="submit"
        disabled={estado === 'enviando'}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground ring-offset-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60 md:h-10"
      >
        {estado === 'enviando' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {estado === 'enviando' ? 'Enviando…' : 'Enviarme el enlace'}
      </button>

      {estado === 'falló' && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          No se pudo enviar el enlace. Comprueba la dirección y vuelve a intentarlo.
        </p>
      )}
    </form>
  );
}

function Separador() {
  return <span aria-hidden className="mx-1 my-2 block h-px bg-border" />;
}

function FilaDeCuenta({ cuenta }: { cuenta: Cuenta }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3">
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/[0.16] font-display text-sm font-bold text-primary"
      >
        {inicial(cuenta)}
      </span>
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
