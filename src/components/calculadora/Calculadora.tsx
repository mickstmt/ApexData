'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeftRight, Delete, History, Trash2 } from 'lucide-react';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  cambiarSigno,
  comoLiteral,
  ponerFraccion,
  porQueNoCabeFraccion,
} from '@/lib/calculadora/edicion';
import { BARRA, evaluar, type Contexto, type ModoAngular } from '@/lib/calculadora/evaluar';
import {
  cabeComoFraccion,
  formatear,
  formatearEntero,
  fraccionALeer,
} from '@/lib/calculadora/formato';
import type { Racional } from '@/lib/calculadora/racional';
import { cn } from '@/lib/utils';

import { GuiaDeNovedades, useGuiaDeNovedades } from '@/components/novedades/GuiaDeNovedades';
import { ANCLAS_CALCULADORA } from '@/lib/novedades/registro';
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
  /** La fracción exacta, para que vuelva como fracción y no como su decimal. */
  exacto: Racional | null;
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
  const [ansExacto, setAnsExacto] = useState<Racional | null>(null);
  const [ansEnFraccion, setAnsEnFraccion] = useState(false);
  const [cinta, setCinta] = useState<Entrada[]>([]);
  const [verCinta, setVerCinta] = useState(false);
  /** Lo que se enseña en grande cuando ya se ha pulsado `=`. */
  const [cerrado, setCerrado] = useState<{
    expresion: string;
    texto: string;
    error: boolean;
    exacto: Racional | null;
  } | null>(null);
  /** Cómo se ve el resultado, si admite las dos formas. Lo cambia la tecla `d`. */
  const [vista, setVista] = useState<'fraccion' | 'decimal'>('decimal');
  /** Cambia con cada `=` para que la animación del resultado se vuelva a lanzar. */
  const [golpe, setGolpe] = useState(0);
  /** Cambia cada vez que la tecla de fracción no puede entrar, para sacudirla. */
  const [rechazo, setRechazo] = useState(0);
  const guia = useGuiaDeNovedades('calculadora');
  /** Lo que se le dice a un lector de pantalla y no tiene sitio en el visor. */
  const [anuncio, setAnuncio] = useState('');

  const expresion = useMemo(() => piezas.join(''), [piezas]);
  const visor = useRef<HTMLDivElement>(null);
  const caja = useRef<HTMLDivElement>(null);

  const contexto = useMemo<Contexto>(
    () => ({ modo, ans, ansExacto, ansEnFraccion }),
    [modo, ans, ansExacto, ansEnFraccion]
  );

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
    const r = evaluar(expresion, contexto);
    if (!r.ok) return null;
    return {
      texto: formatear(r.valor),
      fraccion: r.fraccion && cabeComoFraccion(r.exacto) ? r.exacto : null,
    };
  }, [expresion, contexto]);

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

    const r = evaluar(completa, contexto);
    setGolpe((g) => g + 1);

    if (!r.ok) {
      setCerrado({
        expresion: completa,
        texto: r.error || 'No se puede calcular eso',
        error: true,
        exacto: null,
      });
      return;
    }

    // Sale en fracción si se escribió con la tecla de fracción, y en decimal
    // si no: `1÷3` da 0.333… y `1⁄3` da ⅓. La tecla `d` pasa de una a otra.
    const enFraccion = r.fraccion && cabeComoFraccion(r.exacto);
    setAns(r.valor);
    setAnsExacto(r.exacto);
    setAnsEnFraccion(enFraccion);
    setVista(enFraccion ? 'fraccion' : 'decimal');
    setCerrado({ expresion: completa, texto: formatear(r.valor), error: false, exacto: r.exacto });
    setCinta((previa) =>
      [{ id: Date.now(), expresion: completa, valor: r.valor, exacto: r.exacto }, ...previa].slice(0, CINTA)
    );
    setPiezas([]);
  }, [expresion, contexto]);

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

      if (accion.tipo === 'vista') {
        if (!cerrado || cerrado.error || !cabeComoFraccion(cerrado.exacto)) return;
        // Después de la guarda: una `d` que no hace nada no es haberlo usado.
        guia.usado(ANCLAS_CALCULADORA.vista);
        const siguiente = vista === 'fraccion' ? 'decimal' : 'fraccion';
        setVista(siguiente);
        setAnsEnFraccion(siguiente === 'fraccion');
        setGolpe((g) => g + 1);
        return;
      }

      if (accion.tipo === 'fraccion') {
        guia.usado(ANCLAS_CALCULADORA.fraccion);
        // Tras un `=` no hay numerador: la cuenta nueva aún no ha empezado.
        const motivo = cerrado ? 'falta-numerador' : porQueNoCabeFraccion(piezas);
        if (motivo) {
          setRechazo((n) => n + 1);
          // El espacio duro del final alterna para que el texto cambie aunque
          // el motivo se repita: un lector de pantalla no vuelve a anunciar un
          // estado idéntico, y el segundo rechazo pasaría en silencio.
          setAnuncio(
            (motivo === 'ya-tiene-barra'
              ? 'Esa fracción ya tiene su barra.'
              : 'Escribe primero el número de arriba.') + (rechazo % 2 ? ' ' : '')
          );
          return;
        }
        // Como las demás teclas, sobre lo último escrito y no sobre lo que
        // había al crear esta función: si dos pulsaciones caen en el mismo
        // lote, la segunda no pisa a la primera.
        setPiezas((p) => ponerFraccion(p) ?? p);
        return;
      }

      if (accion.tipo === 'signo') {
        setCerrado(null);
        setPiezas((p) => cambiarSigno(cerrado && !cerrado.error ? ['Ans'] : p));
        return;
      }

      if (accion.tipo === 'memoria') {
        const actual = cerrado && !cerrado.error ? ans : evaluarActual(expresion, contexto);

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
    [calcular, guia, cerrado, ans, expresion, contexto, memoria, segunda, piezas, vista, rechazo]
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

      // `Esc` es «borrar todo», pero con la guía de novedades abierta lo
      // primero que se quiere cerrar es la guía. De eso se encarga ella: lo
      // recoge antes que este escuchador y no deja que llegue aquí.

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
      ? previa.texto
      : expresion === ''
        ? '0'
        : '';

  /** La fracción que se pinta apilada en lugar del decimal, si toca. */
  const fraccionGrande = cerrado
    ? !cerrado.error && vista === 'fraccion' && cabeComoFraccion(cerrado.exacto)
      ? cerrado.exacto
      : null
    : (previa?.fraccion ?? null);

  const convertible = !!cerrado && !cerrado.error && cabeComoFraccion(cerrado.exacto);

  return (
    <div ref={caja} data-calculadora className="relative mx-auto w-full max-w-[520px] lg:max-w-[920px]">
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
            fraccion={fraccionGrande}
            error={cerrado?.error ?? false}
            cerrado={cerrado !== null}
            golpe={golpe}
            convertible={convertible}
            destino={vista === 'fraccion' && convertible ? 'decimal' : 'fracción'}
            alCambiarVista={() => ejecutar({ tipo: 'vista' })}
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
                  alElegir={(entrada) => {
                    const texto = comoLiteral(entrada.valor, entrada.exacto);
                    setPiezas((p) => (cerrado ? [texto] : [...p, texto]));
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
                  <Boton
                    key={tecla.id}
                    tecla={tecla}
                    alPulsar={ejecutar}
                    rechazo={tecla.id === 'fraccion' ? rechazo : undefined}
                  />
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

      <GuiaDeNovedades
        guia={guia}
        contenedor={caja}
        adornos={{ 'calculadora-fracciones/tecla': <EjemploDeFraccion /> }}
      />

      <p role="status" className="sr-only">
        {anuncio}
      </p>
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

/**
 * Cuánto mide el resultado según lo largo que sea.
 *
 * Desde que el botón de fracción ⇄ decimal ocupa la izquierda de la línea, al
 * resultado le quedan 160 px en un Android de 360 —medido—. Un tercio en
 * decimal, `0.333333333333`, son catorce caracteres: a 34 px no cabía, y a
 * 22 px tampoco (185 px). A 17 px ocupa 143. Se encoge el número largo y el
 * corto se queda como estaba.
 */
function tamanoDelResultado(texto: string, cerrado: boolean): string {
  const largo = texto.length;
  if (cerrado) {
    if (largo <= 8) return 'text-[34px] sm:text-[40px]';
    if (largo <= 11) return 'text-[28px] sm:text-[34px]';
    if (largo <= 13) return 'text-[22px] sm:text-[28px]';
    return 'text-[17px] sm:text-[24px]';
  }
  if (largo <= 8) return 'text-[28px] sm:text-[32px]';
  if (largo <= 11) return 'text-[24px] sm:text-[28px]';
  if (largo <= 13) return 'text-[20px] sm:text-[24px]';
  return 'text-[17px] sm:text-[22px]';
}

const Visor = ({
  ref,
  expresion,
  resultado,
  fraccion,
  error,
  cerrado,
  golpe,
  convertible,
  destino,
  alCambiarVista,
}: {
  ref: React.RefObject<HTMLDivElement | null>;
  expresion: string;
  resultado: string;
  fraccion: Racional | null;
  error: boolean;
  cerrado: boolean;
  golpe: number;
  convertible: boolean;
  destino: 'decimal' | 'fracción';
  alCambiarVista: () => void;
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
      {expresion ? <Escrito texto={expresion} abierta={!cerrado} /> : ' '}
    </div>

    {/* La línea del resultado tiene alto fijo, y el botón su hueco siempre
        reservado: si apareciera solo cuando hay algo que convertir, el número
        saltaría de sitio y el orden del tabulador cambiaría con cada cuenta.
        Cuando no hay nada que convertir, sale apagado. */}
    <div className="relative mt-0.5 flex h-[56px] items-center gap-2 sm:h-[62px]">
      <button
        type="button"
        onClick={alCambiarVista}
        data-novedad="vista"
        disabled={!convertible}
        title={
          convertible
            ? `Pasar el resultado a ${destino} (tecla d)`
            : 'Tras «=», pasa un resultado de fracción a decimal y vuelta'
        }
        className={cn(
          'calc-tecla relative flex h-8 w-[100px] flex-none items-center justify-center gap-1 rounded-lg',
          'border border-[var(--calc-borde)] bg-[var(--calc-tecla-fn)] font-mono text-[11px] font-bold text-[var(--calc-tinta)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--calc-azul)]',
          'disabled:opacity-40',
          // El botón mide 32 px de alto, como la barra de modos; el dedo
          // necesita 44, y se los da esta franja invisible.
          "before:absolute before:-inset-y-1.5 before:inset-x-0 before:content-['']"
        )}
      >
        <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />a {destino}
      </button>

      {/* Fuera de esta región queda el botón: dentro, cada cambio de vista
          volvería a leer su etiqueta además del número. */}
      <div
        aria-live="polite"
        aria-atomic
        className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-right [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <span
          key={golpe}
          data-visor="resultado"
          data-fraccion={fraccion ? `${fraccion.n}/${fraccion.d}` : undefined}
          className={cn(
            'inline-block font-mono tabular-nums',
            cerrado && 'calc-resultado-nuevo',
            error
              ? 'text-lg font-semibold text-[var(--calc-rojo)]'
              : cerrado
                ? 'font-bold leading-tight text-[var(--calc-azul)]'
                : 'font-semibold leading-tight text-[var(--calc-tinta)] opacity-70',
            !error &&
              (fraccion ? 'text-[22px] sm:text-[24px]' : tamanoDelResultado(resultado, cerrado))
          )}
        >
          {fraccion ? <Fraccion valor={fraccion} /> : resultado || ' '}
        </span>
      </div>
    </div>
  </div>
);

/**
 * Lo escrito, con la barra de fracción en azul.
 *
 * La barra se pinta como una `/` de color y no con su carácter propio (`⁄`),
 * que la tipografía monoespaciada no trae. El azul la separa del `÷`, que es
 * otra operación. Si la fracción está a medias, una casilla marca dónde va el
 * denominador: es lo que queda de las casillas de la Casio sin necesitar un
 * cursor para moverse entre ellas.
 */
function Escrito({ texto, abierta }: { texto: string; abierta: boolean }) {
  return (
    <>
      {texto.split(BARRA).map((parte, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="font-extrabold text-[var(--calc-azul)]">/</span>}
          {parte}
        </Fragment>
      ))}
      {abierta && texto.endsWith(BARRA) && <span aria-hidden className="calc-hueco" />}
    </>
  );
}

/**
 * Una fracción apilada, para el resultado.
 *
 * Lo apilado es solo para la vista: un lector de pantalla no sabría qué hacer
 * con dos números uno encima de otro, y «5/6» lo leería como una fecha. Lee el
 * texto de al lado, que dice «5 entre 6».
 */
function Fraccion({ valor }: { valor: Racional }) {
  const negativa = valor.n < BigInt(0);
  return (
    <>
      <span aria-hidden className="inline-flex items-center gap-1 align-middle">
        {negativa && <span>-</span>}
        <span className="inline-flex flex-col items-center leading-none">
          <span className="px-1">{formatearEntero(negativa ? -valor.n : valor.n)}</span>
          <span className="my-[3px] h-[2px] self-stretch rounded-full bg-current" />
          <span className="px-1">{formatearEntero(valor.d)}</span>
        </span>
      </span>
      <span className="sr-only">{fraccionALeer(valor)}</span>
    </>
  );
}

/** El ejemplo del primer paso de la guía de novedades: ½ + ⅓ = ⅚, apilado. */
function EjemploDeFraccion() {
  return (
    <p className="my-2 flex items-center gap-1.5 font-mono text-[15px] font-semibold">
      <Mini arriba={1} abajo={2} />
      <span aria-hidden>+</span>
      <Mini arriba={1} abajo={3} />
      <span aria-hidden>=</span>
      <Mini arriba={5} abajo={6} />
      {/* Apilado, el ejemplo no tiene nada que leer; dicho, sí. */}
      <span className="sr-only">Un medio más un tercio igual a cinco sextos.</span>
    </p>
  );
}

function Mini({ arriba, abajo }: { arriba: number; abajo: number }) {
  return (
    <span aria-hidden className="inline-flex flex-col items-center text-[13px] leading-none">
      <span className="px-0.5">{arriba}</span>
      <span className="my-[2px] h-[1.5px] self-stretch bg-current" />
      <span className="px-0.5">{abajo}</span>
    </span>
  );
}

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
  alElegir: (entrada: Entrada) => void;
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
              onClick={() => alElegir(entrada)}
              className={cn(
                'flex min-h-[44px] w-full flex-col items-end gap-0.5 rounded-lg px-2.5 py-1.5 text-right',
                'hover:bg-[var(--calc-realce)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--calc-azul)]'
              )}
            >
              <span className="max-w-full truncate font-mono text-[11px] text-[var(--calc-tinta-suave)]">
                <Escrito texto={entrada.expresion} abierta={false} />
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

/** Las teclas que van con dibujo y no con texto, y por eso llevan `aria-label`. */
const CON_ICONO = new Set(['retroceso', 'fraccion']);

function Boton({
  tecla,
  alPulsar,
  apagada,
  rechazo,
}: {
  tecla: Tecla;
  alPulsar: (accion: Accion) => void;
  apagada?: boolean;
  /** Cambia cuando la tecla no ha podido entrar, para sacudirla. */
  rechazo?: number;
}) {
  const { variante } = tecla;

  // Retroceso y fracción van con icono y no con su carácter: `⌫` y `▭` no
  // vienen en la tipografía monoespaciada del proyecto y el navegador los
  // sustituye por una caja tachada, que parece un fallo de fuente.
  const cara =
    tecla.id === 'retroceso' ? (
      <Delete className="h-5 w-5" aria-hidden />
    ) : tecla.id === 'fraccion' ? (
      <IconoFraccion />
    ) : (
      tecla.etiqueta
    );

  return (
    <button
      type="button"
      disabled={apagada}
      onClick={() => alPulsar(tecla.accion)}
      data-tecla={tecla.id}
      /**
       * El nombre accesible es la etiqueta que se ve, no una descripción.
       *
       * Antes iba un `aria-label` en todas —`aria-label="siete"` sobre una
       * tecla que pone `7`— y eso incumple WCAG 2.5.3: quien maneja el
       * ordenador con la voz dice lo que LEE, y «pulsa 7» no casaba con nada.
       * La descripción se mantiene, pero en `title`, que es una ayuda y no un
       * nombre, así que no sustituye a lo que está escrito.
       *
       * Las únicas excepciones son el retroceso y la fracción, que van con
       * icono y no tienen texto visible: sin `aria-label` no tendrían nombre.
       */
      aria-label={CON_ICONO.has(tecla.id) ? tecla.titulo : undefined}
      title={tecla.atajo ? `${tecla.titulo} (tecla ${tecla.atajo})` : tecla.titulo}
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
      {/* La sacudida va en un envoltorio con `key`: al cambiar, React lo
          vuelve a montar y la animación arranca otra vez. Sobre el botón no
          valdría, porque remontarlo le quitaría el foco. */}
      {rechazo === undefined ? (
        cara
      ) : (
        <span key={rechazo} className={cn('inline-flex', rechazo > 0 && 'calc-sacudida')}>
          {cara}
        </span>
      )}
    </button>
  );
}

/** Dos casillas, una sobre otra, con la barra en medio: la tecla de la Casio. */
function IconoFraccion() {
  return (
    <svg
      viewBox="0 0 16 22"
      className="h-[19px] w-[14px]"
      fill="none"
      stroke="currentColor"
      aria-hidden
    >
      <rect x="2.5" y="1" width="11" height="7" rx="1.6" strokeWidth="1.6" />
      <path d="M0.8 11h14.4" strokeWidth="1.9" strokeLinecap="round" />
      <rect x="2.5" y="14" width="11" height="7" rx="1.6" strokeWidth="1.6" />
    </svg>
  );
}

function PieDeAyuda() {
  return (
    <p className="mt-3 px-2 text-center font-mono text-[11px] leading-relaxed text-muted-foreground">
      Se puede teclear: dígitos y operadores, <kbd>Enter</kbd> para calcular,{' '}
      <kbd>Retroceso</kbd> para borrar y <kbd>Esc</kbd> para empezar de nuevo. Las
      iniciales van a su función: <kbd>s</kbd> <kbd>c</kbd> <kbd>t</kbd> a la trigonometría,{' '}
      <kbd>l</kbd> al logaritmo neperiano, <kbd>g</kbd> al decimal, <kbd>r</kbd> a la raíz,{' '}
      <kbd>p</kbd> a π y <kbd>a</kbd> al último resultado. Con <kbd>f</kbd> se escribe una
      fracción, y <kbd>d</kbd> pasa el resultado de fracción a decimal y vuelta.
    </p>
  );
}

// ---------------------------------------------------------------------------
// Utilidades de edición
// ---------------------------------------------------------------------------

/** Lo que vale ahora mismo lo escrito, para las teclas de memoria. */
function evaluarActual(expresion: string, contexto: Contexto): number {
  if (expresion === '') return 0;
  const r = evaluar(expresion, contexto);
  return r.ok ? r.valor : 0;
}
