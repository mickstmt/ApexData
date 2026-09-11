'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { VolverAtras } from '@/components/ui/VolverAtras';
import { CargaDelReplay } from '@/components/replay/CargaDelReplay';
import { ControlesDeReplay } from '@/components/replay/ControlesDeReplay';
import { MapaDeCarrera } from '@/components/replay/MapaDeCarrera';
import { TorreDeTiempos, type FilaDeLaTorre } from '@/components/replay/TorreDeTiempos';
import { useRelojDeReplay } from '@/components/replay/useRelojDeReplay';
import { PRIMERA_TEMPORADA_CON_REPLAY } from '@/components/replay/VerReplay';
import { leerBloque, type BloqueDePosiciones } from '@/lib/replay/bloque';
import { estadoEn, nombreDeEstado, tramosDelScrubber, type ClaseDeEstado } from '@/lib/replay/estados';
import {
  calcularProgreso,
  estaFuera,
  huecoEn,
  ordenEn,
  prepararTrazado,
  vueltaEn,
  type Trazado,
} from '@/lib/replay/progreso';
import { formatoReloj } from '@/lib/replay/reloj';
import { teamColor, teamIdFromName } from '@/lib/team-colors';
import type { PositionsMeta } from '@/types';

/**
 * La pantalla del replay: pide la carrera, la prepara y la reproduce.
 *
 * ## Los datos
 *
 * Dos peticiones: el `meta` —pilotos, línea de tiempo, estados, trazado— y
 * el bloque binario de posiciones, que se lee del stream trozo a trozo para
 * poder decir cuánto falta. El porcentaje es real: el meta dice cuántos bytes
 * van a llegar. Después se proyecta cada coche sobre el trazado para saber
 * el orden en cada instante, que es lo único que no viene calculado.
 *
 * ## La pantalla
 *
 * La torre, en carbón siempre. En el móvil, el mapa se queda pegado bajo la
 * cabecera y la torre se desplaza debajo, con los mandos fijos al pie, sobre
 * la barra de pestañas. A partir de `md`, mapa y torre lado a lado: la torre
 * entera cabe sin desplazar y los mandos van bajo el mapa.
 */

type Fase =
  | { tipo: 'no-disponible' }
  | { tipo: 'cargando'; fraccion: number | null; mensaje: string }
  | { tipo: 'sin-datos'; mensaje: string }
  | { tipo: 'sin-servicio' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'listo'; datos: DatosDelReplay };

interface DatosDelReplay {
  meta: PositionsMeta;
  bloque: BloqueDePosiciones;
  trazado: Trazado;
  progreso: Float64Array[];
}

export function ReplayClient({
  year,
  round,
  sesion,
  nombre,
  circuito,
  disponible,
}: {
  year: number;
  round: number;
  sesion: 'R' | 'S';
  nombre: string;
  circuito: string;
  disponible: boolean;
}) {
  const [fase, setFase] = useState<Fase>(
    disponible ? { tipo: 'cargando', fraccion: null, mensaje: 'Pidiendo la carrera…' } : { tipo: 'no-disponible' }
  );

  useEffect(() => {
    if (!disponible) return;

    const control = new AbortController();
    const base = `/api/positions/${year}/${round}/${sesion}`;

    const cargar = async () => {
      try {
        const rm = await fetch(`${base}/meta`, { signal: control.signal });
        if (rm.status === 404) {
          const { error } = await rm.json().catch(() => ({ error: '' }));
          setFase({ tipo: 'sin-datos', mensaje: error || 'Esta sesión todavía no tiene posiciones.' });
          return;
        }
        if (rm.status === 503) return setFase({ tipo: 'sin-servicio' });
        if (!rm.ok) return setFase({ tipo: 'error', mensaje: `El meta respondió ${rm.status}.` });

        const meta = (await rm.json()) as PositionsMeta;
        const esperado = meta.drivers.length * 2 * meta.timeline.count * 2;
        if (esperado === 0 || meta.track.length < 3) {
          return setFase({ tipo: 'sin-datos', mensaje: 'Esta sesión no trae posiciones ni trazado.' });
        }

        setFase({ tipo: 'cargando', fraccion: 0, mensaje: 'Descargando las posiciones…' });

        const rb = await fetch(base, { signal: control.signal });
        if (rb.status === 404) return setFase({ tipo: 'sin-datos', mensaje: 'Esta sesión todavía no tiene posiciones.' });
        if (rb.status === 503) return setFase({ tipo: 'sin-servicio' });
        if (!rb.ok || !rb.body) return setFase({ tipo: 'error', mensaje: `Las posiciones respondieron ${rb.status}.` });

        // Trozo a trozo, para poder decir cuánto falta. `Content-Length` no
        // sirve: es el tamaño comprimido, y lo que llega ya viene descomprimido.
        const buffer = new Uint8Array(esperado);
        let recibido = 0;
        let ultimoPct = -1;
        const lector = rb.body.getReader();

        for (;;) {
          const { done, value } = await lector.read();
          if (done) break;
          if (recibido + value.length > esperado) {
            return setFase({ tipo: 'error', mensaje: 'Llegaron más posiciones de las anunciadas.' });
          }
          buffer.set(value, recibido);
          recibido += value.length;

          const pct = Math.floor((recibido / esperado) * 100);
          if (pct !== ultimoPct) {
            ultimoPct = pct;
            setFase({ tipo: 'cargando', fraccion: recibido / esperado, mensaje: 'Descargando las posiciones…' });
          }
        }

        // El sitio donde se guarda ya mide lo anunciado, así que la guarda de
        // `leerBloque` no puede saltar aunque llegue de menos: los bytes que
        // faltan se leerían como ceros y los coches se amontonarían en el
        // origen del circuito sin un solo error. Se comprueba aquí.
        if (recibido !== esperado) {
          return setFase({
            tipo: 'error',
            mensaje: `La descarga se cortó: llegaron ${recibido} de ${esperado} bytes.`,
          });
        }

        setFase({ tipo: 'cargando', fraccion: 1, mensaje: 'Ordenando la carrera…' });
        // Un respiro para que la barra llegue al final antes del cálculo.
        await new Promise((listo) => setTimeout(listo, 16));
        if (control.signal.aborted) return;

        const bloque = leerBloque(buffer.buffer, meta.drivers.length, meta.timeline.count);
        const trazado = prepararTrazado(meta.track);
        const progreso = calcularProgreso(bloque, trazado);

        setFase({ tipo: 'listo', datos: { meta, bloque, trazado, progreso } });
      } catch (error) {
        if (control.signal.aborted) return;
        setFase({ tipo: 'error', mensaje: error instanceof Error ? error.message : 'No se pudo cargar el replay.' });
      }
    };

    void cargar();
    return () => control.abort();
  }, [year, round, sesion, disponible]);

  const titulo = sesion === 'S' ? 'Sprint' : 'Carrera';

  return (
    <div className="bg-[#0B0B0F] text-[#F5F5F7]">
      {fase.tipo === 'listo' ? (
        <Replay datos={fase.datos} year={year} round={round} nombre={nombre} titulo={titulo} />
      ) : (
        <div className="flex flex-col md:h-[calc(100dvh-4rem)]">
          <Cabecera year={year} round={round} nombre={nombre} titulo={titulo} />
          <div className="flex-1">
            {fase.tipo === 'cargando' && <CargaDelReplay fraccion={fase.fraccion} mensaje={fase.mensaje} />}
            {fase.tipo === 'no-disponible' && (
              <Aviso titulo={`Sin replay antes de ${PRIMERA_TEMPORADA_CON_REPLAY}`}>
                FastF1 no tiene la posición de los coches de temporadas anteriores. Los resultados de {nombre} {year} sí
                están en su ficha.
              </Aviso>
            )}
            {fase.tipo === 'sin-datos' && <Aviso titulo="Todavía no hay posiciones">{fase.mensaje}</Aviso>}
            {fase.tipo === 'sin-servicio' && (
              <Aviso titulo="El servicio de telemetría no responde">
                El replay necesita el microservicio FastF1. El resto de ApexData funciona con normalidad.
              </Aviso>
            )}
            {fase.tipo === 'error' && <Aviso titulo="No se pudo cargar el replay">{fase.mensaje}</Aviso>}
          </div>
        </div>
      )}
      <p className="sr-only">{circuito}</p>
    </div>
  );
}

const PILDORA: Record<ClaseDeEstado, string> = {
  libre: 'bg-[#1B1B22] text-[#BFBFC6]',
  amarilla: 'bg-[#FBBE23] text-black',
  sc: 'bg-[#FF8D29] text-black',
  vsc: 'bg-[#FF8D29] text-black',
  roja: 'bg-[#FF4238] text-white',
};

function Cabecera({
  year,
  round,
  nombre,
  titulo,
  vuelta,
  totalVueltas,
  reloj,
  estado = 'libre',
}: {
  year: number;
  round: number;
  nombre: string;
  titulo: string;
  vuelta?: number;
  totalVueltas?: number;
  reloj?: string;
  estado?: ClaseDeEstado;
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-[#26262E] px-4 py-3">
      <div className="min-w-0">
        <VolverAtras
          href={`/results/${year}/${round}`}
          className="mb-1.5 inline-flex min-h-[32px] items-center gap-1.5 text-xs text-[#A2A2AC] hover:text-[#F5F5F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          {nombre} {year}
        </VolverAtras>
        <h1 className="font-display text-2xl font-bold leading-none">
          {vuelta !== undefined ? (
            <>
              Vuelta {vuelta}
              <span className="text-sm text-[#A2A2AC]">/{totalVueltas}</span>
            </>
          ) : (
            titulo
          )}
        </h1>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="font-mono text-[13px] tabular-nums text-[#A2A2AC] md:hidden" aria-label="Minuto de carrera">
          {reloj ?? '0:00'}
        </span>
        <span
          role="status"
          className={`inline-block rounded px-2 py-1.5 font-display text-[10px] font-semibold uppercase tracking-[.1em] ${PILDORA[estado]}`}
        >
          {nombreDeEstado(estado)}
        </span>
      </div>
    </div>
  );
}

function Aviso({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div role="status" className="mx-auto max-w-md px-6 py-16 text-center">
      <h2 className="mb-2 font-display text-lg font-semibold">{titulo}</h2>
      <p className="text-sm text-[#A2A2AC]">{children}</p>
    </div>
  );
}

function colorDeEquipo(equipo: string | null, respaldo: string | null): string {
  const id = teamIdFromName(equipo);
  if (id) return teamColor(id).color;
  return respaldo ?? '#8A8A94';
}

function Replay({
  datos,
  year,
  round,
  nombre,
  titulo,
}: {
  datos: DatosDelReplay;
  year: number;
  round: number;
  nombre: string;
  titulo: string;
}) {
  const { meta, bloque, trazado, progreso } = datos;
  const { count, step: paso } = meta.timeline;
  const reloj = useRelojDeReplay(count, paso, 0);
  const [elegido, setElegido] = useState<number | null>(null);

  const k = reloj.kEntero;
  const t = k * paso;
  const estado = estadoEn(meta.trackStatus, t);

  const colores = useMemo(() => meta.drivers.map((d) => colorDeEquipo(d.team, d.color)), [meta.drivers]);

  // Con bandera roja la carrera está detenida.
  const parada = estado === 'roja';

  const { filas, coches, lider } = useMemo(() => {
    const orden = ordenEn(progreso, k);
    const lider = orden[0] ?? 0;
    const fuera = meta.drivers.map((_, i) => estaFuera(progreso, i, k, lider));

    // Los que tienen posición, por orden; los que no, al final, como fuera.
    const conPosicion = new Set(orden);
    const restantes = meta.drivers.map((_, i) => i).filter((i) => !conPosicion.has(i));

    const filas: FilaDeLaTorre[] = [...orden, ...restantes].map((i, idx) => ({
      piloto: i,
      posicion: idx + 1,
      codigo: meta.drivers[i].code,
      nombre: meta.drivers[i].name,
      equipo: meta.drivers[i].team,
      color: colores[i],
      // Con la carrera parada no hay hueco en pista que medir: todos están
      // quietos y la cuenta daría lo que lleve durando la parada. Y el de
      // quien está fuera tampoco se calcula: su fila enseña OUT.
      hueco:
        idx === 0 ? 'líder' : fuera[i] ? '' : parada ? '—' : `+${huecoEn(progreso, k, lider, i, paso).toFixed(1)}s`,
      fuera: fuera[i],
    }));

    const coches = meta.drivers.map((d, i) => ({ color: colores[i], codigo: d.code, fuera: fuera[i] }));
    return { filas, coches, lider };
  }, [progreso, k, meta.drivers, colores, paso, parada]);

  const tramos = useMemo(() => tramosDelScrubber(meta.trackStatus, count * paso), [meta.trackStatus, count, paso]);

  // Las marcas de vuelta del scrubber: los cruces de meta de quien más dio,
  // cada diez vueltas. Con las 72 de una carrera el scrubber era un peine.
  const marcasDeVuelta = useMemo(() => {
    const duracion = count * paso;
    const ganador = meta.drivers.reduce((mejor, d) => (d.laps.length > mejor.laps.length ? d : mejor), meta.drivers[0]);
    return ganador.laps
      .filter((c, i) => (i + 1) % 10 === 0 && c > 0 && c < duracion)
      .map((c) => (c / duracion) * 100);
  }, [meta.drivers, count, paso]);

  const vuelta = Math.min(meta.totalLaps, vueltaEn(progreso, lider, k, trazado.longitud));
  const elegir = (i: number) => setElegido((actual) => (actual === i ? null : i));

  // Cuánto tapan, en el móvil, el bloque pegado de arriba y los mandos de
  // abajo: la torre lo necesita para que «poner a la vista» ponga a la vista.
  // Se mide en vez de suponerse porque el mapa es proporcional al ancho.
  const pegadoRef = useRef<HTMLDivElement>(null);
  const mandosRef = useRef<HTMLDivElement>(null);
  const [tapado, setTapado] = useState({ arriba: 0, abajo: 0 });
  useEffect(() => {
    const medir = () => {
      // La cabecera y la barra de la app se miden, no se suponen: llevan
      // dentro los bordes seguros del teléfono, que desde aquí no se leen.
      const cabeceraDeLaApp = document.querySelector('header')?.getBoundingClientRect().height ?? 64;
      const barraDePestanas =
        document.querySelector<HTMLElement>('nav[aria-label="Navegación principal"]')?.offsetHeight ?? 64;
      setTapado({
        arriba: cabeceraDeLaApp + (pegadoRef.current?.offsetHeight ?? 0),
        abajo: barraDePestanas + (mandosRef.current?.offsetHeight ?? 0),
      });
    };
    medir();
    const observador = new ResizeObserver(medir);
    if (pegadoRef.current) observador.observe(pegadoRef.current);
    if (mandosRef.current) observador.observe(mandosRef.current);
    return () => observador.disconnect();
  }, []);

  const controles = (conReloj: boolean) => (
    <ControlesDeReplay
      k={reloj.kEntero}
      count={count}
      paso={paso}
      reproduciendo={reloj.reproduciendo}
      velocidad={reloj.velocidad}
      tramos={tramos}
      vueltas={marcasDeVuelta}
      onAlternar={reloj.alternar}
      onVelocidad={reloj.cambiarVelocidad}
      onBuscar={reloj.buscar}
      conReloj={conReloj}
    />
  );

  const mapa = (alto: 'proporcion' | 'relleno') => (
    <MapaDeCarrera
      trazado={trazado}
      rotacion={meta.rotation}
      bloque={bloque}
      coches={coches}
      estado={estado}
      elegido={elegido}
      onElegir={elegir}
      suscribir={reloj.suscribir}
      kRef={reloj.kRef}
      alto={alto}
      ariaLabel={`Mapa de la carrera con ${meta.drivers.length} coches sobre el circuito. Toca un coche para seguirlo; la clasificación está en la lista.`}
    />
  );

  return (
    // Una sola rejilla para los dos mundos.
    //
    // Móvil: cabecera y mapa forman UN bloque pegado bajo la cabecera de la
    // app, y la torre se desplaza debajo. Son hermanos dentro de este mismo
    // contenedor a propósito: `sticky` solo pega dentro de su padre, y con
    // el mapa metido en una columna propia el padre medía lo que el mapa y no
    // había dónde pegarse — se vio en el navegador con la fila 18 a la vista y
    // el mapa desaparecido por arriba.
    //
    // Escritorio: tres filas y dos columnas — cabecera a lo ancho; mapa y
    // mandos a la izquierda; la torre entera a la derecha, desplazable.
    <div className="md:grid md:h-[calc(100dvh-4rem)] md:grid-cols-[1fr_340px] md:grid-rows-[auto_1fr_auto]">
      <div
        ref={pegadoRef}
        className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-10 border-b border-[#26262E] bg-[#0B0B0F] md:static md:col-span-2 md:border-b-0"
      >
        <Cabecera
          year={year}
          round={round}
          nombre={`${nombre} · ${titulo}`}
          titulo={titulo}
          vuelta={vuelta}
          totalVueltas={meta.totalLaps}
          reloj={formatoReloj(t)}
          estado={estado}
        />
        <div className="md:hidden">{mapa('proporcion')}</div>
      </div>

      <div className="hidden min-h-0 md:col-start-1 md:row-start-2 md:block">{mapa('relleno')}</div>
      <div className="hidden border-t border-[#26262E] md:col-start-1 md:row-start-3 md:block">{controles(true)}</div>

      <div className="pb-[124px] md:col-start-2 md:row-span-2 md:row-start-2 md:min-h-0 md:overflow-y-auto md:border-l md:border-[#26262E] md:pb-0">
        <TorreDeTiempos
          filas={filas}
          elegido={elegido}
          onElegir={elegir}
          className="md:py-1.5"
          tapadoArriba={tapado.arriba}
          tapadoAbajo={tapado.abajo}
        />
      </div>

      {/* Los mandos del móvil, al alcance del pulgar: fijos justo encima de
          la barra de pestañas, que publica su alto en `--barra-inferior`.
          Antes decían `4rem`, cuatro píxeles más que la barra, y por esa
          rendija se veía la página de detrás. */}
      <div
        ref={mandosRef}
        className="fixed inset-x-0 bottom-[var(--barra-inferior)] z-40 border-t border-[#26262E] bg-[#0B0B0F] md:hidden"
      >
        {controles(false)}
      </div>
    </div>
  );
}
