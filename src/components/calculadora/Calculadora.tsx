'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Delete, History, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { cambiarSigno, comoLiteral } from '@/lib/calculadora/edicion';
import { evaluar, type ModoAngular } from '@/lib/calculadora/evaluar';
import { formatear } from '@/lib/calculadora/formato';
import { cn } from '@/lib/utils';

import {
  ATAJOS,
  TECLAS_MEMORIA,
  TECLAS_NUMERICAS,
  teclasCientificas,
  type Accion,
  type Tecla,
} from './teclas';

/**
 * La calculadora científica, con el visor, el teclado y la cinta.
 *
 * ## Por qué lo escrito es una lista de piezas y no una cadena
 *
 * Porque el retroceso tiene que borrar una tecla, no una letra. Con una cadena
 * suelta, pulsar `⌫` detrás de `sin(` deja `sin`, que no significa nada y que
 * el analizador no sabe leer; el usuario tendría que pulsar cuatro veces para
 * deshacer una. Guardando lo que metió cada tecla —`'sin('`, `'7'`, `'÷'`— una
 * pulsación deshace una pulsación, que es lo que hace una calculadora física.
 * La expresión para el motor es el `join('')` de esa lista, y el visor enseña
 * lo mismo.
 *
 * ## Por qué el resultado se calcula mientras se escribe
 *
 * Porque se puede: el motor es síncrono y no toca la red, así que enseñar el
 * resultado antes de pulsar `=` no cuesta nada y cambia mucho —se ve el error
 * de paréntesis en el momento en que se comete, no treinta teclas después—.
 * Mientras la expresión está a medias, la vista previa no enseña un error:
 * `2+` no es un fallo, es una frase sin terminar, y marcarla en rojo sería
 * regañar a alguien por estar escribiendo.
 */

/** Lo que se guarda de cada cálculo terminado. */
interface Entrada {
  id: number;
  expresion: string;
  valor: number;
}

/** Cuántos cálculos recuerda la cinta. Más no caben en una pantalla de móvil. */
const CINTA = 12;

/**
 * Las teclas que, pulsadas justo después de `=`, siguen trabajando sobre el
 * resultado en vez de empezar de cero.
 *
 * Es la convención de toda calculadora: `=` y luego `+` significa «y a esto,
 * súmale», mientras que `=` y luego `7` significa «olvídalo, empiezo otra
 * cuenta». Sin esto habría que pulsar `Ans` a mano cada vez.
 */
const SIGUEN_DEL_RESULTADO = new Set(['+', '−', '×', '÷', '^', 'ʸ√', ' mod ', '%', '!', '²', '³', '⁻¹']);

/** El golpecito del móvil al pulsar. Donde no exista, no pasa nada. */
function vibrar() {
  try {
    navigator.vibrate?.(8);
  } catch {
    // Safari lo tiene detrás de una bandera y algunos navegadores lanzan.
  }
}

export function Calculadora() {
  const [piezas, setPiezas] = useState<string[]>([]);
  const [modo, setModo] = useState<ModoAngular>('DEG');
  const [segunda, setSegunda] = useState(false);
  const [hiperbolico, setHiperbolico] = useState(false);
  const [memoria, setMemoria] = useState<number | null>(null);
  const [ans, setAns] = useState(0);
  const [cinta, setCinta] = useState<Entrada[]>([]);
  const [verCinta, setVerCinta] = useState(false);
  /** Lo que se enseña en grande cuando ya se ha pulsado `=`. */
  const [cerrado, setCerrado] = useState<{ expresion: string; texto: string; error: boolean } | null>(
    null
  );
  /** Cambia con cada `=` para que la animación del resultado se vuelva a lanzar. */
  const [golpe, setGolpe] = useState(0);

  const expresion = useMemo(() => piezas.join(''), [piezas]);
  const visor = useRef<HTMLDivElement>(null);

  /**
   * La vista previa.
   *
   * `rand` se deja fuera a propósito: con la vista previa activa se
   * reevaluaría en cada pulsación y el número bailaría en la pantalla antes de
   * que nadie haya pedido nada. Con `=` se calcula una vez y se queda quieto,
   * que es lo que se espera de un número al azar.
   */
  const previa = useMemo(() => {
    if (expresion === '' || expresion.includes('rand')) return null;
    const r = evaluar(expresion, { modo, ans });
    return r.ok ? formatear(r.valor) : null;
  }, [expresion, modo, ans]);

  /** Deja el visor pegado a la derecha, donde se está escribiendo. */
  useEffect(() => {
    const caja = visor.current;
    if (caja) caja.scrollLeft = caja.scrollWidth;
  }, [expresion]);

  const calcular = useCallback(() => {
    if (expresion === '') return;

    // Los paréntesis que falten se cierran solos, como en cualquier
    // calculadora: nadie cuenta paréntesis antes de pulsar `=`.
    const abiertos = (expresion.match(/\(/g)?.length ?? 0) - (expresion.match(/\)/g)?.length ?? 0);
    const completa = expresion + ')'.repeat(Math.max(0, abiertos));

    const r = evaluar(completa, { modo, ans });
    setGolpe((g) => g + 1);

    if (!r.ok) {
      setCerrado({ expresion: completa, texto: r.error || 'No se puede calcular eso', error: true });
      return;
    }

    setAns(r.valor);
    setCerrado({ expresion: completa, texto: formatear(r.valor), error: false });
    setCinta((previa) =>
      [{ id: Date.now(), expresion: completa, valor: r.valor }, ...previa].slice(0, CINTA)
    );
    setPiezas([]);
  }, [expresion, modo, ans]);

  const ejecutar = useCallback(
    (accion: Accion) => {
      vibrar();

      if (accion.tipo === 'limpiar') {
        setPiezas([]);
        setCerrado(null);
        return;
      }

      if (accion.tipo === 'borrar') {
        if (cerrado) {
          setCerrado(null);
          return;
        }
        setPiezas((p) => p.slice(0, -1));
        return;
      }

      if (accion.tipo === 'igual') {
        calcular();
        return;
      }

      if (accion.tipo === 'signo') {
        setCerrado(null);
        setPiezas((p) => cambiarSigno(cerrado && !cerrado.error ? ['Ans'] : p));
        return;
      }

      if (accion.tipo === 'memoria') {
        const actual = cerrado && !cerrado.error ? ans : evaluarActual(expresion, modo, ans);

        if (accion.que === 'MC') setMemoria(null);
        else if (accion.que === 'MS') setMemoria(actual);
        else if (accion.que === 'M+') setMemoria((m) => (m ?? 0) + (actual ?? 0));
        else if (accion.que === 'M-') setMemoria((m) => (m ?? 0) - (actual ?? 0));
        else if (accion.que === 'MR' && memoria !== null) {
          const texto = comoLiteral(memoria);
          setPiezas((p) => (cerrado ? [texto] : [...p, texto]));
          setCerrado(null);
        }
        return;
      }

      // Insertar. Si viene justo después de un `=`, o se sigue trabajando
      // sobre el resultado o se empieza de cero.
      const { texto } = accion;
      setPiezas((p) => {
        if (cerrado) {
          if (cerrado.error) return [texto];
          return SIGUEN_DEL_RESULTADO.has(texto) ? ['Ans', texto] : [texto];
        }
        return [...p, texto];
      });
      setCerrado(null);

      // Los modificadores son de un solo uso, como en una calculadora física:
      // se pulsa `2nd`, se pulsa la función y `2nd` se apaga solo.
      if (segunda) setSegunda(false);
    },
    [calcular, cerrado, ans, expresion, modo, memoria, segunda]
  );

  /**
   * El teclado físico. Sin él, esto sería una calculadora a medias.
   *
   * Escucha en `window` y no en un contenedor porque la calculadora no tiene
   * foco propio: se entra en la pantalla y se teclea, sin pinchar en nada. Eso
   * obliga a devolver dos veces las teclas que no son suyas.
   *
   * **A quien esté escribiendo.** La cabecera de la app lleva un panel de
   * ajustes con un campo de correo, y esta pantalla lo hereda del armazón. Sin
   * esta guarda, escribir ahí un `7` no lo escribía en el campo: se lo quedaba
   * la calculadora, y `Esc` cerraba lo escrito en vez de el panel.
   *
   * **A quien navega con el tabulador.** `Enter` y `Espacio` sobre un botón
   * enfocado son la forma estándar de pulsarlo. Si aquí se interceptara
   * `Enter`, quien llegara a la tecla `7` con el tabulador y la pulsara
   * obtendría `=`. Con el foco en un botón, el navegador manda.
   *
   * ## Por qué el escuchador se pone UNA vez y lee la acción de una `ref`
   *
   * `ejecutar` cambia de identidad en cada pulsación —depende de lo escrito,
   * del modo y de la memoria—, así que con `[ejecutar]` en las dependencias
   * este efecto se desmontaba y se volvía a montar entre tecla y tecla. Eso es
   * quitar y poner un escuchador de `window` decenas de veces mientras alguien
   * teclea deprisa, y dejó una prueba inestable: en una tanda se perdió el `6`
   * de `7*6` y la pantalla dijo «Falta un número».
   *
   * Con la `ref` el escuchador se pone al montar y no se toca más, y aun así
   * siempre llama a la versión recién renderizada.
   */
  const ultimaAccion = useRef(ejecutar);
  // La asignación va en su propio efecto y no en el render: escribir una `ref`
  // mientras se renderiza es un efecto secundario, y React lo prohíbe porque
  // con el modo concurrente un render puede descartarse a medias.
  useEffect(() => {
    ultimaAccion.current = ejecutar;
  }, [ejecutar]);

  useEffect(() => {
    function alPulsar(evento: KeyboardEvent) {
      if (evento.ctrlKey || evento.metaKey || evento.altKey) return;

      const donde = evento.target as HTMLElement | null;
      if (donde?.isContentEditable) return;
      const etiqueta = donde?.tagName;
      if (etiqueta === 'INPUT' || etiqueta === 'TEXTAREA' || etiqueta === 'SELECT') return;

      // `Enter` y `Espacio` pertenecen al botón que tenga el foco.
      if (etiqueta === 'BUTTON' && (evento.key === 'Enter' || evento.key === ' ')) return;

      const accion = ATAJOS[evento.key] ?? ATAJOS[evento.key.toLowerCase()];
      if (!accion) return;

      evento.preventDefault();
      ultimaAccion.current(accion);
    }

    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, []);

  const cientificas = useMemo(() => teclasCientificas(segunda, hiperbolico), [segunda, hiperbolico]);

  const resultadoGrande = cerrado
    ? cerrado.texto
    : previa !== null && expresion !== ''
      ? previa
      : expresion === ''
        ? '0'
        : '';

  return (
    <div data-calculadora className="mx-auto w-full max-w-[520px] lg:max-w-[920px]">
      <div className="overflow-hidden rounded-[26px] border border-[var(--calc-borde)] bg-[var(--calc-chasis)] shadow-[var(--calc-sombra)]">
        {/* La librea, arriba del todo: azul marino, azul de equipo, rojo y
            amarillo. Es decoración pura —no codifica nada— así que va con
            colores fijos y no con tokens de tema. */}
        <div
          aria-hidden
          className="h-[5px] w-full"
          style={{
            background:
              'linear-gradient(90deg, #121F45 0%, #3671C6 38%, #D51920 72%, #FFC906 100%)',
          }}
        />

        <div className="p-3 sm:p-4">
          <Cabecera />

          <Visor
            ref={visor}
            expresion={cerrado ? cerrado.expresion : expresion}
            resultado={resultadoGrande}
            error={cerrado?.error ?? false}
            cerrado={cerrado !== null}
            golpe={golpe}
          />

          <BarraDeModos
            modo={modo}
            alCambiarModo={setModo}
            segunda={segunda}
            alternarSegunda={() => setSegunda((v) => !v)}
            hiperbolico={hiperbolico}
            alternarHiperbolico={() => setHiperbolico((v) => !v)}
            memoria={memoria}
            verCinta={verCinta}
            alternarCinta={() => setVerCinta((v) => !v)}
          />

          <AnimatePresence initial={false}>
            {verCinta && (
              <motion.div
                key="cinta"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                className="overflow-hidden"
              >
                <Cinta
                  entradas={cinta}
                  alElegir={(valor) => {
                    setPiezas((p) => (cerrado ? [comoLiteral(valor)] : [...p, comoLiteral(valor)]));
                    setCerrado(null);
                    setVerCinta(false);
                  }}
                  alVaciar={() => setCinta([])}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* El teclado. En pantalla ancha los dos bloques van uno al lado del
              otro, como en una calculadora de sobremesa; en el móvil, el
              científico arriba y el numérico debajo, que es donde cae el
              pulgar. */}
          <div className="mt-2 grid gap-2 lg:grid-cols-[1fr_300px]">
            <div className="flex flex-col gap-1.5">
              <div className="grid grid-cols-5 gap-1.5">
                {cientificas.map((tecla) => (
                  <Boton key={tecla.id} tecla={tecla} alPulsar={ejecutar} />
                ))}
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {TECLAS_MEMORIA.map((tecla) => (
                  <Boton
                    key={tecla.id}
                    tecla={tecla}
                    alPulsar={ejecutar}
                    apagada={tecla.id === 'mr' && memoria === null}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {TECLAS_NUMERICAS.map((tecla) => (
                <Boton key={tecla.id} tecla={tecla} alPulsar={ejecutar} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <PieDeAyuda />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Piezas
// ---------------------------------------------------------------------------

function Cabecera() {
  return (
    <div className="mb-2.5 flex items-center justify-between px-1">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--calc-tinta-suave)]">
          Científica
        </span>
      </div>

      {/* El guiño: el dorsal y el apellido, con la tipografía de un panel de
          cronometraje. Sin escudos ni logotipos —ApexData no es oficial, y eso
          se dice en `/acerca`— solo el número y el nombre. */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--calc-tinta-suave)]">
          Verstappen
        </span>
        <span
          className="flex h-6 w-6 items-center justify-center rounded-md text-[13px] font-black leading-none"
          style={{ background: '#FFC906', color: '#121F45' }}
        >
          1
        </span>
      </div>
    </div>
  );
}

const Visor = ({
  ref,
  expresion,
  resultado,
  error,
  cerrado,
  golpe,
}: {
  ref: React.RefObject<HTMLDivElement | null>;
  expresion: string;
  resultado: string;
  error: boolean;
  cerrado: boolean;
  golpe: number;
}) => (
  <div className="relative overflow-hidden rounded-2xl border border-[var(--calc-borde)] bg-[var(--calc-panel)] px-4 pb-3 pt-3">
    {/* El «1» de fondo. Va al 5 % y detrás de todo: se intuye, no se lee, y
        por eso no le hace falta contraste. */}
    <span
      aria-hidden
      className="pointer-events-none absolute -left-2 -top-6 select-none text-[120px] font-black leading-none text-[var(--calc-azul)] opacity-[0.06]"
    >
      1
    </span>

    <div
      ref={ref}
      data-visor="expresion"
      className="relative min-h-[24px] overflow-x-auto whitespace-nowrap text-right font-mono text-sm text-[var(--calc-tinta-suave)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {expresion || ' '}
    </div>

    <div
      aria-live="polite"
      aria-atomic
      className="relative mt-0.5 overflow-x-auto whitespace-nowrap text-right [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <span
        key={golpe}
        data-visor="resultado"
        className={cn(
          'inline-block font-mono tabular-nums',
          cerrado && 'calc-resultado-nuevo',
          error
            ? 'text-lg font-semibold text-[var(--calc-rojo)]'
            : cerrado
              ? 'text-[34px] font-bold leading-tight text-[var(--calc-azul)] sm:text-[40px]'
              : 'text-[28px] font-semibold leading-tight text-[var(--calc-tinta)] opacity-70 sm:text-[32px]'
        )}
      >
        {resultado || ' '}
      </span>
    </div>
  </div>
);

Visor.displayName = 'Visor';

const MODOS: ModoAngular[] = ['DEG', 'RAD', 'GRAD'];

function BarraDeModos({
  modo,
  alCambiarModo,
  segunda,
  alternarSegunda,
  hiperbolico,
  alternarHiperbolico,
  memoria,
  verCinta,
  alternarCinta,
}: {
  modo: ModoAngular;
  alCambiarModo: (m: ModoAngular) => void;
  segunda: boolean;
  alternarSegunda: () => void;
  hiperbolico: boolean;
  alternarHiperbolico: () => void;
  memoria: number | null;
  verCinta: boolean;
  alternarCinta: () => void;
}) {
  return (
    <div className="my-2 flex items-center gap-1.5">
      {/* El modo angular es un mando de tres posiciones, no un botón que cicla:
          con un botón hay que pulsarlo dos veces para ir de DEG a GRAD y no se
          ve cuáles son las otras opciones sin probar. */}
      <div
        role="radiogroup"
        aria-label="Unidad de los ángulos"
        className="flex overflow-hidden rounded-lg border border-[var(--calc-borde)]"
      >
        {MODOS.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={modo === m}
            onClick={() => alCambiarModo(m)}
            className={cn(
              'calc-tecla min-h-[32px] px-2.5 font-mono text-[11px] font-semibold tracking-wide',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--calc-azul)]',
              modo === m
                ? 'bg-[var(--calc-azul)] text-[var(--calc-igual-tinta)]'
                : 'bg-[var(--calc-tecla-fn)] text-[var(--calc-tinta-suave)]'
            )}
          >
            {m}
          </button>
        ))}
      </div>

      <Modificador etiqueta="2nd" puesto={segunda} alPulsar={alternarSegunda} titulo="segunda función" />
      <Modificador etiqueta="hyp" puesto={hiperbolico} alPulsar={alternarHiperbolico} titulo="hiperbólicas" />

      {memoria !== null && (
        <span
          className="rounded-lg border border-[var(--calc-borde)] px-2 py-1 font-mono text-[11px] font-semibold text-[var(--calc-amarillo-tinta)]"
          title={`En memoria: ${formatear(memoria)}`}
        >
          M
        </span>
      )}

      <button
        type="button"
        onClick={alternarCinta}
        aria-expanded={verCinta}
        title="Los cálculos anteriores"
        className={cn(
          'calc-tecla ml-auto flex min-h-[32px] items-center gap-1.5 rounded-lg border border-[var(--calc-borde)] px-2.5',
          'font-mono text-[11px] font-semibold',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--calc-azul)]',
          verCinta
            ? 'bg-[var(--calc-azul)] text-[var(--calc-igual-tinta)]'
            : 'bg-[var(--calc-tecla-fn)] text-[var(--calc-tinta-suave)]'
        )}
      >
        <History className="h-3.5 w-3.5" aria-hidden />
        Cinta
      </button>
    </div>
  );
}

function Modificador({
  etiqueta,
  puesto,
  alPulsar,
  titulo,
}: {
  etiqueta: string;
  puesto: boolean;
  alPulsar: () => void;
  titulo: string;
}) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      aria-pressed={puesto}
      title={titulo}
      className={cn(
        'calc-tecla min-h-[32px] rounded-lg border px-2.5 font-mono text-[11px] font-bold',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--calc-azul)]',
        puesto
          ? 'border-transparent text-[#121F45]'
          : 'border-[var(--calc-borde)] bg-[var(--calc-tecla-fn)] text-[var(--calc-tinta-suave)]'
      )}
      style={puesto ? { background: '#FFC906' } : undefined}
    >
      {etiqueta}
    </button>
  );
}

function Cinta({
  entradas,
  alElegir,
  alVaciar,
}: {
  entradas: Entrada[];
  alElegir: (valor: number) => void;
  alVaciar: () => void;
}) {
  if (entradas.length === 0) {
    return (
      <p className="mb-2 rounded-xl border border-dashed border-[var(--calc-borde)] px-3 py-4 text-center font-mono text-[11px] text-[var(--calc-tinta-suave)]">
        Aquí se van apuntando los cálculos. Toca uno para reutilizar su resultado.
      </p>
    );
  }

  return (
    <div className="mb-2 rounded-xl border border-[var(--calc-borde)] bg-[var(--calc-panel)] p-1.5">
      <ul className="max-h-[180px] list-none overflow-y-auto p-0">
        {entradas.map((entrada) => (
          <li key={entrada.id}>
            <button
              type="button"
              onClick={() => alElegir(entrada.valor)}
              className={cn(
                'flex min-h-[44px] w-full flex-col items-end gap-0.5 rounded-lg px-2.5 py-1.5 text-right',
                'hover:bg-[var(--calc-realce)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--calc-azul)]'
              )}
            >
              <span className="max-w-full truncate font-mono text-[11px] text-[var(--calc-tinta-suave)]">
                {entrada.expresion}
              </span>
              <span className="font-mono text-base font-semibold tabular-nums text-[var(--calc-azul)]">
                {formatear(entrada.valor)}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={alVaciar}
        className={cn(
          'mt-1 flex min-h-[36px] w-full items-center justify-center gap-1.5 rounded-lg',
          'font-mono text-[11px] text-[var(--calc-tinta-suave)]',
          'hover:bg-[var(--calc-realce)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--calc-azul)]'
        )}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
        Vaciar la cinta
      </button>
    </div>
  );
}

function Boton({
  tecla,
  alPulsar,
  apagada,
}: {
  tecla: Tecla;
  alPulsar: (accion: Accion) => void;
  apagada?: boolean;
}) {
  const { variante } = tecla;

  return (
    <button
      type="button"
      disabled={apagada}
      onClick={() => alPulsar(tecla.accion)}
      /**
       * El nombre accesible es la etiqueta que se ve, no una descripción.
       *
       * Antes iba un `aria-label` en todas —`aria-label="siete"` sobre una
       * tecla que pone `7`— y eso incumple WCAG 2.5.3: quien maneja el
       * ordenador con la voz dice lo que LEE, y «pulsa 7» no casaba con nada.
       * La descripción se mantiene, pero en `title`, que es una ayuda y no un
       * nombre, así que no sustituye a lo que está escrito.
       *
       * La única excepción es el retroceso, que va con icono y no tiene texto
       * visible: sin `aria-label` no tendría nombre ninguno.
       */
      aria-label={tecla.id === 'retroceso' ? tecla.titulo : undefined}
      title={tecla.titulo}
      className={cn(
        'calc-tecla flex min-h-[46px] items-center justify-center rounded-xl border border-transparent sm:min-h-[52px]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--calc-azul)]',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--calc-chasis)]',
        'disabled:opacity-40',
        tecla.ancha && 'col-span-2',

        variante === 'num' &&
          'bg-[var(--calc-tecla)] text-xl font-semibold text-[var(--calc-tinta)] shadow-[var(--calc-sombra)]',
        variante === 'op' &&
          'bg-[var(--calc-tecla)] text-xl font-bold text-[var(--calc-azul-tinta)] shadow-[var(--calc-sombra)]',
        variante === 'igual' && 'bg-[var(--calc-azul)] text-xl font-black text-[var(--calc-igual-tinta)]',
        // El fondo de tecla, no el de función, y no por gusto: medido en el
        // navegador, el rojo sobre `--calc-tecla-fn` se quedaba en 4,32:1 en el
        // tema claro. Sobre `--calc-tecla` llega a 4,77, que es el mismo valor
        // con el que `team-colors.ts` da por bueno ese rojo.
        variante === 'borrar' &&
          'bg-[var(--calc-tecla)] text-base font-bold text-[var(--calc-rojo)] shadow-[var(--calc-sombra)]',
        variante === 'fn' &&
          'bg-[var(--calc-tecla-fn)] px-0.5 text-[11px] font-semibold sm:text-[13px]',
        variante === 'fn' &&
          (tecla.alterada ? 'text-[var(--calc-amarillo-tinta)]' : 'text-[var(--calc-tinta)]'),
        variante === 'mem' &&
          'min-h-[38px] bg-transparent text-[11px] font-bold text-[var(--calc-tinta-suave)] sm:min-h-[40px] sm:text-[12px]',
        variante === 'mem' && 'border-[var(--calc-borde)]'
      )}
    >
      {/* El retroceso va con icono y no con el carácter `⌫`: la tipografía
          monoespaciada del proyecto no lo trae y el navegador lo sustituye por
          una caja tachada, que parece un fallo de fuente. */}
      {tecla.id === 'retroceso' ? <Delete className="h-5 w-5" aria-hidden /> : tecla.etiqueta}
    </button>
  );
}

function PieDeAyuda() {
  return (
    <p className="mt-3 px-2 text-center font-mono text-[11px] leading-relaxed text-muted-foreground">
      Se puede teclear: dígitos y operadores, <kbd>Enter</kbd> para calcular,{' '}
      <kbd>Retroceso</kbd> para borrar y <kbd>Esc</kbd> para empezar de nuevo. Las
      iniciales van a su función: <kbd>s</kbd> <kbd>c</kbd> <kbd>t</kbd> a la trigonometría,{' '}
      <kbd>l</kbd> al logaritmo neperiano, <kbd>g</kbd> al decimal, <kbd>r</kbd> a la raíz,{' '}
      <kbd>p</kbd> a π y <kbd>a</kbd> al último resultado.
    </p>
  );
}

// ---------------------------------------------------------------------------
// Utilidades de edición
// ---------------------------------------------------------------------------

/** Lo que vale ahora mismo lo escrito, para las teclas de memoria. */
function evaluarActual(expresion: string, modo: ModoAngular, ans: number): number {
  if (expresion === '') return 0;
  const r = evaluar(expresion, { modo, ans });
  return r.ok ? r.valor : 0;
}
