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
 * ```
 */

/** En qué unidad se leen los ángulos. Las tres que trae cualquier científica. */
export type ModoAngular = 'DEG' | 'RAD' | 'GRAD';

/** Lo que el motor necesita saber y no está escrito en la expresión. */
export interface Contexto {
  modo: ModoAngular;
  /** El último resultado, que es lo que vale la tecla `Ans`. */
  ans: number;
  /** De dónde salen los números de `rand`. Inyectable para poder probarlo. */
  aleatorio?: () => number;
}

/** El resultado de evaluar: o un número, o el motivo por el que no lo hay. */
export type Resultado = { ok: true; valor: number } | { ok: false; error: string };

/** Un fallo de cálculo con un motivo que se le puede enseñar al usuario. */
class ErrorDeCalculo extends Error {}

function fallar(motivo: string): never {
  throw new ErrorDeCalculo(motivo);
}

// ---------------------------------------------------------------------------
// 1. Tokenizar
// ---------------------------------------------------------------------------

type Tipo = 'numero' | 'constante' | 'funcion' | 'operador' | 'abre' | 'cierra' | 'postfijo';

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
interface Operando {
  valor: number;
  porcentajeDe: number | null;
}

function analizar(tokens: Token[], ctx: Contexto): number {
  let pos = 0;

  const mirar = (): Token | undefined => tokens[pos];

  /** ¿Este token empieza un operando? De esto vive la multiplicación implícita. */
  const abreOperando = (t: Token | undefined): boolean =>
    t !== undefined &&
    (t.tipo === 'numero' || t.tipo === 'constante' || t.tipo === 'funcion' || t.tipo === 'abre');

  function primario(): number {
    const t = mirar();
    if (!t) fallar('Falta un número');

    if (t.tipo === 'numero') {
      pos += 1;
      return t.valor as number;
    }

    if (t.tipo === 'constante') {
      pos += 1;
      if (t.texto === 'Ans') return ctx.ans;
      if (t.texto === 'rand') return (ctx.aleatorio ?? Math.random)();
      return CONSTANTES[t.texto];
    }

    if (t.tipo === 'funcion') {
      pos += 1;
      // El paréntesis es opcional, como en las científicas: `sin30` vale lo
      // mismo que `sin(30)`. Sin paréntesis la función se queda solo con la
      // potencia que venga detrás —`√9×2` es 3×2, no √18— que es justo lo que
      // hace una de sobremesa.
      const argumento = mirar()?.tipo === 'abre' ? primario() : potencia();
      return aplicarFuncion(t.texto, argumento, ctx);
    }

    if (t.tipo === 'abre') {
      pos += 1;
      const dentro = expresion().valor;
      // Un paréntesis sin cerrar no es un error: al pulsar `=` se cierran
      // solos, igual que en cualquier calculadora.
      if (mirar()?.tipo === 'cierra') pos += 1;
      return dentro;
    }

    return fallar('Falta un número');
  }

  function postfijo(): Operando {
    let valor = primario();
    let porcentajeDe: number | null = null;

    for (;;) {
      const t = mirar();
      if (t?.tipo !== 'postfijo') break;
      pos += 1;
      porcentajeDe = null;
      if (t.texto === '!') valor = factorial(valor);
      else if (t.texto === '²') valor = valor * valor;
      else if (t.texto === '³') valor = valor * valor * valor;
      else if (t.texto === '⁻¹') {
        if (valor === 0) fallar('No se puede dividir entre cero');
        valor = 1 / valor;
      } else if (t.texto === '%') {
        porcentajeDe = valor;
        valor /= 100;
      }
    }

    return { valor, porcentajeDe };
  }

  function potencia(): number {
    return conSigno().valor;
  }

  /** `base ^ exponente` y `índice ʸ√ radicando`, ambos por la derecha. */
  function elevacion(): Operando {
    const izquierda = postfijo();
    const t = mirar();

    if (t?.tipo === 'operador' && t.texto === '^') {
      pos += 1;
      // Por la derecha y con el unario dentro: `2^-3` es un octavo, y `2^3^2`
      // es 2⁹ y no 8².
      return { valor: Math.pow(izquierda.valor, conSigno().valor), porcentajeDe: null };
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
          return { valor: -Math.pow(-radicando, 1 / indice), porcentajeDe: null };
        }
        fallar('No hay raíz par de un número negativo');
      }
      return { valor: Math.pow(radicando, 1 / indice), porcentajeDe: null };
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
      return { valor: t.texto === '-' ? -dentro.valor : dentro.valor, porcentajeDe: null };
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
          izquierda = { valor: izquierda.valor * derecha.valor, porcentajeDe: null };
        } else if (t.texto === '/') {
          if (derecha.valor === 0) fallar('No se puede dividir entre cero');
          izquierda = { valor: izquierda.valor / derecha.valor, porcentajeDe: null };
        } else {
          if (derecha.valor === 0) fallar('No se puede dividir entre cero');
          izquierda = { valor: izquierda.valor % derecha.valor, porcentajeDe: null };
        }
        factores += 1;
        continue;
      }

      // Multiplicación implícita: `2π`, `3(4+5)`, `2sin30`. Solo cuando lo que
      // viene puede empezar un operando; si no, el término se ha acabado.
      if (abreOperando(t)) {
        const derecha = conSigno();
        izquierda = { valor: izquierda.valor * derecha.valor, porcentajeDe: null };
        factores += 1;
        continue;
      }

      break;
    }

    return factores === 1 ? izquierda : { valor: izquierda.valor, porcentajeDe: null };
  }

  function expresion(): Operando {
    let izquierda = termino();

    for (;;) {
      const t = mirar();
      if (t?.tipo !== 'operador' || (t.texto !== '+' && t.texto !== '-')) break;
      pos += 1;
      const derecha = termino();

      // Aquí es donde `200 + 10%` se convierte en 220.
      const sumando =
        derecha.porcentajeDe !== null
          ? (izquierda.valor * derecha.porcentajeDe) / 100
          : derecha.valor;

      izquierda = {
        valor: t.texto === '+' ? izquierda.valor + sumando : izquierda.valor - sumando,
        porcentajeDe: null,
      };
    }

    return izquierda;
  }

  const total = expresion();

  if (pos < tokens.length) fallar('Sobra algo al final');

  return total.valor;
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
    const valor = analizar(tokenizar(entrada), ctx);

    if (Number.isNaN(valor)) return { ok: false, error: 'Eso no da un número' };
    if (!Number.isFinite(valor)) return { ok: false, error: 'Demasiado grande' };

    return { ok: true, valor };
  } catch (error) {
    if (error instanceof ErrorDeCalculo) return { ok: false, error: error.message };
    return { ok: false, error: 'No se puede calcular eso' };
  }
}
