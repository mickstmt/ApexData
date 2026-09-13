'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { posicionEn, type BloqueDePosiciones } from '@/lib/replay/bloque';
import { type ClaseDeEstado } from '@/lib/replay/estados';
import type { Trazado } from '@/lib/replay/progreso';
import type { PaletaDelReplay } from './tema';

/**
 * El circuito con los coches encima.
 *
 * Canvas y no SVG, como el resto de la telemetría: son 22 puntos que se
 * mueven sesenta veces por segundo, y un nodo por coche que cambia de sitio
 * en cada fotograma es justo lo que un móvil no repinta con fluidez.
 *
 * No recibe el instante como prop: se suscribe al reloj y pinta por su cuenta
 * en cada fotograma. Si el instante fuera una prop, cada fotograma sería un
 * render de React de toda la pantalla para mover unos puntos.
 *
 * La pista se pinta del color del estado —amarilla, roja, naranja— porque es
 * lo que se lee de un vistazo sin saber de Fórmula 1; la píldora de arriba
 * lo dice con palabras para quien no distingue el color.
 *
 * Los colores llegan resueltos en `paleta` y no se leen de CSS aquí dentro:
 * un lienzo no resuelve `var(...)`, se descarta en silencio y queda el negro
 * por defecto. Mientras la paleta no está, no se pinta — un fotograma tarde es
 * mejor que un fotograma con los colores del otro tema.
 */

export interface CocheEnElMapa {
  color: string;
  codigo: string;
  /** Fuera de carrera: se pinta apagado y no se puede elegir. */
  fuera: boolean;
}

/** Cuánto dura cada anillo del abandono, y cuántos van encadenados. */
const PULSO_MS = 900;
const PULSOS = 3;
/** Lo que tarda el trazado en engordar y volver, al cambiar de bandera. */
const LATIDO_MS = 900;

const PADDING = 22;
/** Radio de acierto al tocar, de dedo y no de punto. */
const RADIO_DE_TOQUE = 22;

export function MapaDeCarrera({
  trazado,
  rotacion,
  bloque,
  coches,
  estado,
  paleta,
  elegido,
  lider,
  reproduciendo,
  onElegir,
  suscribir,
  kRef,
  alto,
  ariaLabel,
}: {
  trazado: Trazado;
  /** Grados para verlo como en televisión. */
  rotacion: number;
  bloque: BloqueDePosiciones;
  coches: CocheEnElMapa[];
  estado: ClaseDeEstado;
  /** Los colores del tema vigente. `null` hasta que hay navegador que leer. */
  paleta: PaletaDelReplay | null;
  elegido: number | null;
  /**
   * Quién va primero, para el aro que lo marca.
   *
   * Con la carrera avanzada, entre doblados y rezagados no se sabe quién lidera
   * —«parece que un doblado pelea con el de delante cuando en realidad ya le
   * sacan más de una vuelta»—. El aro va en el **acento** y no en la tinta
   * principal a propósito: la tinta ya es el aro del coche elegido, y dos cosas
   * distintas no pueden tener el mismo dibujo.
   */
  lider: number | null;
  /**
   * Si el replay está corriendo hacia delante.
   *
   * El pulso del abandono y el aviso de DNF solo saltan entonces. Arrastrando
   * el scrubber se cruzan veinte abandonos en dos segundos, y veinte avisos
   * seguidos no informan de nada: convierten una señal en ruido.
   */
  reproduciendo: boolean;
  onElegir: (piloto: number) => void;
  suscribir: (oyente: (k: number) => void) => () => void;
  kRef: React.MutableRefObject<number>;
  /** `proporcion`: alto según el ancho (móvil). `relleno`: el del contenedor (escritorio). */
  alto: 'proporcion' | 'relleno';
  ariaLabel: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cajaRef = useRef<HTMLDivElement>(null);
  const proyeccion = useRef<{ px: (x: number) => number; py: (y: number) => number; pista: Path2D } | null>(null);
  // El estado, el elegido y los coches se leen desde el bucle de pintado, que
  // no es un render: viven en refs que se actualizan en un efecto.
  //
  // `coches` cambia cuatro veces por segundo —lleva quién está fuera— y si
  // entrara en las dependencias de `pintar`, `ajustar` cambiaría con él y el
  // `ResizeObserver` se desconectaría y reconectaría a ese ritmo, reservando
  // el lienzo entero y rehaciendo el `Path2D` de la pista cada vez, en los dos
  // mapas a la vez.
  const ultimoEstado = useRef(estado);
  const ultimoElegido = useRef(elegido);
  const ultimosCoches = useRef(coches);
  const ultimoLider = useRef(lider);

  /** Índice del coche → cuándo empezó su pulso, en tiempo de reloj de pared. */
  const pulsos = useRef(new Map<number, number>());
  /** Cuándo cambió la bandera, para el latido del trazado. */
  const cambioDeBandera = useRef(0);

  /**
   * El aviso de «DNF», con su número de pase.
   *
   * El contador no es decorativo: en una salida con varios coches fuera a la
   * vez el texto es el mismo, y sin algo que cambie la animación no se
   * reinicia y el segundo abandono se come al primero.
   */
  const [aviso, setAviso] = useState<{ texto: string; pase: number } | null>(null);

  useEffect(() => {
    if (!aviso) return;
    const temporizador = setTimeout(() => setAviso(null), 1400);
    return () => clearTimeout(temporizador);
  }, [aviso]);
  useEffect(() => {
    ultimoEstado.current = estado;
    // Quién acaba de abandonar: los que pasan de dentro a fuera en este cambio.
    const antes = ultimosCoches.current;
    if (reproduciendo && antes.length === coches.length) {
      for (let i = 0; i < coches.length; i++) {
        if (coches[i].fuera && !antes[i].fuera) {
          pulsos.current.set(i, performance.now());
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setAviso((previo) => ({ texto: 'DNF', pase: (previo?.pase ?? 0) + 1 }));
        }
      }
    }

    if (ultimoEstado.current !== estado) cambioDeBandera.current = performance.now();

    ultimoElegido.current = elegido;
    ultimosCoches.current = coches;
    ultimoLider.current = lider;
  }, [estado, elegido, coches, lider, reproduciendo]);

  /** Coordenadas ya giradas: FastF1 las graba en la orientación del GPS. */
  const girar = useMemo(() => {
    const rad = (rotacion * Math.PI) / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    return (x: number, y: number): [number, number] => [x * cos - y * sin, x * sin + y * cos];
  }, [rotacion]);

  const pistaGirada = useMemo(() => {
    const xs = new Float64Array(trazado.xs.length), ys = new Float64Array(trazado.ys.length);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < xs.length; i++) {
      const [x, y] = girar(trazado.xs[i], trazado.ys[i]);
      xs[i] = x; ys[i] = y;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    return { xs, ys, minX, maxX, minY, maxY };
  }, [trazado, girar]);

  const pintar = useCallback(
    (k: number) => {
      const canvas = canvasRef.current;
      const p = proyeccion.current;
      if (!canvas || !p || !paleta) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const ratio = window.devicePixelRatio || 1;
      const w = canvas.width / ratio, h = canvas.height / ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, w, h);

      /**
       * El latido del trazado al cambiar de bandera.
       *
       * El color ya estaba y el usuario dijo que le gusta; lo que faltaba era
       * notar **el instante** del cambio. Mirando la torre, hoy te lo pierdes.
       * Engorda y adelgaza una vez, y se acabó.
       */
      const base = Math.max(6, Math.min(10, w / 60));
      const desdeElCambio = performance.now() - cambioDeBandera.current;
      const latido =
        cambioDeBandera.current > 0 && desdeElCambio < LATIDO_MS
          ? Math.sin(Math.PI * (desdeElCambio / LATIDO_MS)) * base * 0.85
          : 0;

      ctx.lineWidth = base + latido;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = paleta.estados[ultimoEstado.current];
      ctx.stroke(p.pista);

      const radio = w < 480 ? 5 : 6;
      const sel = ultimoElegido.current;
      const enPista = ultimosCoches.current;

      const dibujar = (i: number, resaltado: boolean) => {
        const pos = posicionEn(bloque, i, k);
        if (!pos) return;
        const [x, y] = girar(pos[0], pos[1]);
        const sx = p.px(x), sy = p.py(y);
        const coche = enPista[i];

        /**
         * Los pulsos del abandono: tres anillos ENCADENADOS.
         *
         * Cada uno empieza cuando el anterior termina. La primera versión los
         * solapaba y el usuario dijo que «prácticamente salen al mismo tiempo»
         * — se leían como uno más gordo en vez de como tres.
         */
        const empezo = pulsos.current.get(i);
        if (empezo !== undefined) {
          const t = performance.now() - empezo;
          if (t > PULSOS * PULSO_MS) pulsos.current.delete(i);

          for (let n = 0; n < PULSOS; n++) {
            const tn = t - n * PULSO_MS;
            if (tn < 0 || tn >= PULSO_MS) continue;
            ctx.beginPath();
            ctx.arc(sx, sy, radio + (tn / PULSO_MS) * radio * 7, 0, Math.PI * 2);
            ctx.strokeStyle = paleta.estados.roja;
            ctx.lineWidth = 3;
            ctx.globalAlpha = (1 - tn / PULSO_MS) * 0.9;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }

        ctx.globalAlpha = coche.fuera ? 0.35 : 1;
        ctx.beginPath();
        ctx.arc(sx, sy, resaltado ? radio + 2 : radio, 0, Math.PI * 2);
        ctx.fillStyle = coche.color;
        ctx.fill();
        ctx.lineWidth = resaltado ? 2.5 : 1;
        // El aro del elegido va en la tinta principal y el borde de los demás
        // en el fondo: así se separan de la pista sin inventar un color que
        // solo funcione en uno de los dos temas.
        ctx.strokeStyle = resaltado ? paleta.texto : paleta.fondo;
        ctx.stroke();

        // El aro del líder, por fuera del suyo propio.
        if (i === ultimoLider.current && !coche.fuera) {
          ctx.beginPath();
          ctx.arc(sx, sy, radio + 4, 0, Math.PI * 2);
          ctx.strokeStyle = paleta.acento;
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        if (resaltado) {
          // Sin `var(...)`: un canvas no resuelve variables CSS y la
          // abreviatura entera se descartaba en silencio, así que el código
          // del piloto se dibujaba con la fuente por defecto de 10 px.
          ctx.font = '600 12px Inter, system-ui, sans-serif';
          ctx.fillStyle = paleta.texto;
          ctx.fillText(coche.codigo, sx + radio + 6, sy + 4);
        }
        ctx.globalAlpha = 1;
      };

      for (let i = 0; i < enPista.length; i++) if (i !== sel) dibujar(i, false);
      if (sel !== null) dibujar(sel, true);
    },
    [bloque, girar, paleta]
  );

  /** Recalcula la proyección al tamaño de la caja y repinta. */
  const ajustar = useCallback(() => {
    const canvas = canvasRef.current, caja = cajaRef.current;
    if (!canvas || !caja) return;

    const w = caja.clientWidth;
    const h = alto === 'relleno' ? caja.clientHeight : Math.round(w * 0.77);
    if (w === 0 || h === 0) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const { xs, ys, minX, maxX, minY, maxY } = pistaGirada;
    // Una sola escala para los dos ejes: con dos, el circuito sale deformado.
    const escala = Math.min((w - PADDING * 2) / (maxX - minX || 1), (h - PADDING * 2) / (maxY - minY || 1));
    const dx = (w - (maxX - minX) * escala) / 2;
    const dy = (h - (maxY - minY) * escala) / 2;
    const px = (x: number) => (x - minX) * escala + dx;
    // El eje Y del lienzo crece hacia abajo y el del circuito hacia arriba.
    const py = (y: number) => h - ((y - minY) * escala + dy);

    const pista = new Path2D();
    for (let i = 0; i < xs.length; i++) {
      if (i === 0) pista.moveTo(px(xs[i]), py(ys[i]));
      else pista.lineTo(px(xs[i]), py(ys[i]));
    }
    pista.closePath();

    proyeccion.current = { px, py, pista };
    pintar(kRef.current);
  }, [alto, pistaGirada, pintar, kRef]);

  useEffect(() => {
    ajustar();
    const observador = new ResizeObserver(ajustar);
    if (cajaRef.current) observador.observe(cajaRef.current);
    return () => observador.disconnect();
  }, [ajustar]);

  // El reloj avisa en cada fotograma; el estado, el elegido y los abandonos
  // cambian aparte y solo piden repintar, no rehacer la proyección.
  useEffect(() => suscribir(pintar), [suscribir, pintar]);
  useEffect(() => { pintar(kRef.current); }, [estado, elegido, coches, pintar, kRef]);

  const alTocar = (evento: React.PointerEvent<HTMLCanvasElement>) => {
    const p = proyeccion.current;
    if (!p) return;
    // El lienzo puede estar escalado con `transform` —el mapa se encoge al
    // desplazar la torre— y entonces la caja que se ve mide menos que la caja
    // de la que salen las coordenadas. Sin dividir por esa escala, tocar un
    // coche del borde de abajo elegía a otro.
    const caja = evento.currentTarget.getBoundingClientRect();
    const escalaVisual = caja.width / (evento.currentTarget.offsetWidth || caja.width);
    const x = (evento.clientX - caja.left) / escalaVisual;
    const y = (evento.clientY - caja.top) / escalaVisual;

    let mejor: number | null = null, distancia = RADIO_DE_TOQUE * RADIO_DE_TOQUE;
    for (let i = 0; i < coches.length; i++) {
      if (coches[i].fuera) continue;
      const pos = posicionEn(bloque, i, kRef.current);
      if (!pos) continue;
      const [gx, gy] = girar(pos[0], pos[1]);
      const dx = p.px(gx) - x, dy = p.py(gy) - y, d = dx * dx + dy * dy;
      if (d < distancia) { distancia = d; mejor = i; }
    }
    if (mejor !== null) onElegir(mejor);
  };

  return (
    <div
      ref={cajaRef}
      className={`relative ${alto === 'relleno' ? 'h-full w-full' : 'w-full'}`}
    >
      {/* El mismo lenguaje que el «+10 s» de los mandos: una píldora en el
          centro que dice que acaba de pasar algo. La app ya lo enseña, así que
          un abandono no necesita inventar una señal nueva. */}
      {aviso && (
        <span
          key={aviso.pase}
          data-dnf
          role="status"
          className="replay-destello pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-5 py-2.5 font-mono text-xl font-bold tracking-[.04em] text-white"
          style={{ background: 'var(--replay-roja)' }}
        >
          {aviso.texto}
        </span>
      )}

      <canvas
        ref={canvasRef}
        role="img"
        aria-label={ariaLabel}
        className="block cursor-pointer touch-pan-y"
        onPointerDown={alTocar}
      />
    </div>
  );
}
