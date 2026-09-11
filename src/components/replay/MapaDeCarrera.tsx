'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
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
  useEffect(() => {
    ultimoEstado.current = estado;
    ultimoElegido.current = elegido;
    ultimosCoches.current = coches;
  }, [estado, elegido, coches]);

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

      ctx.lineWidth = Math.max(6, Math.min(10, w / 60));
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
    const caja = evento.currentTarget.getBoundingClientRect();
    const x = evento.clientX - caja.left, y = evento.clientY - caja.top;

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
    <div ref={cajaRef} className={alto === 'relleno' ? 'h-full w-full' : 'w-full'}>
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
