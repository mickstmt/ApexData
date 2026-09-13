'use client';

import { useEffect, useState } from 'react';

import {
  anchoDelReloj,
  formatoReloj,
  saltoDe,
  saltoReal,
  textoDelSalto,
  type Velocidad,
} from '@/lib/replay/reloj';
import { degradadoDelScrubber, type TramoDelScrubber } from '@/lib/replay/estados';
import { TINTA_CSS } from './tema';

/**
 * Los mandos del replay: el scrubber con las banderas pintadas, diez segundos
 * atrás y adelante, reproducir, y la velocidad.
 *
 * Todo mide 44 px o más: en el móvil van al alcance del pulgar, sobre la barra
 * de pestañas. El botón de reproducir es el grande y el lima porque es el
 * único que hace falta para empezar.
 *
 * El scrubber es un `<input type="range">` de verdad: se arrastra con el dedo,
 * se mueve con las flechas y anuncia el minuto de carrera. Las banderas van
 * pintadas en su pista, en el mismo color que la píldora y el mapa.
 *
 * El degradado se arma con `var(...)` y no con colores ya resueltos: así sigue
 * el tema sin que JavaScript tenga que leer nada, y el servidor puede pintar
 * la misma cadena que el navegador.
 *
 * ## Lo que dicen ahora, y por qué
 *
 * Revisando el GP de Italia en el iPhone salieron dos huecos que son la misma
 * queja vista desde dos sitios: **los mandos no decían nada de sí mismos**.
 *
 * - Los botones de salto no decían cuánto mueven (punto 9).
 * - La barra de progreso no decía en qué minuto estabas, ni a dónde ibas
 *   mientras arrastrabas (punto 10a).
 *
 * Los dos se resolvieron sobre mockup con **dos piezas cada uno**, porque cada
 * hueco son en realidad dos preguntas distintas y una sola pieza solo contesta
 * una:
 *
 * | Pregunta | Cuándo | Quién la contesta |
 * |---|---|---|
 * | ¿Cuánto mueve? | antes de pulsar | el «10 s» fijo del botón |
 * | ¿Se movió, y cuánto? | después | el destello |
 * | ¿Dónde estoy? | siempre | el reloj fijo sobre el scrubber |
 * | ¿A dónde voy? | al arrastrar | la burbuja sobre el pulgar |
 *
 * El reloj ya estaba en la cabecera, pero en el móvil la cabecera está arriba
 * y los mandos flotan abajo: medio teléfono de distancia entre lo que se toca
 * y lo que informa. Por eso se repite aquí y no se mueve de allí. En
 * escritorio, en cambio, el reloj que había **al final de esta misma fila** sí
 * se quitó: a cuarenta píxeles del nuevo era decir la hora dos veces en la
 * misma caja, y el hueco que ocupaba es lo que impedía centrar los botones.
 *
 * ## Por qué la vuelta NO está en la fila de tiempos
 *
 * Estuvo, y duró una captura. La cabecera del replay ya lleva la vuelta como
 * **titular grande** —«Vuelta 33/52»—, así que repetirla abajo ponía lo mismo
 * dos veces en la misma pantalla, no en dos momentos distintos. El mockup
 * sobre el que se decidió no lo enseñaba: ponía el nombre del Gran Premio en
 * la cabecera en vez de la vuelta, y ese fue un fallo de fidelidad.
 *
 * Se queda donde sí aporta: en la **burbuja** al arrastrar. Ahí la pregunta no
 * es «en qué vuelta voy» —eso ya está arriba— sino «a qué vuelta estoy yendo»,
 * y la cabecera no puede contestarla porque todavía no se ha soltado el dedo.
 * La fila fija se queda con el par que nadie más da: dónde estoy en el tiempo
 * y cuánto dura esto.
 */
export function ControlesDeReplay({
  k,
  count,
  paso,
  reproduciendo,
  velocidad,
  tramos,
  vueltas,
  vuelta,
  totalVueltas,
  onAlternar,
  onVelocidad,
  onBuscar,
  conReloj = false,
  forma = 'completa',
}: {
  k: number;
  count: number;
  paso: number;
  reproduciendo: boolean;
  velocidad: Velocidad;
  tramos: TramoDelScrubber[];
  /** Los cruces de meta del líder, en porcentaje: las marcas de vuelta. */
  vueltas: number[];
  /** La vuelta en curso. Sin ella, la fila de tiempos solo dice la hora. */
  vuelta?: number;
  totalVueltas?: number;
  onAlternar: () => void;
  onVelocidad: () => void;
  onBuscar: (k: number) => void;
  /** En escritorio los mandos se centran; en el móvil ocupan el ancho. */
  conReloj?: boolean;
  /**
   * Cuánto de los mandos se enseña.
   *
   * `minima` es el vertical del teléfono: **solo los cuatro botones**, sin
   * barra de progreso ni reloj. Lo decidió el usuario porque el cuadro ocupaba
   * demasiada pantalla, y la barra no se pierde: se muda a la pantalla
   * completa, donde va «tal cual la tenemos ahora».
   *
   * El reloj y la vuelta salen también, y eso no quita ningún dato: la cabecera
   * del replay ya lleva «Vuelta 33/53» y la hora.
   *
   * `rail` y `barra` son las dos mitades de la pantalla completa en horizontal,
   * y van en celdas distintas de la rejilla: los botones en una columna a la
   * izquierda, la barra sola abajo. Ese reparto lo propuso el usuario y salió
   * mejor que el que yo recomendaba — medido sobre maqueta, con un circuito
   * cuadrado tipo Hungaroring el trazado se dibuja un 44 % más grande, y los
   * botones suben de 40 a 44 px, que es el mínimo que el proyecto no negocia.
   */
  forma?: 'minima' | 'completa' | 'rail' | 'barra';
}) {
  const segundos = k * paso;
  const salto = saltoDe(10, paso);

  /**
   * El final del scrubber, no `count * paso`.
   *
   * El `max` del `input` es `count - 1`, así que arrastrando hasta el tope se
   * llega a `(count - 1) * paso`. Poner aquí `count * paso` dejaría un total
   * que nunca se alcanza, y el reloj de la izquierda jamás igualaría al de la
   * derecha: parecería que al replay le falta un trozo.
   */
  const duracion = Math.max(0, (count - 1) * paso);

  /**
   * El hueco del reloj se reserva para el formato más largo de esta carrera.
   *
   * Sin esto, al cruzar la hora el reloj pasa de `59:59` a `1:00:00` —de cinco
   * caracteres a siete— y su caja crece a mitad de carrera. En una fila
   * repartida con `justify-between` eso mueve lo que hay enfrente, y el número
   * que más se mira daría un respingo una vez por carrera sin motivo visible.
   * La fuente del replay es monoespaciada, así que `ch` es exacto.
   */
  const huecoDelReloj = `${anchoDelReloj(duracion)}ch`;

  /**
   * El dedo y el foco se llevan por separado, y no en un solo interruptor.
   *
   * Con uno solo, tocar el scrubber y soltar dejaba `arrastrando` en falso con
   * el `input` **todavía enfocado**: a partir de ahí las flechas del teclado ya
   * no sacaban la burbuja, que es justo el caso para el que se añadió el
   * `focus`. Y al revés, soltar el ratón fuera del control la dejaba clavada.
   */
  const [punteroAbajo, setPunteroAbajo] = useState(false);
  const [conFoco, setConFoco] = useState(false);
  const arrastrando = punteroAbajo || conFoco;

  /**
   * El destello del salto, con su número de pase.
   *
   * El contador no es decorativo: dos pulsaciones seguidas dan el mismo texto,
   * y sin algo que cambie React no vuelve a montar nada, la animación no se
   * reinicia y la segunda pulsación no se ve.
   */
  const [destello, setDestello] = useState<{ texto: string; pase: number } | null>(null);

  useEffect(() => {
    if (!destello) return;
    const temporizador = setTimeout(() => setDestello(null), 900);
    return () => clearTimeout(temporizador);
  }, [destello]);

  const saltar = (signo: 1 | -1) => {
    const movido = saltoReal(k, signo * salto, count, paso);
    onBuscar(k + signo * salto);
    if (movido === 0) return;
    setDestello((antes) => ({ texto: textoDelSalto(movido), pase: (antes?.pase ?? 0) + 1 }));
  };

  /**
   * En los topes el botón se apaga con `aria-disabled`, no con `disabled`.
   *
   * Un botón que se deshabilita **como consecuencia de haberlo pulsado** tira
   * el foco al cuerpo del documento, así que quien llega al final con el
   * teclado pierde el sitio y el siguiente tabulador vuelve a empezar por
   * arriba. Con `aria-disabled` se anuncia igual, el foco se queda donde
   * estaba, y el manejador no hace nada.
   */
  const sinAtras = saltoReal(k, -salto, count, paso) === 0;
  const sinAdelante = saltoReal(k, salto, count, paso) === 0;

  // El pulgar mide 22 px y no llega a los bordes del riel, así que la burbuja
  // se coloca descontándolo: si no, en los extremos apunta a un lado del
  // cursor en vez de a él.
  const avance = count > 1 ? Math.min(1, Math.max(0, k / (count - 1))) : 0;

  /**
   * El botón de reproducir, en icono.
   *
   * Sin la palabra, porque el usuario la quitó: «sin necesidad de que diga
   * reproducir o pausa». Un triángulo y dos barras son de los pocos símbolos
   * que no hacen falta explicar en ningún idioma.
   *
   * Lo que la palabra sí hacía era dar nombre al botón, y eso ahora lo da
   * `aria-label`: sin él, quien va con lector de pantalla oiría «botón» y nada
   * más, que es la forma más silenciosa de romper algo.
   */
  const play = (
    <button
      type="button"
      onClick={onAlternar}
      aria-pressed={reproduciendo}
      aria-label={reproduciendo ? 'Pausa' : 'Reproducir'}
      className="grid h-12 place-items-center rounded-[10px] bg-[var(--replay-acento)] text-[var(--replay-acento-tinta)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--replay-texto)]"
    >
      {reproduciendo ? (
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden>
          <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden>
          <path d="M8 5l12 7-12 7z" />
        </svg>
      )}
    </button>
  );

  const atras = (
    <button
      type="button"
      onClick={() => !sinAtras && saltar(-1)}
      aria-disabled={sinAtras}
      aria-label="Retroceder 10 s"
      className={BOTON}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden><path d="M11 6 3 12l8 6zM20 6l-8 6 8 6z" /></svg>
      <span aria-hidden className="font-mono text-[8.5px] font-semibold leading-none text-[var(--replay-apagado)]">10 s</span>
    </button>
  );

  const adelante = (
    <button
      type="button"
      onClick={() => !sinAdelante && saltar(1)}
      aria-disabled={sinAdelante}
      aria-label="Avanzar 10 s"
      className={BOTON}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden><path d="M13 6l8 6-8 6zM4 6l8 6-8 6z" /></svg>
      <span aria-hidden className="font-mono text-[8.5px] font-semibold leading-none text-[var(--replay-apagado)]">10 s</span>
    </button>
  );

  const cambioDeVelocidad = (
    <button type="button" onClick={onVelocidad} aria-label={`Velocidad: ${velocidad} por uno`} className={BOTON}>
      {velocidad}×
    </button>
  );

  const filaDeTiempos = (
    <div
      data-tiempos
      className="flex items-baseline justify-between font-mono text-[12px] tabular-nums text-[var(--replay-apagado)]"
    >
      <span
        className="inline-block text-sm font-semibold text-[var(--replay-texto)]"
        style={{ minWidth: huecoDelReloj }}
      >
        {formatoReloj(segundos)}
      </span>
      <span>{formatoReloj(duracion)}</span>
    </div>
  );

  const pista = (
    <div className="relative flex h-11 items-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[18px] h-2 rounded"
        style={{ background: degradadoDelScrubber(tramos, 'var(--replay-superficie-2)', TINTA_CSS) }}
      />
      {vueltas.map((pct, i) => (
        <span
          key={i}
          aria-hidden
          className="pointer-events-none absolute top-[14px] h-4 w-px bg-[var(--replay-tenue)]"
          style={{ left: `${pct}%` }}
        />
      ))}
      <input
        type="range"
        min={0}
        max={count - 1}
        step={1}
        value={Math.floor(k)}
        aria-label="Minuto de la carrera"
        aria-valuetext={
          vuelta !== undefined && totalVueltas !== undefined
            ? `${formatoReloj(segundos)}, vuelta ${vuelta} de ${totalVueltas}`
            : formatoReloj(segundos)
        }
        onChange={(e) => onBuscar(Number(e.target.value))}
        onPointerDown={() => setPunteroAbajo(true)}
        onPointerUp={() => setPunteroAbajo(false)}
        onPointerCancel={() => setPunteroAbajo(false)}
        // Soltar fuera del control: un `range` captura el puntero, así que el
        // `pointerup` llega igual, pero si la captura se pierde antes hay que
        // enterarse o la burbuja se queda pegada hasta el siguiente clic.
        onLostPointerCapture={() => setPunteroAbajo(false)}
        // También con el teclado: quien mueve el scrubber con las flechas
        // necesita el mismo destino a la vista que quien lo arrastra.
        onFocus={() => setConFoco(true)}
        onBlur={() => setConFoco(false)}
        // `relative` no es decorativo: el riel y las marcas de vuelta son
        // `absolute` y el `input` era estático, así que pintaban ENCIMA del
        // pulgar —lo posicionado va por delante de lo que no lo está— y el
        // cursor salía partido por una franja. Se veía igual en los dos
        // temas; con el riel claro se nota más. Posicionarlo lo devuelve
        // delante sin tocar el orden del DOM ni inventar una capa.
        className="replay-scrubber relative h-11 w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--replay-acento)]"
      />

      {arrastrando && (
        <span
          aria-hidden
          data-burbuja
          className="pointer-events-none absolute bottom-[38px] z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[var(--replay-texto)] px-2 py-1 font-mono text-[12.5px] font-semibold tabular-nums text-[var(--replay-fondo)]"
          style={{ left: `calc(11px + ${avance} * (100% - 22px))` }}
        >
          {vuelta !== undefined ? `V${vuelta} · ` : ''}
          {formatoReloj(segundos)}
        </span>
      )}

      {/* Por encima de la fila del reloj, no sobre ella: a 58 px la píldora
          se le montaba encima y tapaba el número que el propio salto acaba
          de cambiar. Medido a 390 px antes de subirla. */}
      {destello && (
        <span
          key={destello.pase}
          aria-hidden
          data-destello
          className="replay-destello pointer-events-none absolute bottom-[80px] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--replay-texto)] px-3.5 py-1.5 font-mono text-sm font-bold tabular-nums text-[var(--replay-fondo)]"
        >
          {destello.texto}
        </span>
      )}
    </div>
  );

  if (forma === 'rail') {
    return (
      <div className="relative grid h-full content-center justify-items-center px-2">
        {/* El destello sale AL LADO y no encima: en la columna no hay sitio por
            arriba, y tapando un botón escondería justo el que se acaba de
            pulsar. */}
        {destello && (
          <span
            key={destello.pase}
            aria-hidden
            data-destello
            className="replay-destello pointer-events-none absolute left-full top-1/2 z-10 ml-2 -translate-y-1/2 whitespace-nowrap rounded-full bg-[var(--replay-texto)] px-3.5 py-1.5 font-mono text-sm font-bold tabular-nums text-[var(--replay-fondo)]"
          >
            {destello.texto}
          </span>
        )}
        <div data-botonera className="grid justify-items-center gap-2.5">
          {atras}
          {play}
          {adelante}
          {cambioDeVelocidad}
        </div>
      </div>
    );
  }

  if (forma === 'barra') {
    return (
      <div className="grid gap-1 px-4 pb-1.5 pt-1">
        {filaDeTiempos}
        {pista}
      </div>
    );
  }

  if (forma === 'minima') {
    return (
      <div className="px-4 pb-2.5 pt-2">
        <div className="relative">
          {/* El destello se queda: sin barra de progreso es la única señal de
              que el salto ocurrió, y de cuánto fue. */}
          {destello && (
            <span
              key={destello.pase}
              aria-hidden
              data-destello
              className="replay-destello pointer-events-none absolute bottom-[54px] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--replay-texto)] px-3.5 py-1.5 font-mono text-sm font-bold tabular-nums text-[var(--replay-fondo)]"
            >
              {destello.texto}
            </span>
          )}

          <div
            data-botonera
            className="grid grid-cols-[44px_56px_44px_56px] items-center justify-center gap-3"
          >
            {atras}
            {play}
            {adelante}
            {cambioDeVelocidad}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2 px-4 pb-2.5 pt-2">
      {filaDeTiempos}
      {pista}

      <div
        data-botonera
        className={`grid items-center gap-2.5 ${
          conReloj ? 'grid-cols-[44px_56px_44px_56px] justify-center' : 'grid-cols-[44px_1fr_44px_56px]'
        }`}
      >
        {atras}
        {play}
        {adelante}
        {cambioDeVelocidad}
      </div>
    </div>
  );
}

const BOTON =
  'grid h-11 place-items-center gap-px rounded-[10px] bg-[var(--replay-boton)] font-mono text-[13px] font-semibold text-[var(--replay-texto)] aria-disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--replay-acento)]';
