/**
 * Fracciones exactas: numerador y denominador enteros, sin coma flotante.
 *
 * ## Por qué hace falta esto, si el motor ya calcula
 *
 * Porque el motor calcula con `double`, y un `double` no sabe lo que es un
 * tercio: guarda 0,333333333333333314829616256247… y ya no hay forma de
 * volver a ⅓. Para enseñar ½ + ⅓ = ⅚ hay que llevar la cuenta aparte, con
 * enteros que no pierden nada. Es lo mismo que hace una Casio: el resultado
 * exacto y el decimal viajan juntos, y la tecla S⇔D solo elige cuál se ve.
 *
 * `bigint` y no `number` porque los denominadores crecen deprisa —sumar
 * fracciones multiplica denominadores— y un `number` deja de ser entero exacto
 * en 2⁵³.
 *
 * ## Cuándo deja de ser exacto
 *
 * Todo lo que devuelve `null` es «esto ya no es una fracción»: π, una raíz, un
 * seno, o un número que ha crecido tanto que nadie querría verlo como
 * fracción. El motor sigue dando su decimal; solo se pierde la vista exacta.
 */

export interface Racional {
  /** Lleva el signo. */
  n: bigint;
  /** Siempre positivo. */
  d: bigint;
}

/**
 * A partir de aquí la fracción se abandona.
 *
 * Sin tope, `2⁹⁹⁹⁹` o un factorial grande dejarían al navegador multiplicando
 * enteros de miles de cifras en cada pulsación —la vista previa evalúa
 * mientras se escribe—. Sesenta cifras es muchísimo más de lo que cabe en la
 * pantalla y mucho menos de lo que se nota en el tiempo de cálculo.
 */
const LIMITE = BigInt(10) ** BigInt(60);

const CERO = BigInt(0);
const UNO = BigInt(1);

function abs(x: bigint): bigint {
  return x < CERO ? -x : x;
}

function mcd(a: bigint, b: bigint): bigint {
  a = abs(a);
  b = abs(b);
  while (b !== CERO) [a, b] = [b, a % b];
  return a === CERO ? UNO : a;
}

/** La fracción simplificada, con el signo arriba, o `null` si ya no cabe. */
export function racional(n: bigint, d: bigint): Racional | null {
  if (d === CERO) return null;
  if (d < CERO) {
    n = -n;
    d = -d;
  }
  const g = mcd(n, d);
  n /= g;
  d /= g;
  if (abs(n) > LIMITE || d > LIMITE) return null;
  return { n, d };
}

export const entero = (n: number): Racional => ({ n: BigInt(n), d: UNO });

export const sumar = (a: Racional, b: Racional) => racional(a.n * b.d + b.n * a.d, a.d * b.d);
export const restar = (a: Racional, b: Racional) => racional(a.n * b.d - b.n * a.d, a.d * b.d);
export const multiplicar = (a: Racional, b: Racional) => racional(a.n * b.n, a.d * b.d);
export const negar = (a: Racional): Racional => ({ n: -a.n, d: a.d });
export const absoluto = (a: Racional): Racional => ({ n: abs(a.n), d: a.d });

/** `null` también al dividir entre cero: ese error lo da el motor, con palabras. */
export function dividir(a: Racional, b: Racional): Racional | null {
  if (b.n === CERO) return null;
  return racional(a.n * b.d, a.d * b.n);
}

/**
 * El resto, con el signo del dividendo.
 *
 * Es el `%` de JavaScript, que es el que ya usa el motor para el decimal: si
 * aquí se eligiera otra convención, `−7 mod 3` daría −1 en decimal y 2 en
 * fracción, y la tecla S⇔D cambiaría el número además de su forma.
 */
export function resto(a: Racional, b: Racional): Racional | null {
  if (b.n === CERO) return null;
  // `bigint` divide truncando hacia cero, que es justo lo que hace falta.
  const cociente = (a.n * b.d) / (a.d * b.n);
  const veces = multiplicar(b, { n: cociente, d: UNO });
  return veces && restar(a, veces);
}

/**
 * La potencia, solo con exponente entero.
 *
 * Con exponente fraccionario el resultado casi nunca es racional —2^½ es √2—
 * y no merece la pena buscar los pocos casos en que sí. El tope de 64 evita
 * que un `2^100000` escrito por curiosidad haga cien mil multiplicaciones de
 * enteros gigantes antes de que el `LIMITE` lo pare.
 */
export function elevar(base: Racional, exponente: Racional): Racional | null {
  if (exponente.d !== UNO || abs(exponente.n) > BigInt(64)) return null;
  let e = exponente.n;
  if (e < CERO) {
    if (base.n === CERO) return null;
    base = { n: base.d * (base.n < CERO ? -UNO : UNO), d: abs(base.n) };
    e = -e;
  }
  let total: Racional | null = { n: UNO, d: UNO };
  for (let k = CERO; k < e && total; k += UNO) total = multiplicar(total, base);
  return total;
}

/**
 * El factorial de un entero, en exacto. El de 25 ya no cabe en un `double`.
 *
 * Se rinde en cuanto pasa del `LIMITE` —hacia 47!— en vez de llegar hasta el
 * final: la vista previa lo recalcula en cada pulsación, y multiplicar hasta
 * 170! para tirarlo después era trabajo perdido.
 */
export function factorialExacto(a: Racional): Racional | null {
  if (a.d !== UNO || a.n < CERO || a.n > BigInt(170)) return null;
  let total = UNO;
  for (let k = BigInt(2); k <= a.n; k += UNO) {
    total *= k;
    if (total > LIMITE) return null;
  }
  return { n: total, d: UNO };
}

/**
 * Un número tal y como lo escribe la calculadora —`0.75`, `2E5`, `1.5E-3`—
 * convertido sin pasar por el `double`.
 *
 * Es lo que hace que 0.75 se pueda ver como ¾: si se leyera con `Number` y
 * luego se buscara la fracción, 0.1 llegaría como 0,1000000000000000055511…
 */
export function deTexto(texto: string): Racional | null {
  const m = /^(\d*)(?:\.(\d*))?(?:E([+-]?\d+))?$/.exec(texto);
  if (!m) return null;
  const [, ent = '', dec = '', exp = '0'] = m;
  if (ent === '' && dec === '') return null;

  const e = Number(exp);
  if (Math.abs(e) > 60) return null;

  let n = BigInt((ent || '0') + dec);
  let d = BigInt(10) ** BigInt(dec.length);
  if (e > 0) n *= BigInt(10) ** BigInt(e);
  else d *= BigInt(10) ** BigInt(-e);
  return racional(n, d);
}
