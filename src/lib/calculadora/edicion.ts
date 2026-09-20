/**
 * Editar lo escrito en la calculadora, pieza a pieza.
 *
 * Vive aquí, y no dentro del componente, por lo de siempre en este proyecto:
 * lo que no se puede probar no se puede afirmar que funcione. La tecla `±` es
 * el caso claro — tiene cinco ramas, todas con un «y si» detrás — y mientras
 * estuvo dentro del `.tsx` ninguna estaba cubierta, que es justo por donde se
 * coló el fallo de negar un resultado.
 */

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
  while (i > 0 && /^[\d.]$/.test(piezas[i - 1])) i -= 1;

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
export function comoLiteral(valor: number): string {
  const texto = String(valor);
  if (!texto.includes('e')) return valor < 0 ? `(${texto})` : texto;

  const [mantisa, exponente] = valor.toExponential().split('e');
  return `(${mantisa}E${exponente})`;
}
