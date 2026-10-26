/**
 * El motor de una calculadora científica de verdad.
 *
 * ## Por qué un analizador y no una cadena de teclas
 *
 * Una calculadora de cuatro teclas puede vivir con el modelo clásico —un
 * acumulador, un operador pendiente y ya—, pero ese modelo no sabe lo que es
 * la precedencia: escribe `2 + 3 × 4` y contesta 20. Una científica de verdad
 * contesta 14, y para eso hay que leer la expresión entera: se parte en piezas
 * (`tokenizar`) y se analiza con descenso recursivo respetando la jerarquía
 * que usan las científicas de sobremesa.
 *
 * Por eso esto vive separado de la pantalla: es lógica pura, sin React y sin
 * DOM, así que `tests/calculadora.test.ts` la prueba entera con la misma suite
 * que corre en el CI. Lo que no se puede probar no se puede afirmar que
 * funciona, y aquí lo que se afirma es justo eso.
 *
 * ## La jerarquía, de menos a más fuerte
 *
 * ```
 *   + −
 *   × ÷ mod                (y la multiplicación implícita: 2π, 3(4+5))
 *   − unario               (por eso −2² es −4 y no 4, como en cualquier científica)
 *   ^ ʸ√                   (asociativo por la derecha: 2^3^2 = 2^9 = 512)
 *   ! % ² ³ postfijos
 *   a⁄b                    (la fracción es UN número: 1⁄2² es (1⁄2)², como en una Casio)
 * ```
 *
 * ## Dos cuentas a la vez
 *
 * Cada operando lleva su valor en `double` y, mientras se pueda, el mismo
 * valor en fracción exacta (`racional.ts`). El `double` es el que manda —es el
 * de siempre, y con él se pintan los decimales—; la fracción solo decide si el
 * resultado se puede enseñar como ⅚. En cuanto aparece algo que no es
 * racional —π, una raíz, un seno— la fracción pasa a `null` y ya no vuelve.
 */

import {
  absoluto,
  deTexto,
  dividir,
  elevar,
  entero,
  factorialExacto,
  multiplicar,
  negar,
  restar,
  resto,
  sumar,
  type Racional,
} from './racional';

/** En qué unidad se leen los ángulos. Las tres que trae cualquier científica. */
export type ModoAngular = 'DEG' | 'RAD' | 'GRAD';

/** Lo que el motor necesita saber y no está escrito en la expresión. */
export interface Contexto {
  modo: ModoAngular;
  /** El último resultado, que es lo que vale la tecla `Ans`. */
  ans: number;
  /** El mismo `Ans` en exacto, si lo era. Sin él, `Ans` cortaría la fracción. */
  ansExacto?: Racional | null;
  /**
   * Si `Ans` se estaba viendo como fracción. Así `=` y luego `+ 1⁄6` sigue en
   * fracción aunque lo nuevo no lleve barra: se sigue con lo que se veía.
   */
  ansEnFraccion?: boolean;
  /** De dónde salen los números de `rand`. Inyectable para poder probarlo. */
  aleatorio?: () => number;
}

/**
 * El resultado de evaluar: o un número, o el motivo por el que no lo hay.
 *
 * `exacto` es el valor en fracción, o `null` si no es racional. `fraccion` dice
 * si se escribió alguna con la tecla: es lo que decide cómo se enseña al
 * pulsar `=`. Que `1÷3` salga en decimal y `1⁄3` en fracción es la razón de
 * ser de la tecla; si no, haría lo mismo que `÷`.
 */
export type Resultado =
  | { ok: true; valor: number; exacto: Racional | null; fraccion: boolean }
  | { ok: false; error: string };

/** La barra que pone la tecla de fracción. No es `/`: esa ya es dividir. */
export const BARRA = '⁄';

/** Un fallo de cálculo con un motivo que se le puede enseñar al usuario. */
class ErrorDeCalculo extends Error {}

function fallar(motivo: string): never {
  throw new ErrorDeCalculo(motivo);
}

// ---------------------------------------------------------------------------
// 1. Tokenizar
// ---------------------------------------------------------------------------

type Tipo =
  | 'numero'
  | 'constante'
  | 'funcion'
  | 'operador'
  | 'abre'
  | 'cierra'
  | 'postfijo'
  | 'fraccion';

interface Token {
  tipo: Tipo;
  texto: string;
  valor?: number;
}

/**
 * Las funciones que entiende, con el nombre que enseña la tecla y el que se
 * puede teclear.
 *
 * El orden importa: se busca la coincidencia más larga primero, porque `sin`
 * es prefijo de `sinh` y `sinh` lo es de `sinh⁻¹`. Si se probara el corto
 * antes, `sinh(` se leería como `sin` seguido de una `h` suelta.
 */
const FUNCIONES = [
  'sinh⁻¹',
  'cosh⁻¹',
  'tanh⁻¹',
  'sin⁻¹',
  'cos⁻¹',
  'tan⁻¹',
  'asinh',
  'acosh',
  'atanh',
  'sinh',
  'cosh',
  'tanh',
  'asin',
  'acos',
  'atan',
  'sin',
  'cos',
  'tan',
  'log₂',
  'log2',
  'log',
  'ln',
  'exp',
  '√',
  '∛',
  'abs',
] as const;

/** Lo que cada nombre tecleable significa para el evaluador. */
const ALIAS: Record<string, string> = {
  'sin⁻¹': 'asin',
  'cos⁻¹': 'acos',
  'tan⁻¹': 'atan',
  'sinh⁻¹': 'asinh',
  'cosh⁻¹': 'acosh',
  'tanh⁻¹': 'atanh',
  'log₂': 'log2',
  '√': 'sqrt',
  '∛': 'cbrt',
};

/** Las constantes, con sus dos escrituras: la de la tecla y la tecleable. */
const CONSTANTES: Record<string, number> = {
  'π': Math.PI,
  pi: Math.PI,
  e: Math.E,
};

/**
 * Un número, tal y como lo escribe la calculadora.
 *
 * La `E` mayúscula es el separador de exponente que pone la tecla EXP —`2E5`
 * son doscientos mil— y va en mayúscula a propósito: la `e` minúscula es el
 * número de Euler, y con una sola grafía `2e5` sería ambiguo entre «2·10⁵» y
 * «2·e·5», que no valen lo mismo.
 */
const NUMERO = /^(?:\d+(?:\.\d*)?|\.\d+)(?:E[+-]?\d+)?/;

function tokenizar(entrada: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < entrada.length) {
    const resto = entrada.slice(i);
    const c = resto[0];

    if (c === ' ') {
      i += 1;
      continue;
    }

    const numero = NUMERO.exec(resto);
    if (numero) {
      tokens.push({ tipo: 'numero', texto: numero[0], valor: Number(numero[0]) });
      i += numero[0].length;
      continue;
    }

    // `Ans` y `rand` se resuelven de una pieza antes que nada, para que la `e`
    // de Euler no se lleve por delante ninguna de sus letras.
    if (/^Ans/i.test(resto)) {
      tokens.push({ tipo: 'constante', texto: 'Ans' });
      i += 3;
      continue;
    }
    if (/^rand/i.test(resto)) {
      tokens.push({ tipo: 'constante', texto: 'rand' });
      i += 4;
      continue;
    }

    const funcion = FUNCIONES.find((f) => resto.startsWith(f));
    if (funcion) {
      tokens.push({ tipo: 'funcion', texto: ALIAS[funcion] ?? funcion });
      i += funcion.length;
      continue;
    }

    if (resto.startsWith('mod')) {
      tokens.push({ tipo: 'operador', texto: 'mod' });
      i += 3;
      continue;
    }

    const constante = Object.keys(CONSTANTES).find((k) => resto.startsWith(k));
    if (constante) {
      tokens.push({ tipo: 'constante', texto: constante });
      i += constante.length;
      continue;
    }

    // `ʸ√` es la raíz enésima INFIJA —`3 ʸ√ 8` es 2— y se mira antes que `√`,
    // que es prefija, por la misma razón que `sinh` antes que `sin`.
    if (resto.startsWith('ʸ√')) {
      tokens.push({ tipo: 'operador', texto: 'ʸ√' });
      i += 2;
      continue;
    }

    if ('+-−*×/÷^'.includes(c)) {
      const normal = c === '−' ? '-' : c === '×' ? '*' : c === '÷' ? '/' : c;
      tokens.push({ tipo: 'operador', texto: normal });
      i += 1;
      continue;
    }

    if (c === BARRA) {
      tokens.push({ tipo: 'fraccion', texto: BARRA });
      i += 1;
      continue;
    }

    if (c === '(') {
      tokens.push({ tipo: 'abre', texto: '(' });
      i += 1;
      continue;
    }
    if (c === ')') {
      tokens.push({ tipo: 'cierra', texto: ')' });
      i += 1;
      continue;
    }

    // El recíproco va como postfijo de dos caracteres —`5⁻¹`— y no como
    // `5^-1`, que vale lo mismo pero se lee peor en la pantalla. Se mira antes
    // que los postfijos de un carácter para que el `¹` no quede suelto.
    if (resto.startsWith('⁻¹')) {
      tokens.push({ tipo: 'postfijo', texto: '⁻¹' });
      i += 2;
      continue;
    }

    if ('!%²³'.includes(c)) {
      tokens.push({ tipo: 'postfijo', texto: c });
      i += 1;
      continue;
    }

    fallar(`No entiendo «${c}»`);
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// 2. Ángulos y funciones
// ---------------------------------------------------------------------------

function aRadianes(v: number, modo: ModoAngular): number {
  if (modo === 'DEG') return (v * Math.PI) / 180;
  if (modo === 'GRAD') return (v * Math.PI) / 200;
  return v;
}

function deRadianes(v: number, modo: ModoAngular): number {
  if (modo === 'DEG') return (v * 180) / Math.PI;
  if (modo === 'GRAD') return (v * 200) / Math.PI;
  return v;
}

/**
 * El redondeo que hace que `sin(180°)` valga 0 y no 1,22·10⁻¹⁶.
 *
 * No es cosmética: π no cabe en un `double`, así que el seno de lo que el
 * ordenador cree que son 180° no da cero exacto. Una científica de verdad
 * enseña 0 porque calcula con dígitos de guarda y redondea antes de
 * enseñarlo. Aquí se hace lo mismo, pero solo con los valores donde la
 * trigonometría es exacta —0, ±½, ±(√2)/2, ±(√3)/2, ±1— y solo si el error es
 * menor que 10⁻¹², que es mil veces mayor que el ruido del `double` y mucho
 * menor que cualquier resultado que alguien quisiera ver.
 *
 * Se aplica dentro de las funciones y no al resultado final a propósito: así
 * un número escrito a mano, como `1E-20`, sale tal cual y no se lo traga un
 * redondeo que no le tocaba.
 */
const EXACTOS = [0, 0.5, Math.SQRT1_2, Math.sqrt(3) / 2, 1];

function ajustar(v: number): number {
  for (const exacto of EXACTOS) {
    if (Math.abs(Math.abs(v) - exacto) < 1e-12) return v < 0 ? -exacto : exacto;
  }
  return v;
}

function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) fallar('El factorial solo acepta enteros de 0 en adelante');
  if (n > 170) fallar('Demasiado grande');
  let total = 1;
  for (let k = 2; k <= n; k += 1) total *= k;
  return total;
}

function aplicarFuncion(nombre: string, v: number, ctx: Contexto): number {
  switch (nombre) {
    case 'sin':
      return ajustar(Math.sin(aRadianes(v, ctx.modo)));
    case 'cos':
      return ajustar(Math.cos(aRadianes(v, ctx.modo)));
    case 'tan': {
      // En grados, la tangente de 90° + 180k no existe, y el `double` lo
      // disimula devolviendo 1,6·10¹⁶. Una científica de verdad da error ahí,
      // así que se comprueba sobre los grados, donde el múltiplo SÍ es exacto.
      if (ctx.modo !== 'RAD') {
        const vuelta = ctx.modo === 'DEG' ? 180 : 200;
        const recto = vuelta / 2;
        const resto = ((v % vuelta) + vuelta) % vuelta;
        if (Math.abs(resto - recto) < 1e-12) fallar('La tangente no existe ahí');
      }
      return ajustar(Math.tan(aRadianes(v, ctx.modo)));
    }
    case 'asin':
      if (v < -1 || v > 1) fallar('El arcoseno solo va de −1 a 1');
      return deRadianes(Math.asin(v), ctx.modo);
    case 'acos':
      if (v < -1 || v > 1) fallar('El arcocoseno solo va de −1 a 1');
      return deRadianes(Math.acos(v), ctx.modo);
    case 'atan':
      return deRadianes(Math.atan(v), ctx.modo);
    case 'sinh':
      return Math.sinh(v);
    case 'cosh':
      return Math.cosh(v);
    case 'tanh':
      return Math.tanh(v);
    case 'asinh':
      return Math.asinh(v);
    case 'acosh':
      if (v < 1) fallar('El arcocoseno hiperbólico empieza en 1');
      return Math.acosh(v);
    case 'atanh':
      if (v <= -1 || v >= 1) fallar('El arcotangente hiperbólico va entre −1 y 1');
      return Math.atanh(v);
    case 'ln':
      if (v <= 0) fallar('El logaritmo solo acepta números mayores que 0');
      return Math.log(v);
    case 'log':
      if (v <= 0) fallar('El logaritmo solo acepta números mayores que 0');
      return Math.log10(v);
    case 'log2':
      if (v <= 0) fallar('El logaritmo solo acepta números mayores que 0');
      return Math.log2(v);
    case 'exp':
      return Math.exp(v);
    case 'sqrt':
      if (v < 0) fallar('No hay raíz cuadrada de un número negativo');
      return Math.sqrt(v);
    case 'cbrt':
      return Math.cbrt(v);
    case 'abs':
      return Math.abs(v);
    default:
      return fallar(`No conozco la función «${nombre}»`);
  }
}

// ---------------------------------------------------------------------------
// 3. Analizar y evaluar
// ---------------------------------------------------------------------------

/** Un valor ya resuelto: el `double` de siempre y, si lo hay, su fracción. */
interface Valor {
  valor: number;
  exacto: Racional | null;
}

/**
 * Un operando ya resuelto.
 *
 * `porcentajeDe` guarda el número que había ANTES de dividir entre cien, y
 * existe por una regla que toda calculadora respeta y ninguna explica:
 * `200 + 10%` son 220, no 200,1. Cuando el `%` es el operando derecho de una
 * suma o una resta, el porcentaje se toma del izquierdo. En un producto o una
 * división no: `200 × 10%` son 20. Sin este dato no se puede distinguir un
 * caso del otro.
 */
interface Operando extends Valor {
  porcentajeDe: Valor | null;
}

/** La fracción de una operación, si los dos lados la tienen. */
function ambos(
  a: Valor,
  b: Valor,
  operacion: (x: Racional, y: Racional) => Racional | null
): Racional | null {
  return a.exacto && b.exacto ? operacion(a.exacto, b.exacto) : null;
}

const CIEN = entero(100);
const UNO_EXACTO = entero(1);

function analizar(tokens: Token[], ctx: Contexto): { total: Valor; fraccion: boolean } {
  let pos = 0;
  /** Si se escribió alguna fracción con la tecla. Decide cómo se enseña. */
  let fraccion = false;

  const mirar = (): Token | undefined => tokens[pos];

  /** ¿Este token empieza un operando? De esto vive la multiplicación implícita. */
  const abreOperando = (t: Token | undefined): boolean =>
    t !== undefined &&
    (t.tipo === 'numero' || t.tipo === 'constante' || t.tipo === 'funcion' || t.tipo === 'abre');

  function primario(): Valor {
    const t = mirar();
    if (!t) fallar('Falta un número');

    if (t.tipo === 'numero') {
      pos += 1;
      const arriba: Valor = { valor: t.valor as number, exacto: deTexto(t.texto) };

      // La fracción se lee aquí, dentro del número, y no como un operador:
      // `1⁄2` es un número igual que `0.5`, así que `1⁄2²` eleva la fracción
      // entera y `3×1⁄2` no depende de ninguna precedencia.
      if (mirar()?.tipo !== 'fraccion') return arriba;
      pos += 1;
      fraccion = true;

      const abajo = mirar();
      if (abajo?.tipo !== 'numero') fallar('Falta el denominador');
      pos += 1;
      if (abajo.valor === 0) fallar('No se puede dividir entre cero');
      const denominador: Valor = { valor: abajo.valor as number, exacto: deTexto(abajo.texto) };
      return { valor: arriba.valor / denominador.valor, exacto: ambos(arriba, denominador, dividir) };
    }

    if (t.tipo === 'constante') {
      pos += 1;
      if (t.texto === 'Ans') {
        if (ctx.ansEnFraccion) fraccion = true;
        return { valor: ctx.ans, exacto: ctx.ansExacto ?? null };
      }
      if (t.texto === 'rand') return { valor: (ctx.aleatorio ?? Math.random)(), exacto: null };
      return { valor: CONSTANTES[t.texto], exacto: null };
    }

    if (t.tipo === 'funcion') {
      pos += 1;
      // El paréntesis es opcional, como en las científicas: `sin30` vale lo
      // mismo que `sin(30)`. Sin paréntesis la función se queda solo con la
      // potencia que venga detrás —`√9×2` es 3×2, no √18— que es justo lo que
      // hace una de sobremesa.
      const argumento = mirar()?.tipo === 'abre' ? primario() : potencia();
      return {
        valor: aplicarFuncion(t.texto, argumento.valor, ctx),
        // De todas las funciones, solo el valor absoluto de una fracción es
        // otra fracción.
        exacto: t.texto === 'abs' && argumento.exacto ? absoluto(argumento.exacto) : null,
      };
    }

    if (t.tipo === 'abre') {
      pos += 1;
      const dentro = expresion();
      // Un paréntesis sin cerrar no es un error: al pulsar `=` se cierran
      // solos, igual que en cualquier calculadora.
      if (mirar()?.tipo === 'cierra') pos += 1;
      return { valor: dentro.valor, exacto: dentro.exacto };
    }

    if (t.tipo === 'fraccion') fallar('Falta el numerador');

    return fallar('Falta un número');
  }

  function postfijo(): Operando {
    let { valor, exacto } = primario();
    let porcentajeDe: Valor | null = null;

    for (;;) {
      const t = mirar();
      if (t?.tipo !== 'postfijo') break;
      pos += 1;
      porcentajeDe = null;
      if (t.texto === '!') {
        valor = factorial(valor);
        exacto = exacto && factorialExacto(exacto);
      } else if (t.texto === '²') {
        valor = valor * valor;
        exacto = exacto && multiplicar(exacto, exacto);
      } else if (t.texto === '³') {
        valor = valor * valor * valor;
        exacto = exacto && elevar(exacto, entero(3));
      } else if (t.texto === '⁻¹') {
        if (valor === 0) fallar('No se puede dividir entre cero');
        valor = 1 / valor;
        exacto = exacto && dividir(UNO_EXACTO, exacto);
      } else if (t.texto === '%') {
        porcentajeDe = { valor, exacto };
        valor /= 100;
        exacto = exacto && dividir(exacto, CIEN);
      }
    }

    return { valor, exacto, porcentajeDe };
  }

  function potencia(): Valor {
    return conSigno();
  }

  /** `base ^ exponente` y `índice ʸ√ radicando`, ambos por la derecha. */
  function elevacion(): Operando {
    const izquierda = postfijo();
    const t = mirar();

    if (t?.tipo === 'operador' && t.texto === '^') {
      pos += 1;
      // Por la derecha y con el unario dentro: `2^-3` es un octavo, y `2^3^2`
      // es 2⁹ y no 8².
      const exponente = conSigno();
      return {
        valor: Math.pow(izquierda.valor, exponente.valor),
        exacto: ambos(izquierda, exponente, elevar),
        porcentajeDe: null,
      };
    }

    if (t?.tipo === 'operador' && t.texto === 'ʸ√') {
      pos += 1;
      const indice = izquierda.valor;
      const radicando = conSigno().valor;
      if (indice === 0) fallar('No existe la raíz de índice 0');
      // La raíz impar de un negativo sí existe —∛(−8) es −2— y `Math.pow` no
      // la sabe dar: devuelve NaN. Se resuelve por el lado positivo y se le
      // devuelve el signo.
      if (radicando < 0) {
        if (Number.isInteger(indice) && Math.abs(indice % 2) === 1) {
          return { valor: -Math.pow(-radicando, 1 / indice), exacto: null, porcentajeDe: null };
        }
        fallar('No hay raíz par de un número negativo');
      }
      return { valor: Math.pow(radicando, 1 / indice), exacto: null, porcentajeDe: null };
    }

    return izquierda;
  }

  /**
   * El menos unario, por debajo de la potencia.
   *
   * Ese orden es el que hace que `−2²` sea −4: primero se eleva y luego se
   * cambia el signo. Cualquier científica contesta lo mismo, y quien espere 4
   * escribe `(−2)²`.
   */
  function conSigno(): Operando {
    const t = mirar();
    if (t?.tipo === 'operador' && (t.texto === '-' || t.texto === '+')) {
      pos += 1;
      const dentro = conSigno();
      if (t.texto === '+') return { ...dentro, porcentajeDe: null };
      return {
        valor: -dentro.valor,
        exacto: dentro.exacto && negar(dentro.exacto),
        porcentajeDe: null,
      };
    }
    return elevacion();
  }

  function termino(): Operando {
    let izquierda = conSigno();
    let factores = 1;

    for (;;) {
      const t = mirar();

      if (t?.tipo === 'operador' && (t.texto === '*' || t.texto === '/' || t.texto === 'mod')) {
        pos += 1;
        const derecha = conSigno();
        if (t.texto === '*') {
          izquierda = {
            valor: izquierda.valor * derecha.valor,
            exacto: ambos(izquierda, derecha, multiplicar),
            porcentajeDe: null,
          };
        } else if (t.texto === '/') {
          if (derecha.valor === 0) fallar('No se puede dividir entre cero');
          izquierda = {
            valor: izquierda.valor / derecha.valor,
            exacto: ambos(izquierda, derecha, dividir),
            porcentajeDe: null,
          };
        } else {
          if (derecha.valor === 0) fallar('No se puede dividir entre cero');
          izquierda = {
            valor: izquierda.valor % derecha.valor,
            exacto: ambos(izquierda, derecha, resto),
            porcentajeDe: null,
          };
        }
        factores += 1;
        continue;
      }

      // Multiplicación implícita: `2π`, `3(4+5)`, `2sin30`. Solo cuando lo que
      // viene puede empezar un operando; si no, el término se ha acabado.
      if (abreOperando(t)) {
        const derecha = conSigno();
        izquierda = {
          valor: izquierda.valor * derecha.valor,
          exacto: ambos(izquierda, derecha, multiplicar),
          porcentajeDe: null,
        };
        factores += 1;
        continue;
      }

      break;
    }

    return factores === 1 ? izquierda : { ...izquierda, porcentajeDe: null };
  }

  function expresion(): Operando {
    let izquierda = termino();

    for (;;) {
      const t = mirar();
      if (t?.tipo !== 'operador' || (t.texto !== '+' && t.texto !== '-')) break;
      pos += 1;
      const derecha = termino();

      // Aquí es donde `200 + 10%` se convierte en 220.
      const base = derecha.porcentajeDe;
      const sumando: Valor = base
        ? {
            valor: (izquierda.valor * base.valor) / 100,
            exacto: ambos(izquierda, base, (a, b) => {
              const producto = multiplicar(a, b);
              return producto && dividir(producto, CIEN);
            }),
          }
        : derecha;

      izquierda = {
        valor: t.texto === '+' ? izquierda.valor + sumando.valor : izquierda.valor - sumando.valor,
        exacto: ambos(izquierda, sumando, t.texto === '+' ? sumar : restar),
        porcentajeDe: null,
      };
    }

    return izquierda;
  }

  const total = expresion();

  if (pos < tokens.length) fallar('Sobra algo al final');

  return { total, fraccion };
}

/**
 * Evalúa lo que hay escrito en la calculadora.
 *
 * Nunca lanza: los fallos previstos —dividir entre cero, un dominio que no
 * toca, un factorial imposible— vuelven como `{ ok: false }` con un motivo
 * redactado para leerlo en la pantalla, no para depurar.
 */
export function evaluar(entrada: string, ctx: Contexto): Resultado {
  if (entrada.trim() === '') return { ok: false, error: '' };

  try {
    const { total, fraccion } = analizar(tokenizar(entrada), ctx);
    const { valor, exacto } = total;

    if (Number.isNaN(valor)) return { ok: false, error: 'Eso no da un número' };
    if (!Number.isFinite(valor)) return { ok: false, error: 'Demasiado grande' };

    return { ok: true, valor, exacto, fraccion };
  } catch (error) {
    if (error instanceof ErrorDeCalculo) return { ok: false, error: error.message };
    return { ok: false, error: 'No se puede calcular eso' };
  }
}
