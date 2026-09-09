'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

/**
 * Hoja inferior: una capa que sube desde abajo, al alcance del pulgar.
 *
 * El último primitivo que faltaba del S3 (Card/Table/Chip/Sheet), y no es
 * decoración: el menú que sustituye cerraba con `Escape` y devolvía el foco
 * —eso ya estaba bien—, pero **no atrapaba el foco**, así que tabulando se
 * salía hacia la página de detrás sin cerrarlo, y tampoco cerraba al tocar
 * fuera.
 *
 * Va sobre `<dialog>` abierto con `showModal()`, que resuelve de fábrica lo que
 * habría que escribir a mano y equivocarse: el foco atrapado dentro, `Escape`,
 * el foco devuelto al botón que la abrió, el velo y dejar inerte lo de detrás.
 *
 * Dos cosas que conviene no romper:
 *
 * - **El relleno de la zona segura abajo.** Es la regla que el plan fija para
 *   cualquier capa: en el iPhone instalado, sin él, la última fila queda bajo
 *   la barra de gestos.
 * - **Solo se anima al entrar.** Animar también el cierre obliga a esperar al
 *   final de la animación antes de cerrar el diálogo, y una hoja que tarda en
 *   irse se siente rota. Con "reducir movimiento" no se anima nada.
 */
export function Sheet({
  abierta,
  alCerrar,
  titulo,
  forma = 'hoja',
  children,
}: {
  abierta: boolean;
  alCerrar: () => void;
  titulo: string;
  /**
   * `hoja` sube pegada al borde de abajo y ocupa todo el ancho. `panel` flota
   * por encima de la barra de pestañas, con aire a los lados.
   *
   * La diferencia no es estética. Una hoja pegada abajo tapa la barra, y la
   * barra es de donde acaba de salir el menú: se pierde de vista el sitio que
   * se tocó. Flotando, el botón sigue debajo y se entiende de dónde vino.
   *
   * Las dos siguen siendo el mismo `<dialog>` modal, así que conservan lo que
   * costó conseguir: foco atrapado, `Escape`, foco devuelto y fondo inerte.
   */
  forma?: 'hoja' | 'panel';
  children: ReactNode;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const elemento = dialogo.current;
    if (!elemento) return;

    if (abierta && !elemento.open) elemento.showModal();
    if (!abierta && elemento.open) elemento.close();
  }, [abierta]);

  // El diálogo modal deja inerte lo de detrás, pero el cuerpo sigue pudiendo
  // desplazarse en algunos navegadores: la hoja se quedaría quieta sobre un
  // fondo que se mueve.
  useEffect(() => {
    if (!abierta) return;

    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previo;
    };
  }, [abierta]);

  return (
    <dialog
      ref={dialogo}
      data-hoja
      aria-label={titulo}
      onClose={alCerrar}
      // Tocar fuera cierra: el clic sobre el velo llega al propio diálogo,
      // porque el contenido vive dentro de un hijo que lo tapa entero.
      onClick={(evento) => {
        if (evento.target === dialogo.current) alCerrar();
      }}
      className={
        forma === 'panel'
          ? // El margen de abajo salva la barra de pestañas, cuyo alto crece con
            // la zona segura del iPhone: por eso se suma el inset en vez de
            // escribir un número fijo que quedaría corto en pantalla completa.
            'mx-auto mb-[calc(4.5rem_+_env(safe-area-inset-bottom))] mt-auto w-[calc(100%-1rem)] max-w-none rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-foreground/30 sm:mx-auto sm:mb-6 sm:max-w-md'
          : 'm-0 mt-auto w-full max-w-none rounded-t-2xl border-t border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-foreground/40 sm:mx-auto sm:mb-6 sm:max-w-md sm:rounded-2xl sm:border'
      }
    >
      <div
        className={
          forma === 'panel'
            ? 'px-3 pb-4 pt-3'
            : 'px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3'
        }
      >
        {/* El asa no es un control: dice que esto se agarra por abajo. Un panel
            flotante no se agarra, así que no la lleva. */}
        {forma === 'hoja' && (
          <span aria-hidden className="mx-auto mb-3 block h-1 w-9 rounded-full bg-input" />
        )}

        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="font-display text-base font-bold">{titulo}</h2>
          <button
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar"
            className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground ring-offset-background hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {children}
      </div>
    </dialog>
  );
}
