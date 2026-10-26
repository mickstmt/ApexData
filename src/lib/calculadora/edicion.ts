/**
 * Editar lo escrito en la calculadora, pieza a pieza.
 *
 * Vive aquí, y no dentro del componente, por lo de siempre en este proyecto:
 * lo que no se puede probar no se puede afirmar que funcione. La tecla `±` es
 * el caso claro — tiene cinco ramas, todas con un «y si» detrás — y mientras
 * estuvo dentro del `.tsx` ninguna estaba cubierta, que es justo por donde se
 * coló el fallo de negar un resultado.
 */

import { BARRA } from './evaluar';
import { cabeComoFraccion } from './formato';
import type { Racional } from './racional';

/**
 * Los valores que no son dígitos pero sí son un operando.
 *
 * Hacen falta porque `±` busca «el último número escrito» y aquí el último
 * número puede no tener dígitos: después de un `=`, lo que hay es `Ans`, y
 * `2π` termina en una letra griega. Sin esta lista, pulsar `±` sobre ellos
 * añadía un menos suelto al final —`Ans−`— en vez de negarlos.
 */
const VALORES_SUELTOS = new Set(['π', 'e', 'Ans', 'rand']);

/** Los operadores detrás de los cuales un `−` es signo y no resta. */
const INFIJOS = ['+', '−', '×', '÷', '^', 'ʸ√', ' mod '];

/**
 * Una pieza que es parte de un número.
 *
 * Casi siempre es una cifra suelta, pero no siempre: la cinta y `MR` devuelven
 * el número entero de una pieza —`'12'`, `'0.5'`— y para `±` y para la tecla
 * de fracción ese número es tan número como el tecleado.
 */
const DIGITO = /^[\d.]+$/;

/** Un número que el analizador sabe leer: no vale un punto suelto. */
const NUMERO_COMPLETO = /^(?:\d+(?:\.\d*)?|\.\d+)$/;

/**
 * Por qué no se puede poner la barra de fracción ahora, o `null` si se puede.
 *
 * Va aparte de `ponerFraccion` para que la pantalla diga el motivo de verdad y
 * no lo adivine: los dos casos piden cosas distintas al usuario.
 */
export function porQueNoCabeFraccion(piezas: string[]): 'falta-numerador' | 'ya-tiene-barra' | null {
  if (piezas[piezas.length - 1] === BARRA) return 'ya-tiene-barra';
  let i = piezas.length;
  while (i > 0 && DIGITO.test(piezas[i - 1])) i -= 1;
  if (piezas[i - 1] === BARRA) return 'ya-tiene-barra';
  if (!NUMERO_COMPLETO.test(piezas.slice(i).join(''))) return 'falta-numerador';
  return null;
}

/**
 * Pone la barra de fracción detrás del número que se acaba de escribir.
 *
 * Es la forma de escribir de la Casio en modo línea: primero el numerador,
 * luego la tecla, luego el denominador, y el siguiente operador cierra la
 * fracción. Sin teclas de cursor no hay otra: una plantilla con dos casillas
 * vacías obligaría a moverse entre ellas.
 *
 * Devuelve `null` cuando no hay dónde ponerla, para que la pantalla avise en
 * vez de dejar una barra suelta que el analizador no sabría leer:
 *
 * - si lo último no es un número (`2+`, `sin(`, `π`, un `.` suelto o nada);
 * - si ese número ya es un denominador: `1⁄2⁄3` no es una fracción.
 */
export function ponerFraccion(piezas: string[]): string[] | null {
  return porQueNoCabeFraccion(piezas) ? null : [...piezas, BARRA];
}

/**
 * Cambia el signo del último operando escrito, no el de toda la expresión.
 *
 * Es lo que hace la tecla `±` de una calculadora: en `5×3`, pulsarla deja
 * `5×−3`. Y vuelve a pulsarla y lo deshace, porque si no habría que borrar a
 * ciegas un carácter que está en medio.
 *
 * El caso raro que sí importa: dentro de un exponente —`2E5`— el signo que
 * toca es el del exponente y tiene que ser el guion normal, porque el `−`
 * tipográfico no forma parte de la notación que lee el analizador.
 */
export function cambiarSigno(piezas: string[]): string[] {
  let i = piezas.length;
  // Una fracción a medias —`1⁄`, sin denominador todavía— también es el
  // último operando: el signo va delante del numerador, no detrás de la barra.
  if (piezas[i - 1] === BARRA) i -= 1;
  while (i > 0 && DIGITO.test(piezas[i - 1])) i -= 1;

  // Y una entera también: en `3×1⁄2` el operando es `1⁄2`, y meter el menos
  // entre la barra y el `2` dejaría un denominador que el analizador no lee.
  if (i < piezas.length && piezas[i - 1] === BARRA) {
    i -= 1;
    while (i > 0 && DIGITO.test(piezas[i - 1])) i -= 1;
  }

  // Si no termina en dígitos, todavía puede terminar en un operando: `π`, `e`,
  // `Ans` o `rand`.
  if (i === piezas.length && i > 0 && VALORES_SUELTOS.has(piezas[i - 1])) i -= 1;

  const anterior = piezas[i - 1];

  // Dentro del exponente de un `2E5`, donde el signo es parte del número.
  if (anterior === '-' && piezas[i - 2] === 'E') {
    return [...piezas.slice(0, i - 1), ...piezas.slice(i)];
  }
  if (anterior === 'E') {
    return [...piezas.slice(0, i), '-', ...piezas.slice(i)];
  }

  // No termina en operando —está vacío, o acaba en un operador—: el signo se
  // pone al final, o se quita si ya estaba.
  if (i === piezas.length) {
    if (anterior === '−') return piezas.slice(0, -1);
    return [...piezas, '−'];
  }

  const esUnario = (t: string | undefined) => t === undefined || t === '(' || INFIJOS.includes(t);

  if (anterior === '−' && esUnario(piezas[i - 2])) {
    return [...piezas.slice(0, i - 1), ...piezas.slice(i)];
  }

  return [...piezas.slice(0, i), '−', ...piezas.slice(i)];
}

/**
 * Un número escrito de forma que el analizador lo vuelva a leer igual.
 *
 * Lo usan la cinta y la tecla `MR`, que devuelven a la expresión un número que
 * ya estaba calculado. `String` usa `e` minúscula para el exponente y ahí esa
 * letra es el número de Euler: sin esta traducción, recuperar `1e-7` de la
 * cinta lo leería como «1 · e · (−7)», que no vale lo mismo ni de lejos.
 */
export function comoLiteral(valor: number, exacto?: Racional | null): string {
  // Si se sabe la fracción, vuelve como fracción: un ⅓ recuperado de la cinta
  // como `0.333333333333333` ya no sería un tercio, y `+1⁄3` daría un
  // decimal en vez de ⅔.
  if (cabeComoFraccion(exacto)) {
    const { n, d } = exacto;
    return n < BigInt(0) ? `(−${-n}${BARRA}${d})` : `${n}${BARRA}${d}`;
  }

  const texto = String(valor);
  if (!texto.includes('e')) return valor < 0 ? `(${texto})` : texto;

  const [mantisa, exponente] = valor.toExponential().split('e');
  return `(${mantisa}E${exponente})`;
}
