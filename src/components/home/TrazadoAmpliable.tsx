'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Expand, X } from 'lucide-react';

/**
 * El trazado del circuito, que se puede mirar de cerca.
 *
 * En la tarjeta de la próxima carrera el trazado mide unos noventa píxeles: se
 * reconoce el circuito, pero no se distingue una curva de otra. Tocarlo lo
 * abre a pantalla completa.
 *
 * ## Por qué a pantalla completa y no un zoom al pasar el cursor
 *
 * Se eligió sobre mockup, entre tres formas, y la razón de peso no fue estética:
 * **en un teléfono no existe «pasar el cursor»**, y el teléfono es donde más se
 * mira esta app. Una respuesta atada al hover no habría ocurrido nunca ahí.
 * Esta funciona igual con el dedo, con el ratón y con el teclado.
 *
 * ## Por qué `<dialog>` y no una capa a mano
 *
 * Lo mismo que la hoja inferior: `showModal()` trae de fábrica el foco atrapado
 * dentro, `Escape` para cerrar, el foco devuelto al botón que lo abrió y lo de
 * detrás inerte. Escribir eso a mano es escribirlo mal.
 */
export function TrazadoAmpliable({
  src,
  circuito,
}: {
  src: string;
  circuito: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const elemento = dialogo.current;
    if (!elemento) return;

    if (abierto && !elemento.open) elemento.showModal();
    if (!abierto && elemento.open) elemento.close();
  }, [abierto]);

  // El diálogo modal deja inerte lo de detrás, pero el cuerpo sigue pudiendo
  // desplazarse en algunos navegadores: el trazado se quedaría quieto sobre un
  // fondo que se mueve.
  useEffect(() => {
    if (!abierto) return;

    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previo;
    };
  }, [abierto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label={`Ver el trazado de ${circuito} a pantalla completa`}
        // `group` para que la lupa aparezca al apuntar; en táctil no hace falta
        // porque el trazado entero es el objetivo, y es grande.
        className="group relative flex cursor-zoom-in items-center rounded-lg ring-offset-background transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Image
          src={src}
          alt={`Trazado de ${circuito}`}
          width={220}
          height={140}
          className="h-28 w-auto opacity-90 brightness-0 transition-opacity group-hover:opacity-100 dark:brightness-0 dark:invert"
        />

        {/* La lupa solo se dibuja al apuntar: en reposo sería ruido sobre un
            trazado que ya es la señal. */}
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-1 right-1 rounded-md bg-card/90 p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          <Expand className="h-3.5 w-3.5" />
        </span>
      </button>

      <dialog
        ref={dialogo}
        data-trazado
        aria-label={`Trazado de ${circuito}`}
        onClose={() => setAbierto(false)}
        // Tocar fuera cierra: el clic sobre el velo llega al propio diálogo,
        // porque el contenido vive dentro de un hijo que no lo tapa entero.
        onClick={(evento) => {
          if (evento.target === dialogo.current) setAbierto(false);
        }}
        className="m-auto max-h-none max-w-none border-0 bg-transparent p-0 text-foreground backdrop:bg-background/90 backdrop:backdrop-blur-sm"
      >
        {/* Ancho explícito, y no «lo que ocupe».
            Un `<dialog>` se encoge hasta su contenido, así que un `w-full` en
            la imagen se mordía la cola: sin nada contra lo que resolverse, el
            trazado se quedaba en 300 px incluso con 1.280 de pantalla. */}
        <div className="flex w-[min(92vw,640px)] flex-col items-center gap-4 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {/* Etiqueta normal y no `next/image`, por lo mismo que los logos de
              equipo: el optimizador no procesa SVG —los sirve tal cual— y en
              cambio obliga a declarar una proporción fija. Con ella, medido a
              430 px de ancho, el trazado se quedaba en 234 px y dejaba el
              cuarenta por ciento del hueco sin usar. Un `<img>` deja que cada
              circuito traiga la suya y llene lo que pueda.

              `max-h` y no una altura fija: Monza es alargado y Mónaco compacto,
              y recortar uno de los dos sería peor que dejar aire. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={`Trazado de ${circuito}`}
            className="max-h-[68vh] w-full max-w-[560px] object-contain brightness-0 dark:brightness-0 dark:invert"
          />

          <p className="text-center font-display text-base font-bold">{circuito}</p>

          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="flex min-h-11 items-center gap-2 rounded-md px-4 text-sm text-muted-foreground ring-offset-background hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <X className="h-4 w-4" aria-hidden />
            Cerrar
          </button>
        </div>
      </dialog>
    </>
  );
}
