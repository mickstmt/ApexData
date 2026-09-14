'use client';

import { useEffect, useState } from 'react';

/**
 * «Gira el teléfono», al pulsar expandir con el móvil de pie.
 *
 * ## Por qué existe
 *
 * Pulsar expandir en vertical dejaba el modo horizontal metido en una pantalla
 * vertical: la torre cortada por la derecha, el circuito aplastado y la barra
 * de progreso escondida bajo el menú. El usuario lo describió sin rodeos —«en
 * todo caso me quedo mejor sin el modo fullscreen»— y tenía razón: un botón que
 * lleva a una pantalla rota es peor que no tener botón.
 *
 * ## Lo que NO se puede hacer, y hay que decirlo
 *
 * En iOS **no se puede girar la pantalla por código**.
 * `screen.orientation.lock()` no existe en Safari, y el campo `orientation` del
 * manifest se ignora aunque la app esté instalada. Así que lo único honesto es
 * pedirlo.
 *
 * ## Lo que se probó y se descartó
 *
 * Se le enseñaron al usuario tres salidas sobre una maqueta instalada en su
 * teléfono, incluida **girar los componentes por CSS**, que es la única que
 * funciona con el bloqueo de rotación puesto. La descartó por una razón buena:
 * con el bloqueo quitado, al girar el móvil el sistema gira la pantalla y la
 * rotación propia se suma a la del sistema. En la app esas dos rotaciones
 * leerían la misma señal y no podrían sumarse, pero la conclusión se mantiene:
 * una capa que se puede sentir al revés no compensa lo que resuelve.
 *
 * Queda entonces el aviso, y con lo que hacía falta para que no deje tirado a
 * nadie: **se cierra solo al girar** —eso sí lo sabemos detectar— y, si pasan
 * unos segundos y la pantalla no gira, dice que el bloqueo de rotación puede
 * estar puesto.
 */

/** A los cuántos segundos se sugiere mirar el bloqueo de rotación. */
const SEGUNDOS_HASTA_LA_PISTA = 4;

export function AvisoDeGirar({ alCerrar }: { alCerrar: () => void }) {
  const [dandoLaPista, setDandoLaPista] = useState(false);

  useEffect(() => {
    const temporizador = setTimeout(() => setDandoLaPista(true), SEGUNDOS_HASTA_LA_PISTA * 1000);
    return () => clearTimeout(temporizador);
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Gira el teléfono"
      data-aviso-girar
      className={[
        // Translúcido, decisión del usuario: se ve por debajo que el replay
        // sigue ahí, así que el aviso se lee como un paso y no como otra
        // pantalla a la que te han mandado.
        'fixed inset-0 z-[60] grid place-items-center bg-[var(--replay-fondo)]/90 backdrop-blur-[2px]',
        'px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]',
      ].join(' ')}
    >
      <div className="grid justify-items-center gap-7 text-center">
        <div className="relative grid h-[132px] w-[132px] place-items-center">
          <FlechaDeGiro className="girar-flecha absolute right-2 top-0.5 h-[26px] w-[26px]" sentido="arriba" />
          <span className="girar-movil relative block h-[108px] w-[62px] rounded-[12px] border-[3px] border-[var(--replay-texto)]">
            <span className="absolute left-1/2 top-[7px] h-1 w-5 -translate-x-1/2 rounded-sm bg-[var(--replay-texto)]" />
            <span className="absolute bottom-1.5 left-1/2 h-[3px] w-6 -translate-x-1/2 rounded-sm bg-[var(--replay-texto)] opacity-70" />
          </span>
          <FlechaDeGiro className="girar-flecha absolute bottom-0.5 left-2 h-[26px] w-[26px]" sentido="abajo" />
        </div>

        <p className="max-w-[16ch] text-[17px] font-semibold leading-snug text-[var(--replay-texto)]">
          Gira el teléfono para verlo mejor
        </p>

        {/* La pista llega tarde a propósito: si giras enseguida, no hace falta
            decirte nada. Aparece solo cuando la pantalla no ha girado, que es
            justo el síntoma de tener el bloqueo de rotación puesto. */}
        <p
          role="status"
          className={[
            'max-w-[24ch] text-[13.5px] leading-snug text-[var(--replay-apagado)] transition-opacity duration-300',
            dandoLaPista ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        >
          ¿No gira? Puede que tengas el bloqueo de rotación puesto.
        </p>

        <button
          type="button"
          onClick={alCerrar}
          className="min-h-[44px] rounded-[10px] border border-[var(--replay-borde)] px-5 text-[var(--replay-apagado)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--replay-acento)]"
        >
          Salir
        </button>
      </div>
    </div>
  );
}

function FlechaDeGiro({ className, sentido }: { className: string; sentido: 'arriba' | 'abajo' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="var(--replay-acento)"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {sentido === 'arriba' ? (
        <>
          <path d="M4 13a8 8 0 0 1 14-5" />
          <path d="M18 3v5h-5" />
        </>
      ) : (
        <>
          <path d="M20 11a8 8 0 0 1-14 5" />
          <path d="M6 21v-5h5" />
        </>
      )}
    </svg>
  );
}
