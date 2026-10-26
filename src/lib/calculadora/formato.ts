/**
 * Cómo se enseña un número en la pantalla de la calculadora.
 *
 * ## Por qué no vale `String(valor)`
 *
 * Un `double` no sabe sumar `0.1 + 0.2`: da `0.30000000000000004`, y eso en
 * una pantalla parece una avería. No lo es —es el estándar IEEE 754 haciendo
 * lo que tiene que hacer— pero ninguna calculadora del mundo lo enseña, porque
 * todas trabajan con más dígitos de los que muestran. Aquí se hace igual: se
 * calcula con los diecisiete del `double` y se enseñan doce, que es donde el
 * ruido queda por debajo del último dígito visible.
 *
 * ## Por qué los millares llevan un espacio y no un punto
 *
 * Un punto de millar sería lo normal en español, pero en esta pantalla el
 * punto ya significa otra cosa: es la coma decimal que se teclea. Con las dos
 * cosas a la vez, `1.234` no se sabría leer. El espacio fino —el mismo que usa
 * el SI, y que no parte la línea— agrupa sin inventarse un símbolo nuevo.
 */

import type { Racional } from './racional';

/** Cuántas cifras significativas se enseñan. Por debajo está el ruido del `double`. */
const DIGITOS = 12;

/** A partir de aquí un número se lee mejor en notación científica. */
const DEMASIADO_GRANDE = 1e12;
const DEMASIADO_PEQUENO = 1e-9;

const ESPACIO_FINO = ' ';

const SUPERINDICES: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '-': '⁻',
};

/** `-13` → `⁻¹³`, para poder escribir «×10⁻¹³» sin etiquetas ni CSS. */
export function superindice(exponente: number): string {
  return String(exponente)
    .split('')
    .map((c) => SUPERINDICES[c] ?? c)
    .join('');
}

/** Mete un espacio fino cada tres cifras de la parte entera. */
function agrupar(entera: string): string {
  const signo = entera.startsWith('-') ? '-' : '';
  const cifras = signo ? entera.slice(1) : entera;
  if (cifras.length < 5) return entera; // Hasta cuatro cifras se leen igual de bien sin cortar.
  return signo + cifras.replace(/\B(?=(\d{3})+(?!\d))/g, ESPACIO_FINO);
}

/**
 * El número tal y como va a la pantalla.
 *
 * Devuelve el texto ya compuesto, superíndices incluidos, porque la pantalla
 * es una sola línea de tipografía monoespaciada y no tiene dónde colgar un
 * `<sup>`.
 */
export function formatear(valor: number): string {
  if (!Number.isFinite(valor)) return '∞';

  // `-0` existe en IEEE 754 y es igual a `0`. Enseñarlo con signo confunde.
  if (valor === 0) return '0';

  const magnitud = Math.abs(valor);

  if (magnitud >= DEMASIADO_GRANDE || magnitud < DEMASIADO_PEQUENO) {
    let exponente = Math.floor(Math.log10(magnitud));
    let mantisa = valor / Math.pow(10, exponente);
    // `log10` no siempre cae donde debería con los números al borde de una
    // potencia de diez, y entonces la mantisa se va a 10 y saldría «10×10¹¹»,
    // que no es notación científica. Se recoloca.
    if (Math.abs(mantisa) >= 10) {
      mantisa /= 10;
      exponente += 1;
    }
    // Nueve cifras en la mantisa: con el «×10ⁿⁿ» detrás, doce no caben en la
    // pantalla del teléfono, que es donde se va a usar esto.
    const texto = recortar(Number(mantisa.toPrecision(9)));
    return `${texto}×10${superindice(exponente)}`;
  }

  const redondeado = Number(valor.toPrecision(DIGITOS));
  const texto = recortar(redondeado);
  const [entera, decimal] = texto.split('.');

  return decimal ? `${agrupar(entera)}.${decimal}` : agrupar(entera);
}

/**
 * El número en texto, sin ceros de relleno y sin que `toString` lo pase a
 * notación científica por su cuenta.
 *
 * ## El detalle que costó cuatro quintas partes de la precisión
 *
 * `String` cambia a exponencial por debajo de 1e-7, y ahí arriba ya se ha
 * decidido que ese número va en decimal. Al rehacerlo a mano estaba
 * `toFixed(12)`, y `toFixed` cuenta **decimales**, no cifras significativas:
 * para `2⁻²⁷ = 0,000000007450580596…` los doce decimales se gastan casi
 * enteros en los ceros de delante y quedaba `0.000000007451`, cuatro cifras
 * de las doce prometidas. El número de decimales que hacen falta depende de
 * dónde esté la primera cifra, así que se calcula.
 */
function recortar(valor: number): string {
  const texto = String(valor);
  if (!texto.includes('e')) return texto;

  // Dónde cae la primera cifra significativa: para 7,45·10⁻⁹ el exponente es
  // −9, así que hasta la duodécima cifra hay 9 − 1 + 12 decimales.
  const exponente = Math.floor(Math.log10(Math.abs(valor)));
  const decimales = Math.min(100, Math.max(0, DIGITOS - exponente - 1));
  return valor.toFixed(decimales).replace(/\.?0+$/, '');
}

// ---------------------------------------------------------------------------
// Fracciones
// ---------------------------------------------------------------------------

/**
 * Si una fracción se puede enseñar como fracción.
 *
 * Hacen falta dos cosas. Que no sea un entero: `4⁄1` no es una fracción que
 * nadie quiera ver, es un 4. Y que quepa: la pantalla apila numerador y
 * denominador con la misma anchura que el resultado decimal, y un
 * `123456789⁄100000000` —que es lo que da `1.23456789` escrito en exacto— ya
 * no se lee mejor que su decimal. Doce cifras arriba y doce abajo es el mismo
 * listón que `DIGITOS`.
 */
export function cabeComoFraccion(r: Racional | null | undefined): r is Racional {
  if (!r || r.d === BigInt(1)) return false;
  const arriba = (r.n < BigInt(0) ? -r.n : r.n).toString().length;
  return arriba <= DIGITOS && r.d.toString().length <= DIGITOS;
}

/** Un entero de la fracción, con el mismo agrupado de millares que el decimal. */
export function formatearEntero(n: bigint): string {
  return agrupar(n.toString());
}

/**
 * Cómo se lee la fracción en voz alta.
 *
 * Existe porque VoiceOver en español lee «5/6» como una fecha, y el visual
 * apilado no tiene texto que leer. «5 entre 6» es como se dice en clase y no
 * hay forma de confundirlo.
 */
export function fraccionALeer(r: Racional): string {
  const negativa = r.n < BigInt(0);
  return `${negativa ? 'menos ' : ''}${negativa ? -r.n : r.n} entre ${r.d}`;
}
