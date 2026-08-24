'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  TRAMOS,
  prepararMinisectores,
  tramoEnMetros,
  trazadoConTramos,
  type PuntoDeTrazado,
} from '@/lib/minisectores';
import { contrastBetween, readableOnLight, teamColor } from '@/lib/team-colors';
import type { TelemetryPoint } from '@/types';

/**
 * Quién es fuerte en cada parte del circuito.
 *
 * El delta acumulado dice **cuánto** se gana y se pierde; esto dice **dónde**,
 * sobre el asfalto. Son la misma pregunta en dos idiomas: una curva que baja no
 * le dice nada a quien no se sepa el trazado de memoria, y un trozo de pista
 * pintado de naranja sí.
 *
 * Comparte cursor con el delta y con las trazas de velocidad, así que las tres
 * cosas señalan el mismo punto de la vuelta a la vez.
 */

const ALTO = 300;
const MARGEN = 16;
const GROSOR = 7;

/** Cuánto se separan dos colores antes de que haya que distinguirlos de otro modo. */
const SEPARACION_MINIMA = 1.6;

export function MapaMinisectores({
  piloto1,
  piloto2,
  equipo1,
  equipo2,
  traza1,
  traza2,
  rotacion = 0,
  cursor: cursorExterno,
  onCursor,
}: {
  piloto1: string;
  piloto2: string;
  equipo1?: string | null;
  equipo2?: string | null;
  traza1: TelemetryPoint[];
  traza2: TelemetryPoint[];
  /** Grados para verlo como en televisión. */
  rotacion?: number;
  cursor?: number | null;
  onCursor?: (metros: number | null) => void;
}) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);
  const [cursorPropio, setCursorPropio] = useState<number | null>(null);
  const { resolvedTheme } = useTheme();
  const oscuro = resolvedTheme === 'dark';

  const controlado = onCursor !== undefined;
  const cursor = controlado ? (cursorExterno ?? null) : cursorPropio;
  const setCursor = (metros: number | null) =>
    controlado ? onCursor(metros) : setCursorPropio(metros);

  const datos = useMemo(() => prepararMinisectores(traza1, traza2), [traza1, traza2]);

  const trazado = useMemo(() => {
    const puntos = trazadoConTramos(traza1, TRAMOS, datos.longitud);
    const radianes = (rotacion * Math.PI) / 180;
    const cos = Math.cos(radianes);
    const sin = Math.sin(radianes);

    return puntos.map((p) => ({ ...p, x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos }));
  }, [traza1, datos.longitud, rotacion]);

  const colores = useMemo(() => {
    const uno = teamColor(equipo1).color;
    let dos = teamColor(equipo2).color;

    // Dos compañeros de equipo comparten color, y entonces el mapa dejaría de
    // decir de quién es cada trozo.
    if (contrastBetween(uno, dos) < SEPARACION_MINIMA) {
      dos = readableOnLight(dos, 4.5);
      if (contrastBetween(uno, dos) < SEPARACION_MINIMA) dos = oscuro ? '#FFFFFF' : '#111111';
    }

    return { uno, dos };
  }, [equipo1, equipo2, oscuro]);

  const paleta = useRef({ tinta: '#8A8A94', fondo: '#0A0A0A' });
  const proyeccion = useRef<((p: PuntoDeTrazado) => { x: number; y: number }) | null>(null);

  useEffect(() => {
    const estilos = getComputedStyle(document.documentElement);
    paleta.current = {
      tinta: `hsl(${estilos.getPropertyValue('--muted-foreground').trim()})`,
      fondo: `hsl(${estilos.getPropertyValue('--card').trim()})`,
    };
  }, [resolvedTheme]);

  useEffect(() => {
    const medir = () => setAncho(caja.current?.clientWidth ?? 0);
    medir();

    const observador = new ResizeObserver(medir);
    if (caja.current) observador.observe(caja.current);
    return () => observador.disconnect();
  }, []);

  useEffect(() => {
    const canvas = lienzo.current;
    if (!canvas || ancho === 0 || trazado.length < 2) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = ancho * ratio;
    canvas.height = ALTO * ratio;
    canvas.style.width = `${ancho}px`;
    canvas.style.height = `${ALTO}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, ancho, ALTO);

    const xs = trazado.map((p) => p.x);
    const ys = trazado.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // La misma escala en los dos ejes: estirar el circuito para llenar la caja
    // lo deformaría y dejaría de parecerse al de verdad.
    const escala = Math.min(
      (ancho - MARGEN * 2) / Math.max(maxX - minX, 1),
      (ALTO - MARGEN * 2) / Math.max(maxY - minY, 1)
    );
    const centradoX = (ancho - (maxX - minX) * escala) / 2;
    const centradoY = (ALTO - (maxY - minY) * escala) / 2;

    const proyectar = (p: PuntoDeTrazado) => ({
      x: centradoX + (p.x - minX) * escala,
      // El eje Y del asfalto crece hacia arriba y el del lienzo hacia abajo.
      y: ALTO - (centradoY + (p.y - minY) * escala),
    });

    proyeccion.current = proyectar;

    const dueño = new Map(datos.tramos.map((t) => [t.numero, t.gana]));
    const señalado = cursor === null ? null : tramoEnMetros(datos, cursor);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Un trazo por tramo, cortando entre uno y otro: la costura es lo que
    // permite contar los tramos y ver dónde cambia el mando.
    let inicio = 0;
    for (let i = 1; i <= trazado.length; i++) {
      const cambia = i === trazado.length || trazado[i].tramo !== trazado[inicio].tramo;
      if (!cambia) continue;

      const tramo = trazado[inicio].tramo;
      const gana = dueño.get(tramo) ?? null;
      const esSeñalado = señalado?.numero === tramo;

      ctx.beginPath();
      for (let j = inicio; j < i; j++) {
        const { x, y } = proyectar(trazado[j]);
        if (j === inicio) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.strokeStyle = gana === 1 ? colores.uno : gana === 2 ? colores.dos : paleta.current.tinta;
      ctx.lineWidth = esSeñalado ? GROSOR + 4 : GROSOR;
      // Los empatados van tenues: son los que no cuentan nada.
      ctx.globalAlpha = gana === null ? 0.35 : esSeñalado ? 1 : 0.9;
      ctx.stroke();
      ctx.globalAlpha = 1;

      inicio = i;
    }

    if (señalado) {
      const punto = trazado.find((p) => p.tramo === señalado.numero);
      if (punto) {
        const { x, y } = proyectar(punto);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = paleta.current.fondo;
        ctx.fill();
        ctx.strokeStyle = paleta.current.tinta;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }, [ancho, trazado, datos, cursor, colores, resolvedTheme]);

  if (datos.tramos.length === 0 || trazado.length < 2) {
    return (
      <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        No hay trazado suficiente en estas dos vueltas para repartir el circuito.
      </p>
    );
  }

  const señalado = cursor === null ? null : tramoEnMetros(datos, cursor);
  const empatados = datos.tramos.length - datos.gana1 - datos.gana2;

  /**
   * El dato que no se ve sumando: ganar más trozos no es ganar la vuelta.
   *
   * En Zandvoort, Verstappen se lleva 14 de 25 tramos y aun así pierde por
   * cuatro décimas, porque los de Norris son mucho más gordos. Decirlo evita
   * la lectura equivocada de contar colores.
   */
  const mandaEnTramos = datos.gana1 > datos.gana2 ? piloto1 : piloto2;
  const totalDelta = datos.tramos.reduce((suma, t) => suma + (t.tiempo1 - t.tiempo2), 0);
  const ganaLaVuelta = totalDelta < 0 ? piloto1 : piloto2;
  const desacuerdo = datos.gana1 !== datos.gana2 && mandaEnTramos !== ganaLaVuelta;

  const desdeElPuntero = (evento: React.PointerEvent<HTMLCanvasElement>) => {
    const proyectar = proyeccion.current;
    if (!proyectar) return;

    const rect = evento.currentTarget.getBoundingClientRect();
    const raton = { x: evento.clientX - rect.left, y: evento.clientY - rect.top };

    let cerca: PuntoDeTrazado | null = null;
    let mejor = Infinity;

    for (const punto of trazado) {
      const { x, y } = proyectar(punto);
      const distancia = (x - raton.x) ** 2 + (y - raton.y) ** 2;
      if (distancia < mejor) {
        mejor = distancia;
        cerca = punto;
      }
    }

    // Solo si el dedo está razonablemente encima del asfalto: si no, mover el
    // ratón por una esquina vacía haría saltar el señalado al azar.
    if (cerca && mejor < 40 ** 2) setCursor(cerca.metros);
  };

  return (
    <figure className="m-0">
      <figcaption className="mb-2 text-sm text-muted-foreground">
        {señalado ? (
          <>
            Tramo <b className="tabular-nums text-foreground">{señalado.numero}</b> de{' '}
            {datos.tramos.length}
            {señalado.gana === null ? (
              <> · empatados</>
            ) : (
              <>
                {' · '}
                <b className="text-foreground">{señalado.gana === 1 ? piloto1 : piloto2}</b> por{' '}
                <b className="font-mono tabular-nums text-foreground">
                  {señalado.ventaja.toFixed(3)} s
                </b>
              </>
            )}
          </>
        ) : (
          <>
            {datos.tramos.length} tramos de{' '}
            <b className="tabular-nums text-foreground">
              {Math.round(datos.longitud / datos.tramos.length)} m
            </b>
            . Cada uno es de quien menos tardó en pasarlo.
          </>
        )}
      </figcaption>

      <div ref={caja} className="w-full">
        <canvas
          ref={lienzo}
          className="w-full touch-none"
          role="img"
          aria-label={`Circuito repartido en ${datos.tramos.length} tramos: ${piloto1} es más rápido en ${datos.gana1}, ${piloto2} en ${datos.gana2}${
            empatados > 0 ? ` y ${empatados} quedan empatados` : ''
          }. El detalle está en la tabla que sigue.`}
          onPointerMove={desdeElPuntero}
          onPointerDown={desdeElPuntero}
          onPointerLeave={() => setCursor(null)}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: colores.uno }}
          />
          {piloto1} <b className="tabular-nums text-foreground">{datos.gana1}</b>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: colores.dos }}
          />
          {piloto2} <b className="tabular-nums text-foreground">{datos.gana2}</b>
        </span>
        {empatados > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-muted-foreground/40" />
            empatados <b className="tabular-nums text-foreground">{empatados}</b>
          </span>
        )}
      </div>

      {desacuerdo && (
        <p className="mt-3 text-sm text-muted-foreground">
          <b className="text-foreground">{mandaEnTramos}</b> es más rápido en más tramos, pero la
          vuelta se la lleva <b className="text-foreground">{ganaLaVuelta}</b>: ganar muchos trozos
          por poco no compensa perder unos pocos por mucho.
        </p>
      )}

      {/* Envuelta en un `div`: `overflow: hidden` —de lo que depende `sr-only`
          para recortar— no se aplica a un elemento `display: table`. */}
      <div className="sr-only">
        <table>
          <caption>
            Reparto del circuito entre {piloto1} y {piloto2}, tramo a tramo
          </caption>
          <thead>
            <tr>
              <th scope="col">Tramo</th>
              <th scope="col">Metro</th>
              <th scope="col">Más rápido</th>
              <th scope="col">Ventaja</th>
            </tr>
          </thead>
          <tbody>
            {datos.tramos.map((tramo) => (
              <tr key={tramo.numero}>
                <th scope="row">{tramo.numero}</th>
                <td>{Math.round(tramo.metros)}</td>
                <td>
                  {tramo.gana === null ? 'empatados' : tramo.gana === 1 ? piloto1 : piloto2}
                </td>
                <td>{tramo.gana === null ? '—' : `${tramo.ventaja.toFixed(3)} s`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
