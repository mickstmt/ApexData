'use client';

import { useEffect } from 'react';

/**
 * Último cortafuegos: los fallos del propio layout raíz.
 *
 * `error.tsx` vive DENTRO del layout, así que no puede atrapar lo que rompa el
 * layout mismo — `ThemeProvider`, `FavoritesProvider`, las fuentes. Cuando eso
 * pasa, sin este archivo el usuario recibe la pantalla en blanco del navegador,
 * sin una palabra ni forma de salir.
 *
 * Este componente sustituye al documento entero, así que tiene que traer sus
 * propias etiquetas `html` y `body`. Por lo mismo no hereda nada del layout:
 * no hay Tailwind garantizado ni variables de tema, y por eso los estilos van
 * en línea con valores literales y un `color-scheme` que hace que el navegador
 * elija fondo claro u oscuro según el sistema.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global-error]', error);
  }, [error]);

  return (
    <html lang="es" style={{ colorScheme: 'light dark' }}>
      <head>
        {/* La hoja de estilos de la app SÍ se carga aquí, y su regla
            `body { bg-background text-foreground }` pintaba esta pantalla
            siempre en claro: el tema lo decide `ThemeProvider`, que es
            justamente lo que no ha llegado a ejecutarse. Estas reglas ganan por
            especificidad y, además, sobreviven a que el CSS de la app no cargue
            —que es un escenario perfectamente posible cuando se llega hasta
            aquí—. */}
        <style>{`
          body.apex-global-error { background: #F7F7F8; color: #151519; }
          @media (prefers-color-scheme: dark) {
            body.apex-global-error { background: #0B0B0F; color: #F5F5F7; }
          }
        `}</style>
      </head>
      <body
        className="apex-global-error"
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
          lineHeight: 1.6,
        }}
      >
        <main style={{ maxWidth: '30rem', textAlign: 'center' }}>
          <p
            style={{
              margin: '0 0 8px',
              fontSize: '12px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              opacity: 0.6,
            }}
          >
            ApexData
          </p>

          <h1 style={{ margin: '0 0 12px', fontSize: '28px', lineHeight: 1.2 }}>
            La aplicación no pudo arrancar
          </h1>

          <p style={{ margin: '0 0 28px', opacity: 0.75 }}>
            Ha fallado algo que envuelve a toda la web, así que ni siquiera se pudo pintar la
            página de error habitual. Suele ser temporal.
          </p>

          <div
            style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <button
              onClick={reset}
              style={{
                font: 'inherit',
                fontWeight: 600,
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid currentColor',
                background: 'transparent',
                color: 'inherit',
                cursor: 'pointer',
              }}
            >
              Reintentar
            </button>
            {/* Un enlace normal y no <Link>, a propósito: el router de Next es
                parte de lo que puede haberse roto, y aquí lo que se quiere es
                justamente una recarga completa. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                font: 'inherit',
                fontWeight: 600,
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid currentColor',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              Recargar el inicio
            </a>
          </div>

          {error.digest && (
            <p style={{ marginTop: '24px', fontSize: '13px', opacity: 0.55 }}>
              Referencia del fallo: <code>{error.digest}</code>
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
