'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import {
  apuntarVistos,
  leerVistos,
  pasosPendientes,
  type PasoPendiente,
} from '@/lib/novedades/pendientes';
import { MAX_PASOS, NOVEDADES, type Novedad } from '@/lib/novedades/registro';

/**
 * La guía de lo nuevo: un globo que va señalando, paso a paso, lo que se ha
 * añadido a un módulo, la primera vez que alguien entra después del cambio.
 *
 * ## Por qué así
 *
 * Se probaron en una maqueta navegable dos variantes: esta, que deja la
 * pantalla funcionando, y otra que la oscurece salvo lo señalado. Se eligió
 * esta, con los dos agentes de UX de acuerdo: quien entra viene a usar el
 * módulo, no a que le enseñen, y con la pantalla bloqueada no puede probar lo
 * que le están enseñando —la tecla iluminada parece pulsable y no lo es—. Es
 * el patrón de los consejos de Apple (TipKit).
 *
 * Por eso tampoco se le mueve el foco al abrir: la guía la abre la entrada al
 * módulo, no algo que haya hecho la persona, y un salto de foco que nadie ha
 * pedido desorienta con lector de pantalla. Se anuncia y se puede ir a ella
 * con el tabulador. Al cerrarla desde dentro, el foco vuelve a lo señalado.
 *
 * ## Qué cuenta como visto
 *
 * Cada paso, en cuanto se enseña; «Saltar» y `Esc`, todos; y usar lo que
 * enseña un paso, ese paso, aunque la guía no esté abierta: quien ya pulsó la
 * tecla no necesita que se la presenten. Si alguien cierra la pestaña a mitad,
 * la próxima vez sigue donde lo dejó.
 *
 * ## Por qué va fuera de lo que señala
 *
 * El globo y el anillo se pintan en el contenedor que se le pasa, colocados
 * con las coordenadas de lo señalado. Dentro de una caja con
 * `overflow-hidden` saldrían cortados, y poner una clase en un elemento que
 * pinta React es pelearse con React por su `className`.
 */

export const ID_GUIA = 'guia-novedades';

/** Lo que tarda en salir: si llegara a la vez que la pantalla, se perdería. */
const ESPERA = 600;

function almacen(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Está en el documento y ocupa sitio: `display: none` no cuenta. */
function enPantalla(selector: string): boolean {
  const el = document.querySelector(selector);
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

export interface Guia {
  /** El paso que se está enseñando, o `null` si la guía está cerrada. */
  paso: PasoPendiente | null;
  indice: number;
  total: number;
  siguiente: () => void;
  atras: () => void;
  /** Cierra la guía dando por vistos todos sus pasos. */
  saltar: () => void;
  /**
   * Se ha usado lo que señala `ancla`: ese paso ya no hace falta. Si es el que
   * se está enseñando, la guía pasa al siguiente.
   */
  usado: (ancla: string) => void;
}

/**
 * Cuándo sale la guía de un módulo y qué se apunta. Lo pinta `GuiaDeNovedades`.
 *
 * `modulo` es el campo `modulo` del registro. La pantalla llama a `usado` desde
 * los atajos de teclado que hagan lo mismo que lo señalado; el clic sobre lo
 * señalado ya lo recoge la guía sola.
 */
export function useGuiaDeNovedades(modulo: string, novedades: readonly Novedad[] = NOVEDADES): Guia {
  const [pasos, setPasos] = useState<PasoPendiente[]>([]);
  const [indice, setIndice] = useState(-1);
  /**
   * Lo que queda por ver, por ancla, leído una vez al entrar. `usado` se llama
   * en cada pulsación de la tecla señalada, y así solo toca el almacenamiento
   * la primera: las demás, y todas cuando ya no hay nada nuevo, no cuestan nada.
   */
  const porVer = useRef(new Map<string, string[]>());

  useEffect(() => {
    const donde = almacen();
    const vistos = donde && leerVistos(novedades, donde);
    if (!vistos) return;
    const pendientes = pasosPendientes(novedades, modulo, vistos, new Date());
    porVer.current = new Map();
    for (const p of pendientes) porVer.current.set(p.ancla, [...(porVer.current.get(p.ancla) ?? []), p.clave]);
    if (pendientes.length === 0) return;

    const espera = setTimeout(() => {
      // Lo usado durante la espera ya no se enseña.
      const visibles = pendientes
        .filter((p) => porVer.current.has(p.ancla) && enPantalla(p.ancla))
        .slice(0, MAX_PASOS);
      if (visibles.length === 0) return;
      setPasos(visibles);
      setIndice(0);
    }, ESPERA);
    return () => clearTimeout(espera);
  }, [modulo, novedades]);

  const paso = indice >= 0 ? (pasos[indice] ?? null) : null;

  // Visto en cuanto se enseña.
  useEffect(() => {
    const donde = almacen();
    if (paso && donde) apuntarVistos(donde, [paso.clave]);
  }, [paso]);

  const siguiente = useCallback(
    () => setIndice((i) => (i < 0 || i + 1 >= pasos.length ? -1 : i + 1)),
    [pasos.length]
  );
  const atras = useCallback(() => setIndice((i) => (i > 0 ? i - 1 : i)), []);

  const saltar = useCallback(() => {
    const donde = almacen();
    if (donde) apuntarVistos(donde, pasos.map((p) => p.clave));
    setIndice(-1);
  }, [pasos]);

  const usado = useCallback(
    (ancla: string) => {
      const claves = porVer.current.get(ancla);
      if (claves) {
        porVer.current.delete(ancla);
        const donde = almacen();
        if (donde) apuntarVistos(donde, claves);
      }
      // Solo avanza si lo usado es lo que se está enseñando. Un clic llega
      // dos veces —por la guía y por la pantalla—, y la segunda ya no casa.
      setIndice((i) => (i >= 0 && pasos[i]?.ancla === ancla ? (i + 1 >= pasos.length ? -1 : i + 1) : i));
    },
    [pasos]
  );

  return useMemo(
    () => ({ paso, indice, total: pasos.length, siguiente, atras, saltar, usado }),
    [paso, indice, pasos.length, siguiente, atras, saltar, usado]
  );
}

interface Sitio {
  left: number;
  top: number;
  /** Dónde cae la punta, medida desde el borde izquierdo del globo. */
  flecha: number;
  /** Si no cabe encima de lo señalado, va debajo. */
  debajo: boolean;
  anillo: { left: number; top: number; width: number; height: number; radio: number };
}

/** El hueco entre lo señalado y su anillo. */
const HOLGURA = 4;

export function GuiaDeNovedades({
  guia,
  contenedor,
  adornos,
}: {
  guia: Guia;
  /** Donde se pintan el globo y el anillo. Tiene que ser `relative`. */
  contenedor: React.RefObject<HTMLElement | null>;
  /** Algo más que enseñar en un paso, por su clave `novedad/paso`: un ejemplo, un dibujo. */
  adornos?: Partial<Record<string, React.ReactNode>>;
}) {
  const { paso, indice, total, siguiente, atras, saltar, usado } = guia;
  const [globo, setGlobo] = useState<HTMLDivElement | null>(null);
  const [sitio, setSitio] = useState<Sitio | null>(null);
  const botonSiguiente = useRef<HTMLButtonElement>(null);
  const reducido = useReducedMotion();
  const ultimo = indice === total - 1;

  // Se coloca después de pintar y antes de que se vea, que es lo que hace
  // `useLayoutEffect`: con `useEffect` se vería un fotograma en la esquina.
  // Y se recoloca si cambia el ancho, porque en escritorio lo señalado puede
  // cambiar de sitio al pasar de una columna a dos.
  useLayoutEffect(() => {
    const caja = contenedor.current;
    if (!paso || !globo || !caja) return;
    const ancla = document.querySelector<HTMLElement>(paso.ancla);
    if (!ancla) {
      siguiente();
      return;
    }

    const colocar = () => {
      const c = caja.getBoundingClientRect();
      const t = ancla.getBoundingClientRect();
      const ancho = globo.offsetWidth;
      const alto = globo.offsetHeight;
      const centro = t.left - c.left + t.width / 2;
      const left = Math.max(6, Math.min(centro - ancho / 2, c.width - ancho - 6));
      const encima = t.top - c.top - alto - 12;
      const debajo = encima < 6;
      setSitio({
        left,
        top: debajo ? t.bottom - c.top + 12 : encima,
        flecha: Math.max(14, Math.min(centro - left - 6, ancho - 26)),
        debajo,
        anillo: {
          left: t.left - c.left - HOLGURA,
          top: t.top - c.top - HOLGURA,
          width: t.width + HOLGURA * 2,
          height: t.height + HOLGURA * 2,
          radio: (parseFloat(getComputedStyle(ancla).borderTopLeftRadius) || 0) + HOLGURA,
        },
      });
    };

    colocar();
    // El contenedor, por el ancho; lo señalado y el globo, porque pueden
    // cambiar de tamaño sin que lo cambie el contenedor; y las fuentes, porque
    // si llegan después de medir lo mueven todo un poco.
    const vigia = new ResizeObserver(colocar);
    vigia.observe(caja);
    vigia.observe(ancla);
    vigia.observe(globo);
    let vivo = true;
    void document.fonts?.ready.then(() => vivo && colocar());

    // Lo señalado queda descrito por el globo. Se pone a mano y no como
    // propiedad porque la guía no sabe quién lo pinta; si ya tenía una
    // descripción, se le devuelve al cerrar.
    const previa = ancla.getAttribute('aria-describedby');
    ancla.setAttribute('aria-describedby', previa ? `${previa} ${ID_GUIA}` : ID_GUIA);

    // Pulsarlo es haberlo entendido: la guía sigue sola.
    const alPulsar = () => usado(paso.ancla);
    ancla.addEventListener('click', alPulsar);

    return () => {
      vivo = false;
      vigia.disconnect();
      ancla.removeEventListener('click', alPulsar);
      if (previa) ancla.setAttribute('aria-describedby', previa);
      else ancla.removeAttribute('aria-describedby');
    };
  }, [paso, globo, contenedor, siguiente, usado]);

  // `Esc` cierra la guía antes que los atajos de la pantalla: va en la fase de
  // captura de `window`, y en la calculadora `Esc` es «borrar todo» —quitarse
  // el globo de encima se llevaba la cuenta—. Pero si hay otra capa abierta,
  // un menú o un diálogo, el `Esc` es de esa capa y no se toca.
  useEffect(() => {
    if (!paso) return;
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      const donde = evento.target instanceof Element ? evento.target : null;
      const otraCapa =
        document.querySelector('[aria-modal="true"]') ??
        donde?.closest('[role="dialog"], [role="menu"], [role="listbox"]');
      if (otraCapa && !globo?.contains(otraCapa)) return;
      evento.preventDefault();
      evento.stopPropagation();
      saltar();
    };
    window.addEventListener('keydown', alPulsar, true);
    return () => window.removeEventListener('keydown', alPulsar, true);
  }, [paso, saltar, globo]);

  /** De dónde llegó el foco al globo, por si al cerrar no puede volver a lo señalado. */
  const origen = useRef<HTMLElement | null>(null);

  /**
   * Si el foco estaba en el globo, al cerrarse no se pierde: vuelve a lo
   * señalado, y si eso no puede tenerlo —un botón apagado, como el del visor
   * antes del primer «=»—, a donde estaba antes de entrar en el globo.
   */
  const devolverFoco = () => {
    if (!paso || !globo?.contains(document.activeElement)) return;
    const ancla = document.querySelector<HTMLElement>(paso.ancla);
    ancla?.focus({ preventScroll: true });
    if (document.activeElement !== ancla) origen.current?.focus({ preventScroll: true });
  };

  const desplazamiento = reducido ? 0 : sitio?.debajo ? -6 : 6;
  const adorno = paso ? adornos?.[paso.clave] : null;

  return (
    <>
      {/* El anillo no se anima al irse: con el globo desvaneciéndose basta. */}
      {paso && sitio && (
        <span
          key={paso.clave}
          aria-hidden
          data-novedad-anillo
          className="novedad-anillo pointer-events-none absolute z-10"
          style={{
            left: sitio.anillo.left,
            top: sitio.anillo.top,
            width: sitio.anillo.width,
            height: sitio.anillo.height,
            borderRadius: sitio.anillo.radio,
          }}
        />
      )}

      <AnimatePresence>
        {paso && (
          <motion.div
            ref={setGlobo}
            id={ID_GUIA}
            key="guia"
            role="dialog"
            aria-labelledby={`${ID_GUIA}-titulo`}
            onFocus={(e) => {
              const de = e.relatedTarget;
              if (de instanceof HTMLElement && !e.currentTarget.contains(de)) origen.current = de;
            }}
            initial={{ opacity: 0, y: desplazamiento }}
            animate={{ opacity: sitio ? 1 : 0, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            style={{ left: sitio?.left ?? 0, top: sitio?.top ?? 0 }}
            className="novedad-globo absolute z-20 w-[min(270px,calc(100%-12px))] rounded-[14px] px-3.5 pb-3 pt-3 shadow-[0_14px_34px_-12px_rgba(0,0,0,0.55)]"
          >
            <span
              aria-hidden
              className="novedad-globo absolute h-3 w-3 rotate-45 rounded-[2px]"
              style={{ left: sitio?.flecha ?? 14, ...(sitio?.debajo ? { top: -6 } : { bottom: -6 }) }}
            />

            {total > 1 && (
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] opacity-80">
                {indice + 1} de {total}
              </p>
            )}
            <p id={`${ID_GUIA}-titulo`} className="text-sm font-bold">
              {paso.titulo}
            </p>
            <p className="mt-1 text-sm leading-snug">{paso.texto}</p>
            {adorno}

            <div className="mt-2.5 flex items-center justify-between gap-2">
              {ultimo ? (
                <span />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    devolverFoco();
                    saltar();
                  }}
                  className="novedad-boton min-h-[44px] min-w-[44px] rounded-[10px] px-1.5 text-sm font-medium underline underline-offset-[3px]"
                >
                  Saltar
                </button>
              )}
              <span className="inline-flex gap-1.5">
                {indice > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      // Al volver al primero, «Atrás» desaparece: el foco pasa
                      // a «Siguiente» en vez de caer al documento.
                      const dentro = globo?.contains(document.activeElement);
                      atras();
                      if (dentro && indice === 1) requestAnimationFrame(() => botonSiguiente.current?.focus());
                    }}
                    className="novedad-boton min-h-[44px] min-w-[44px] rounded-[10px] border-[1.5px] border-current px-3 text-sm font-semibold"
                  >
                    Atrás
                  </button>
                )}
                <button
                  ref={botonSiguiente}
                  type="button"
                  onClick={() => {
                    if (ultimo) devolverFoco();
                    siguiente();
                  }}
                  className="novedad-boton novedad-principal min-h-[44px] min-w-[44px] rounded-[10px] px-3.5 text-sm font-semibold"
                >
                  {ultimo ? 'Entendido' : 'Siguiente'}
                </button>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fuera del globo y siempre montada: una región viva que aparece ya con
          texto no se anuncia en todos los lectores. */}
      <p role="status" className="sr-only">
        {paso ? `Novedad${total > 1 ? `, ${indice + 1} de ${total}` : ''}: ${paso.titulo}` : ''}
      </p>
    </>
  );
}
