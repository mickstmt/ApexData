'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { comoDelta, prepararDelta, type PuntoDelta } from '@/lib/delta-vuelta';
import { contrastBetween, readableOnLight, teamColor } from '@/lib/team-colors';
import type { TelemetryPoint } from '@/types';

/**
 * Dónde se gana y se pierde una vuelta.
 *
 * Las trazas de velocidad superpuestas dicen quién va más rápido en cada curva,
 * pero no responden a la pregunta que se hace uno mirándolas: **de dónde salen
 * los cuatro décimas de diferencia**. Casi nunca están donde parece — suelen
 * acumularse en tres frenadas y devolverse en una recta.
 *
 * Esta es esa respuesta. La curva es el tiempo acumulado del primer piloto
 * respecto al segundo en cada punto del trazado, y el área hasta la línea
 * central lleva el color de quien va por delante ahí. La superficie es lo que
 * transmite **cuánto**; el signo, **quién**.
 *
 * Se dibuja en lienzo y no en SVG por lo mismo que las trazas: son cuatrocientos
 * puntos que se repintan en cada movimiento del dedo, y cuatrocientos nodos del
 * DOM cambiando a esa frecuencia no van finos en un teléfono.
 *
 * El cursor es el compartido con el mapa del trazado y las trazas: mover el dedo
 * aquí mueve el punto sobre el asfalto, y al revés.
 */

const ALTO = 190;
const MARGEN = { izquierda: 52, derecha: 12, arriba: 14, abajo: 26 };

/** Cuánto se separan dos colores antes de que haya que distinguirlos de otro modo. */
const SEPARACION_MINIMA = 1.6;

export function DeltaVuelta({
  piloto1,
  piloto2,
  equipo1,
  equipo2,
  traza1,
  traza2,
  cursor: cursorExterno,
  onCursor,
}: {
  piloto1: string;
  piloto2: string;
  equipo1?: string | null;
  equipo2?: string | null;
  traza1: TelemetryPoint[];
  traza2: TelemetryPoint[];
  cursor?: number | null;
  onCursor?: (distancia: number | null) => void;
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

  const datos = useMemo(() => prepararDelta(traza1, traza2), [traza1, traza2]);

  /**
   * Los dos colores, garantizando que se distingan.
   *
   * Dos compañeros de equipo comparten color, y entonces el área de arriba y la
   * de abajo serían la misma: el gráfico dejaría de decir quién manda. Cuando
   * pasa, el segundo se aclara u oscurece hasta separarse.
   */
  const colores = useMemo(() => {
    const uno = teamColor(equipo1).color;
    let dos = teamColor(equipo2).color;

    if (contrastBetween(uno, dos) < SEPARACION_MINIMA) {
      dos = readableOnLight(dos, 4.5);
      if (contrastBetween(uno, dos) < SEPARACION_MINIMA) dos = oscuro ? '#FFFFFF' : '#111111';
    }

    return { uno, dos };
  }, [equipo1, equipo2, oscuro]);

  const paleta = useRef({ tinta: '#8A8A94', rejilla: '#2A2A33', fondo: '#0A0A0A', texto: '#FAFAFA' });

  useEffect(() => {
    // Un lienzo no hereda variables CSS, así que este es el único sitio que
    // tiene que leer el tema en código, y repintar cuando cambia.
    const estilos = getComputedStyle(document.documentElement);
    paleta.current = {
      tinta: `hsl(${estilos.getPropertyValue('--muted-foreground').trim()})`,
      rejilla: `hsl(${estilos.getPropertyValue('--border').trim()})`,
      fondo: `hsl(${estilos.getPropertyValue('--card').trim()})`,
      texto: `hsl(${estilos.getPropertyValue('--foreground').trim()})`,
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
    if (!canvas || ancho === 0 || datos.puntos.length === 0) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = ancho * ratio;
    canvas.height = ALTO * ratio;
    canvas.style.width = `${ancho}px`;
    canvas.style.height = `${ALTO}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, ancho, ALTO);

    const dentroAncho = ancho - MARGEN.izquierda - MARGEN.derecha;
    const dentroAlto = ALTO - MARGEN.arriba - MARGEN.abajo;

    // El eje se redondea hacia arriba para que la curva no toque el borde y
    // para que la escala no baile entre comparaciones parecidas.
    const tope = Math.max(0.05, Math.ceil(datos.extremo * 10) / 10 + 0.05);
    const x = (metros: number) => MARGEN.izquierda + (metros / datos.longitud) * dentroAncho;
    const y = (delta: number) =>
      MARGEN.arriba + dentroAlto / 2 - (delta / tope) * (dentroAlto / 2);

    const cero = y(0);

    // Rejilla y etiquetas, recesivas: el dato es la curva.
    ctx.font = '10px ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (const valor of [-tope * 0.75, -tope * 0.375, 0, tope * 0.375, tope * 0.75]) {
      const linea = y(valor);
      const esCero = Math.abs(valor) < 1e-9;

      ctx.beginPath();
      ctx.strokeStyle = esCero ? paleta.current.tinta : paleta.current.rejilla;
      ctx.lineWidth = esCero ? 1.5 : 1;
      ctx.globalAlpha = esCero ? 0.85 : 1;
      ctx.moveTo(MARGEN.izquierda, linea);
      ctx.lineTo(ancho - MARGEN.derecha, linea);
      ctx.stroke();
      ctx.globalAlpha = 1;

      const signo = valor > 0 ? '+' : valor < 0 ? '−' : '';
      ctx.fillStyle = paleta.current.tinta;
      ctx.fillText(`${signo}${Math.abs(valor).toFixed(2)}`, MARGEN.izquierda - 8, linea);
    }

    ctx.textAlign = 'center';
    for (let metros = 0; metros <= datos.longitud; metros += 1000) {
      ctx.fillText(`${(metros / 1000).toFixed(0)} km`, x(metros), ALTO - 10);
    }

    // Arriba manda el SEGUNDO —el primero va perdiendo tiempo—, y al revés.
    pintarArea(ctx, datos.puntos, true, colores.dos, x, y, cero);
    pintarArea(ctx, datos.puntos, false, colores.uno, x, y, cero);

    ctx.beginPath();
    ctx.strokeStyle = paleta.current.texto;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    datos.puntos.forEach((punto, indice) => {
      const px = x(punto.metros);
      const py = y(punto.delta);
      if (indice === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // El mejor momento del primer piloto, señalado sin decir nada: es el dato
    // que la gente busca en cuanto entiende el gráfico —«¿dónde le sacó más?»—
    // y encontrarlo a ojo en una curva de cuatrocientos puntos es incómodo.
    if (datos.mejor && cursor === null) {
      ctx.beginPath();
      ctx.arc(x(datos.mejor.metros), y(datos.mejor.delta), 4, 0, Math.PI * 2);
      ctx.fillStyle = datos.mejor.delta <= 0 ? colores.uno : colores.dos;
      ctx.fill();
      ctx.strokeStyle = paleta.current.fondo;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (cursor !== null) {
      const px = x(Math.min(Math.max(cursor, 0), datos.longitud));

      ctx.beginPath();
      ctx.strokeStyle = paleta.current.tinta;
      ctx.lineWidth = 1;
      ctx.moveTo(px, MARGEN.arriba);
      ctx.lineTo(px, ALTO - MARGEN.abajo);
      ctx.stroke();

      const punto = enElMetro(datos.puntos, cursor);
      if (punto) {
        ctx.beginPath();
        ctx.arc(px, y(punto.delta), 4, 0, Math.PI * 2);
        ctx.fillStyle = punto.delta <= 0 ? colores.uno : colores.dos;
        ctx.fill();
        // Anillo del color del fondo: sin él, el punto se pierde encima de la
        // curva justo cuando más se está mirando.
        ctx.strokeStyle = paleta.current.fondo;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }, [ancho, datos, cursor, colores, resolvedTheme]);

  if (datos.puntos.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        No hay telemetría suficiente en las dos vueltas para compararlas metro a metro.
      </p>
    );
  }

  const señalado = cursor === null ? null : enElMetro(datos.puntos, cursor);

  const desdeElPuntero = (evento: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = evento.currentTarget.getBoundingClientRect();
    const dentro = rect.width - MARGEN.izquierda - MARGEN.derecha;
    const proporcion = (evento.clientX - rect.left - MARGEN.izquierda) / dentro;

    setCursor(Math.min(Math.max(proporcion, 0), 1) * datos.longitud);
  };

  return (
    <figure className="m-0">
      <figcaption className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm text-muted-foreground">
          {señalado ? (
            <>
              En el metro{' '}
              <b className="font-mono tabular-nums text-foreground">
                {Math.round(señalado.metros).toLocaleString('es')}
              </b>
              , {piloto1} va{' '}
              <b className="font-mono tabular-nums text-foreground">
                {comoDelta(señalado.delta)}
              </b>
            </>
          ) : (
            <>
              Al final de la vuelta, {piloto1} va{' '}
              <b className="font-mono tabular-nums text-foreground">{comoDelta(datos.final)}</b>{' '}
              respecto a {piloto2}
              {datos.mejor && (
                <>
                  {' · '}mejor momento{' '}
                  <b className="font-mono tabular-nums text-foreground">
                    {comoDelta(datos.mejor.delta)}
                  </b>{' '}
                  en el metro{' '}
                  <b className="font-mono tabular-nums text-foreground">
                    {Math.round(datos.mejor.metros).toLocaleString('es')}
                  </b>
                </>
              )}
            </>
          )}
        </span>
      </figcaption>

      <div ref={caja} className="w-full">
        <canvas
          ref={lienzo}
          className="w-full touch-none"
          role="img"
          aria-label={`Delta acumulado entre ${piloto1} y ${piloto2} a lo largo de ${Math.round(
            datos.longitud
          ).toLocaleString('es')} metros. Termina en ${comoDelta(datos.final)}. Los números están en la tabla que sigue.`}
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
          {piloto1} por delante
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: colores.dos }}
          />
          {piloto2} por delante
        </span>
      </div>

      {/* La alternativa textual. Va envuelta en un `div`: `overflow: hidden`
          —de lo que depende `sr-only` para recortar— no se aplica a un elemento
          `display: table`, y la tabla empujaría el documento a lo ancho. */}
      <div className="sr-only">
        <table>
          <caption>
            Delta acumulado de {piloto1} respecto a {piloto2}, cada quinientos metros
          </caption>
          <thead>
            <tr>
              <th scope="col">Metro</th>
              <th scope="col">Delta</th>
              <th scope="col">Por delante</th>
            </tr>
          </thead>
          <tbody>
            {cada500(datos.puntos, datos.longitud).map((punto) => (
              <tr key={punto.metros}>
                <th scope="row">{Math.round(punto.metros)}</th>
                <td>{comoDelta(punto.delta)}</td>
                <td>{punto.delta <= 0 ? piloto1 : piloto2}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

/**
 * Los tramos seguidos en los que manda uno de los dos, rellenos.
 *
 * Vive fuera del componente y recibe todo lo que usa. Dentro era una clausura
 * sobre valores memorizados, y el compilador de React lo rechaza —con razón:
 * no puede demostrar que no los modifique—.
 */
function pintarArea(
  ctx: CanvasRenderingContext2D,
  puntos: PuntoDelta[],
  arriba: boolean,
  color: string,
  x: (metros: number) => number,
  y: (delta: number) => number,
  cero: number
) {
  let tramo: PuntoDelta[] = [];

  const cerrar = () => {
    if (tramo.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(x(tramo[0].metros), cero);
      for (const punto of tramo) ctx.lineTo(x(punto.metros), y(punto.delta));
      ctx.lineTo(x(tramo[tramo.length - 1].metros), cero);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    tramo = [];
  };

  for (const punto of puntos) {
    if (arriba ? punto.delta > 0 : punto.delta < 0) tramo.push(punto);
    else cerrar();
  }

  cerrar();
}

/** El punto de la curva más cercano a unos metros dados. */
function enElMetro(puntos: PuntoDelta[], metros: number): PuntoDelta | null {
  if (puntos.length === 0) return null;

  return puntos.reduce((mejor, punto) =>
    Math.abs(punto.metros - metros) < Math.abs(mejor.metros - metros) ? punto : mejor
  );
}

/**
 * Una fila cada quinientos metros, más la última.
 *
 * Cuatrocientas filas serían ilegibles con un lector de pantalla: la tabla
 * existe para poder seguir la historia, no para volcar el vector entero.
 */
function cada500(puntos: PuntoDelta[], longitud: number): PuntoDelta[] {
  const filas: PuntoDelta[] = [];

  for (let metros = 0; metros <= longitud; metros += 500) {
    const punto = enElMetro(puntos, metros);
    if (punto) filas.push(punto);
  }

  const ultimo = puntos[puntos.length - 1];
  if (filas[filas.length - 1]?.metros !== ultimo.metros) filas.push(ultimo);

  return filas;
}
