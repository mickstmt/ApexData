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
import {
  estadoEn,
  nombreDeEstado,
  relojDeCarrera,
  tramosDelScrubber,
  type ClaseDeEstado,
} from '@/lib/replay/estados';
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
import { cn } from '@/lib/utils';
import { useTemaDelReplay, type TemaDelReplay } from '@/components/replay/tema';
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
 * Sigue el tema de la app, claro u oscuro, como cualquier otra pantalla: sus
 * colores son los tokens `--replay-*`. En el móvil, el mapa se queda pegado bajo la
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

  // El tema se resuelve aquí y no dentro de `Replay`, que solo monta cuando la
  // carrera ya está descargada: leyéndolo desde el principio, para cuando hay
  // algo que pintar la paleta lleva rato lista y el mapa no se pinta ni una vez
  // con los colores del otro tema.
  const tema = useTemaDelReplay();

  return (
    <div className="bg-[var(--replay-fondo)] text-[var(--replay-texto)]">
      {fase.tipo === 'listo' ? (
        <Replay datos={fase.datos} year={year} round={round} nombre={nombre} titulo={titulo} tema={tema} />
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

/**
 * La píldora usa la misma tinta que el mapa y que el scrubber, que es lo que
 * promete `estados.ts`: si la pista se pinta de ámbar, la palabra que la
 * nombra va del mismo ámbar. Sobre claro esas tintas son más oscuras —lo pide
 * el contraste contra el fondo blanco— y la píldora las sigue.
 *
 * La tinta de dentro no cambia con el tema porque el fondo de la píldora no es
 * la página, es el propio color: negro sobre ámbar da 12,5:1 en oscuro y
 * 6,2:1 en claro, y sobre naranja 9,1 y 6,0.
 */
const PILDORA: Record<ClaseDeEstado, string> = {
  libre: 'bg-[var(--replay-superficie-2)] text-[var(--replay-hueco)]',
  amarilla: 'bg-[var(--replay-amarilla)] text-black',
  sc: 'bg-[var(--replay-naranja)] text-black',
  vsc: 'bg-[var(--replay-naranja)] text-black',
  roja: 'bg-[var(--replay-roja)] text-white',
};

/**
 * La cabecera del replay, en dos alturas y un solo DOM.
 *
 * En el móvil va en UNA línea de 44 px; a partir de `md` se despliega en dos,
 * con el nombre del Gran Premio entero. Son 45 px que se le devuelven a la
 * torre donde hacen falta, y salen gratis: la flecha, «Vuelta 53/53», el reloj
 * y la píldora caben de sobra en una fila de 390.
 *
 * Las dos formas salen de la misma rejilla a propósito. Pintar dos cabeceras y
 * esconder una con `md:hidden` es lo que hice primero, y dejaba en la página
 * dos relojes con la misma etiqueta, dos `role="status"` y dos `<h1>`: quien
 * escucha la página lo oía todo dos veces. Una prueba lo cazó al chocar con
 * dos elementos donde esperaba uno.
 *
 * Lo que no se pierde al compactar es la salida: el enlace de volver sigue
 * ahí, reducido a su flecha pero con el nombre completo para quien lo escucha,
 * y con sus 44 px de zona tocable intactos.
 */
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
    <div
      className={cn(
        'grid h-11 grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-2 border-b border-[var(--replay-borde)] pr-3',
        'md:h-auto md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-x-4 md:gap-y-1.5 md:px-4 md:py-3'
      )}
    >
      <VolverAtras
        href={`/results/${year}/${round}`}
        aria-label={`Volver a ${nombre} ${year}`}
        className={cn(
          'grid h-11 w-11 shrink-0 place-items-center text-[var(--replay-apagado)] hover:text-[var(--replay-texto)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--replay-acento)]',
          'md:col-start-1 md:row-start-1 md:inline-flex md:h-auto md:min-h-[32px] md:w-auto md:items-center md:gap-1.5 md:justify-self-start md:text-xs'
        )}
      >
        <ArrowLeft className="h-5 w-5 md:h-3.5 md:w-3.5" aria-hidden />
        <span className="hidden md:inline">
          {nombre} {year}
        </span>
      </VolverAtras>

      <h1 className="min-w-0 truncate font-display text-lg font-bold leading-none md:col-start-1 md:row-start-2 md:text-2xl">
        {vuelta !== undefined ? (
          <>
            Vuelta {vuelta}
            <span className="text-sm text-[var(--replay-apagado)]">/{totalVueltas}</span>
          </>
        ) : (
          titulo
        )}
      </h1>

      <span
        className="shrink-0 font-mono text-[13px] tabular-nums text-[var(--replay-apagado)] md:col-start-2 md:row-start-1 md:justify-self-end"
        aria-label="Minuto de carrera"
      >
        {reloj ?? '0:00'}
      </span>

      <span
        role="status"
        className={cn(
          'inline-block shrink-0 rounded px-2 py-1.5 font-display text-[10px] font-semibold uppercase tracking-[.1em]',
          'md:col-start-2 md:row-start-2 md:justify-self-end',
          PILDORA[estado]
        )}
      >
        {nombreDeEstado(estado)}
      </span>
    </div>
  );
}

function Aviso({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div role="status" className="mx-auto max-w-md px-6 py-16 text-center">
      <h2 className="mb-2 font-display text-lg font-semibold">{titulo}</h2>
      <p className="text-sm text-[var(--replay-apagado)]">{children}</p>
    </div>
  );
}

/**
 * El color con el que se pinta un equipo, según el fondo que va a tener detrás.
 *
 * Sobre carbón vale la identidad tal cual, que es como se ha visto siempre.
 * Sobre el fondo claro no: el turquesa de Mercedes desaparece a 1,4:1 y el
 * amarillo de Renault a 1,15. Para eso `team-colors.ts` deriva `onLight`,
 * oscureciendo la identidad hasta despegarla del blanco sin perder el tono.
 */
function colorDeEquipo(equipo: string | null, respaldo: string | null, claro: boolean): string {
  const id = teamIdFromName(equipo);
  if (id) return claro ? teamColor(id).onLight : teamColor(id).color;
  return respaldo ?? (claro ? '#55555E' : '#8A8A94');
}

function Replay({
  datos,
  year,
  round,
  nombre,
  titulo,
  tema,
}: {
  datos: DatosDelReplay;
  year: number;
  round: number;
  nombre: string;
  titulo: string;
  tema: TemaDelReplay | null;
}) {
  const { meta, bloque, trazado, progreso } = datos;
  const { count, step: paso } = meta.timeline;
  const reloj = useRelojDeReplay(count, paso, 0);
  const [elegido, setElegido] = useState<number | null>(null);

  const k = reloj.kEntero;
  const t = k * paso;
  const estado = estadoEn(meta.trackStatus, t);

  const claro = tema?.claro ?? false;
  const colores = useMemo(
    () => meta.drivers.map((d) => colorDeEquipo(d.team, d.color, claro)),
    [meta.drivers, claro]
  );

  // Con bandera roja la carrera está detenida.
  const parada = estado === 'roja';

  /**
   * El reloj que se detiene con la carrera, para que los huecos no se traguen
   * una bandera roja. Se calcula una vez: recorre la línea de tiempo entera.
   */
  const relojCarrera = useMemo(
    () => relojDeCarrera(meta.trackStatus, count, paso, progreso),
    [meta.trackStatus, count, paso, progreso]
  );

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
        idx === 0
          ? 'líder'
          : fuera[i]
            ? ''
            : parada
              ? '—'
              : `+${huecoEn(progreso, k, lider, i, paso, relojCarrera).toFixed(1)}s`,
      fuera: fuera[i],
    }));

    const coches = meta.drivers.map((d, i) => ({ color: colores[i], codigo: d.code, fuera: fuera[i] }));
    return { filas, coches, lider };
  }, [progreso, k, meta.drivers, colores, paso, parada, relojCarrera]);

  /**
   * El riel se reparte sobre `(count - 1) × paso`, no sobre `count × paso`.
   *
   * Es la escala del pulgar: el `max` del `input` es `count - 1`, así que el
   * extremo derecho del riel es ese instante y no uno más. Con la duración
   * inflada en un paso, las banderas y las marcas de vuelta caían un pelo a la
   * izquierda de donde el pulgar las leía. La diferencia es despreciable en una
   * carrera entera —un instante entre miles— pero es una contradicción, y desde
   * que el total se enseña escrito al lado, una que se puede ver.
   */
  const duracionDelRiel = Math.max(0, (count - 1) * paso);

  const tramos = useMemo(
    () => tramosDelScrubber(meta.trackStatus, duracionDelRiel),
    [meta.trackStatus, duracionDelRiel]
  );

  // Las marcas de vuelta del scrubber: los cruces de meta de quien más dio,
  // cada diez vueltas. Con las 72 de una carrera el scrubber era un peine.
  const marcasDeVuelta = useMemo(() => {
    const duracion = duracionDelRiel;
    const ganador = meta.drivers.reduce((mejor, d) => (d.laps.length > mejor.laps.length ? d : mejor), meta.drivers[0]);
    return ganador.laps
      .filter((c, i) => (i + 1) % 10 === 0 && c > 0 && c < duracion)
      .map((c) => (c / duracion) * 100);
  }, [meta.drivers, duracionDelRiel]);

  const vuelta = Math.min(meta.totalLaps, vueltaEn(progreso, lider, k, trazado.longitud));
  const elegir = (i: number) => setElegido((actual) => (actual === i ? null : i));

  const pegadoRef = useRef<HTMLDivElement>(null);
  const mandosRef = useRef<HTMLDivElement>(null);
  const recorteRef = useRef<HTMLDivElement>(null);
  const escalaRef = useRef<HTMLDivElement>(null);
  const torreRef = useRef<HTMLDivElement>(null);
  const tiradorRef = useRef<HTMLDivElement>(null);

  /**
   * Cuánto está encogido el mapa, entre 0,36 y 1.
   *
   * En una referencia y no en estado: el arrastre lo cambia sesenta veces por
   * segundo, y volver a renderizar esta pantalla —con su lienzo y sus veintidós
   * filas— en cada fotograma es exactamente el tirón que el encogido por
   * `transform` vino a evitar. Aquí solo se tocan dos estilos.
   */
  const escalaDelMapa = useRef(1);

  /**
   * Cuánto tapan los mandos flotantes por debajo de la torre.
   *
   * Ya no hace falta medir nada por arriba: la torre se desplaza dentro de su
   * propia caja, que empieza justo donde acaba el mapa. Por abajo sí, porque
   * los mandos flotan encima y la última fila tiene que poder subir por encima
   * de ellos.
   */
  const [tapaAbajo, setTapaAbajo] = useState(0);
  useEffect(() => {
    const medir = () => {
      const barra = document.documentElement.style.getPropertyValue('--barra-inferior');
      // El 88 es el valor de partida de `--barra-inferior` en `globals.css`
      // —68 de alto más 20 de aire—, y tiene que seguirlo: este respaldo solo
      // se usa en el primer `medir()`, antes de que la barra publique su
      // medida, y con un número viejo la última fila de la torre quedaba unos
      // píxeles por debajo de donde debía durante ese instante.
      const tapaBarra = Number.parseFloat(barra) || 88;
      setTapaAbajo(Math.round(tapaBarra + 8 + (mandosRef.current?.offsetHeight ?? 0)));
    };
    medir();
    const observador = new ResizeObserver(medir);
    if (mandosRef.current) observador.observe(mandosRef.current);
    window.addEventListener('resize', medir);
    return () => {
      observador.disconnect();
      window.removeEventListener('resize', medir);
    };
  }, []);

  /**
   * El mapa se encoge con SU PROPIO tirador, y nunca desaparece.
   *
   * Que no desaparezca fue la decisión original del usuario sobre mockup: con
   * el circuito siempre entero solo se veían cuatro filas de veinte, y
   * apartarlo del todo habría quitado de la vista lo que más le gusta.
   *
   * ## Por qué ya no lo mueve el desplazamiento de la torre
   *
   * Porque encoger el mapa y recorrer la lista eran **la misma acción**, y se
   * estorbaban. Medido en la app a 390 px: sin desplazar se veía desde P1 con
   * seis filas enteras; con el mapa al mínimo, desde **P6**. Cinco filas
   * perdidas, y no por casualidad — el encogido costaba 220 px de
   * desplazamiento y las filas miden 44. El usuario lo dijo así: «al reducir al
   * máximo el circuito pierdo a los cinco primeros clasificados».
   *
   * Eso no tenía arreglo dentro de aquel gesto: cualquier variante que lo
   * conservara solo repartía el daño. Se llevaron cuatro a mockup y el usuario
   * eligió el tirador, que además gana algo que antes no existía: **el tamaño
   * se queda**. Antes, volver arriba en la lista agrandaba el mapa aunque no
   * quisieras.
   *
   * Se hace con `transform` y no cambiando el alto del lienzo a propósito. El
   * lienzo se reserva por píxel físico: en un teléfono a 3× son cuatro megas de
   * mapa de bits, y reservarlo de nuevo sesenta veces por segundo mientras el
   * dedo arrastra es justo lo que hace que un desplazamiento vaya a tirones.
   * Escalando, el lienzo no se entera y el trabajo lo hace la tarjeta gráfica.
   * El precio es que hay que corregir la escala al tocar un coche, y eso lo
   * resuelve `MapaDeCarrera` midiendo su propia caja.
   */
  useEffect(() => {
    const tirador = tiradorRef.current;
    const recorte = recorteRef.current;
    const escala = escalaRef.current;
    if (!tirador || !recorte || !escala) return;

    /** A cuánto se queda el mapa del todo. */
    const MINIMO = 0.36;

    const pintar = () => {
      const alto = escala.offsetHeight;
      if (!alto) return;
      escala.style.transform = `scale(${escalaDelMapa.current})`;
      recorte.style.height = `${Math.round(alto * escalaDelMapa.current)}px`;
      tirador.setAttribute('aria-valuenow', String(Math.round(escalaDelMapa.current * 100)));
    };

    const poner = (k: number) => {
      escalaDelMapa.current = Math.min(1, Math.max(MINIMO, k));
      pintar();
    };

    let desdeY = 0;
    let desdeK = 1;

    const empezar = (evento: PointerEvent) => {
      desdeY = evento.clientY;
      desdeK = escalaDelMapa.current;
      // La captura es lo que hace que el arrastre siga funcionando cuando el
      // dedo se sale del tirador, que con 28 px de alto pasa constantemente.
      tirador.setPointerCapture(evento.pointerId);
      evento.preventDefault();
    };

    const mover = (evento: PointerEvent) => {
      if (!tirador.hasPointerCapture(evento.pointerId)) return;
      const alto = escala.offsetHeight || 1;
      poner(desdeK + (evento.clientY - desdeY) / alto);
      evento.preventDefault();
    };

    const soltar = (evento: PointerEvent) => {
      if (tirador.hasPointerCapture(evento.pointerId)) {
        tirador.releasePointerCapture(evento.pointerId);
      }
    };

    /**
     * Con el teclado también, que es lo que lo convierte en un control de
     * verdad y no en un gesto que solo existe para quien puede arrastrar.
     * Es el patrón de separador de la especificación de ARIA.
     */
    const tecla = (evento: KeyboardEvent) => {
      const salto = 0.08;
      if (evento.key === 'ArrowUp') poner(escalaDelMapa.current - salto);
      else if (evento.key === 'ArrowDown') poner(escalaDelMapa.current + salto);
      else if (evento.key === 'Home') poner(MINIMO);
      else if (evento.key === 'End') poner(1);
      else return;
      evento.preventDefault();
    };

    pintar();
    tirador.addEventListener('pointerdown', empezar);
    tirador.addEventListener('pointermove', mover);
    tirador.addEventListener('pointerup', soltar);
    tirador.addEventListener('pointercancel', soltar);
    tirador.addEventListener('keydown', tecla);
    const observador = new ResizeObserver(pintar);
    observador.observe(escala);

    return () => {
      tirador.removeEventListener('pointerdown', empezar);
      tirador.removeEventListener('pointermove', mover);
      tirador.removeEventListener('pointerup', soltar);
      tirador.removeEventListener('pointercancel', soltar);
      tirador.removeEventListener('keydown', tecla);
      observador.disconnect();
    };
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
      vuelta={vuelta}
      totalVueltas={meta.totalLaps}
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
      paleta={tema?.paleta ?? null}
      elegido={elegido}
      onElegir={elegir}
      suscribir={reloj.suscribir}
      kRef={reloj.kRef}
      alto={alto}
      ariaLabel={`Mapa de la carrera con ${meta.drivers.length} coches sobre el circuito. Toca un coche para seguirlo; la clasificación está en la lista.`}
    />
  );

  return (
    // Dos mundos, un solo árbol.
    //
    // Móvil: una columna de alto fijo. Cabecera y mapa arriba, la torre
    // desplazándose en SU PROPIA caja, y los mandos flotando encima. Que la
    // torre tenga su caja es lo que permite encoger el mapa sin pelearse con
    // la página: cambiar el alto de algo que la página desplaza mueve el
    // desplazamiento, que vuelve a cambiar el alto, y así.
    //
    // Escritorio: tres filas y dos columnas — cabecera a lo ancho; mapa y
    // mandos a la izquierda; la torre entera a la derecha, desplazable.
    <div className="flex h-[calc(100dvh-4rem-env(safe-area-inset-top))] flex-col md:grid md:h-[calc(100dvh-4rem)] md:grid-cols-[1fr_340px] md:grid-rows-[auto_1fr_auto]">
      <div
        ref={pegadoRef}
        className="shrink-0 bg-[var(--replay-fondo)] md:col-span-2"
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

        {/* El recorte manda el alto; lo de dentro se escala. Así el lienzo
            nunca cambia de tamaño y el encogido no cuesta nada. */}
        <div
          ref={recorteRef}
          className="overflow-hidden border-b border-[var(--replay-borde)] md:hidden"
        >
          <div ref={escalaRef} className="origin-top will-change-transform">
            {mapa('proporcion')}
          </div>
        </div>

        {/* El tirador va en su propia franja, entre el mapa y la torre, y no
            encima del mapa: superpuesto se comería los toques de los coches
            que pasan por abajo, que es justo donde se agolpan en la recta. */}
        <div
          ref={tiradorRef}
          role="separator"
          aria-orientation="horizontal"
          aria-label="Tamaño del circuito"
          aria-valuemin={36}
          aria-valuemax={100}
          aria-valuenow={100}
          tabIndex={0}
          className="grid h-7 touch-none cursor-ns-resize place-items-center border-b border-[var(--replay-borde)] bg-[var(--replay-fondo)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--replay-acento)] md:hidden"
        >
          <span aria-hidden className="h-1 w-11 rounded-full bg-[var(--replay-trazado)]" />
        </div>
      </div>

      <div className="hidden min-h-0 md:col-start-1 md:row-start-2 md:block">{mapa('relleno')}</div>
      <div className="hidden border-t border-[var(--replay-borde)] md:col-start-1 md:row-start-3 md:block">{controles(true)}</div>

      <div
        ref={torreRef}
        className="min-h-0 flex-1 overflow-y-auto md:col-start-2 md:row-span-2 md:row-start-2 md:border-l md:border-[var(--replay-borde)]"
      >
        <TorreDeTiempos
          filas={filas}
          elegido={elegido}
          onElegir={elegir}
          className="md:py-1.5"
          tapadoAbajo={tapaAbajo}
        />
        {/* Aire para que la última fila pueda subir por encima de los mandos. */}
        <div aria-hidden className="md:hidden" style={{ height: tapaAbajo }} />
      </div>

      {/* Los mandos, como el mini-reproductor de Apple Music: cuando hay dos
          barras no se apilan como dos bloques pegados al borde, sino como dos
          piezas de la misma pila flotante — mismos márgenes que la barra de
          pestañas, mismo cristal, un hueco corto entre ellas.

          Los 26 px de los lados no son de aquí: los eligió el usuario para la
          barra de pestañas y estos los copian, porque las dos se leen como una
          sola pila y un desfase de dieciséis píxeles entre ellas se ve. Hay una
          prueba que lo fija, y es la que cazó el desajuste al cambiarlo. */}
      <div
        ref={mandosRef}
        className="fixed inset-x-[26px] z-40 rounded-[21px] border border-[var(--barra-borde)] bg-[var(--barra-cristal)] shadow-[0_10px_34px_rgba(0,0,0,0.45)] backdrop-blur-[2px] backdrop-saturate-[1.8] md:hidden"
        style={{ bottom: 'calc(var(--barra-inferior) + 8px)' }}
      >
        {controles(false)}
      </div>
    </div>
  );
}
