/**
 * Las teclas, separadas de la pantalla que las pinta.
 *
 * Están aquí por la misma razón que el motor está en `src/lib/calculadora`:
 * qué hace cada tecla es una decisión, y las decisiones se leen mejor juntas
 * que repartidas por un JSX de trescientas líneas. El componente se limita a
 * recorrer lo que salga de aquí.
 *
 * ## Por qué hay dos capas y no una tecla por función
 *
 * Una científica tiene más funciones que teclas, y lo resuelve desde hace
 * cuarenta años igual: una tecla `2nd` que cambia lo que hacen las demás. Aquí
 * hay dos modificadores, los mismos que trae una Casio de instituto:
 *
 * - `2nd` da la función inversa: `sin` pasa a `sin⁻¹`, `ln` a `eˣ`, `x²` a `x³`.
 * - `hyp` da la hiperbólica: `sin` pasa a `sinh`.
 *
 * Y se combinan: con los dos puestos, `sin` es `sinh⁻¹`. Eso es exactamente lo
 * que hace la tecla de una calculadora física, y por eso la etiqueta se
 * calcula en vez de escribirse: con dos modificadores hay cuatro etiquetas por
 * tecla trigonométrica, y escribir las doce a mano es pedir una errata.
 */

/** Lo que pasa al pulsar una tecla. */
export type Accion =
  | { tipo: 'insertar'; texto: string }
  | { tipo: 'igual' }
  | { tipo: 'borrar' }
  | { tipo: 'limpiar' }
  | { tipo: 'signo' }
  | { tipo: 'memoria'; que: 'MC' | 'MR' | 'M+' | 'M-' | 'MS' };

/** Cómo se pinta cada tecla. El color dice para qué sirve, no adorna. */
export type Variante = 'fn' | 'num' | 'op' | 'igual' | 'mem' | 'borrar';

export interface Tecla {
  /** Estable entre capas, para que React no rehaga el botón al pulsar `2nd`. */
  id: string;
  etiqueta: string;
  accion: Accion;
  variante: Variante;
  /** Cómo se lee en voz alta. La etiqueta suele ser un símbolo impronunciable. */
  titulo: string;
  /** Las que ocupan dos columnas. Solo el cero. */
  ancha?: boolean;
  /** Se pinta en amarillo cuando el modificador está puesto. */
  alterada?: boolean;
}

const insertar = (texto: string): Accion => ({ tipo: 'insertar', texto });

/**
 * Una tecla trigonométrica, resuelta con los dos modificadores puestos.
 *
 * El orden de los sufijos no es arbitrario: se escribe `sinh⁻¹` y no
 * `sin⁻¹h`, porque lo que se invierte es la hiperbólica entera.
 */
function trigonometrica(base: 'sin' | 'cos' | 'tan', segunda: boolean, hiperbolico: boolean): Tecla {
  const nombre = `${base}${hiperbolico ? 'h' : ''}${segunda ? '⁻¹' : ''}`;
  const comoSeLee =
    `${segunda ? 'arco' : ''}${base === 'sin' ? 'seno' : base === 'cos' ? 'coseno' : 'tangente'}` +
    `${hiperbolico ? ' hiperbólico' : ''}`;

  return {
    id: base,
    etiqueta: nombre,
    accion: insertar(`${nombre}(`),
    variante: 'fn',
    titulo: comoSeLee,
    alterada: segunda || hiperbolico,
  };
}

/** Una tecla con dos caras: la de siempre y la que enseña `2nd`. */
function conSegunda(
  id: string,
  normal: { etiqueta: string; texto: string; titulo: string },
  alterna: { etiqueta: string; texto: string; titulo: string },
  segunda: boolean,
  variante: Variante = 'fn'
): Tecla {
  const cara = segunda ? alterna : normal;
  return {
    id,
    etiqueta: cara.etiqueta,
    accion: insertar(cara.texto),
    variante,
    titulo: cara.titulo,
    alterada: segunda,
  };
}

/**
 * El bloque científico: cinco columnas, cuatro filas.
 *
 * El reparto sigue el de una calculadora de sobremesa —paréntesis y potencias
 * arriba, trigonometría en medio, constantes debajo— porque quien ya ha usado
 * una encuentra las teclas sin leerlas.
 */
export function teclasCientificas(segunda: boolean, hiperbolico: boolean): Tecla[] {
  return [
    { id: 'abre', etiqueta: '(', accion: insertar('('), variante: 'fn', titulo: 'abrir paréntesis' },
    { id: 'cierra', etiqueta: ')', accion: insertar(')'), variante: 'fn', titulo: 'cerrar paréntesis' },
    conSegunda(
      'cuadrado',
      { etiqueta: 'x²', texto: '²', titulo: 'al cuadrado' },
      { etiqueta: 'x³', texto: '³', titulo: 'al cubo' },
      segunda
    ),
    conSegunda(
      'potencia',
      { etiqueta: 'xʸ', texto: '^', titulo: 'elevado a' },
      { etiqueta: 'ʸ√x', texto: 'ʸ√', titulo: 'raíz de índice' },
      segunda
    ),
    conSegunda(
      'raiz',
      { etiqueta: '√', texto: '√(', titulo: 'raíz cuadrada' },
      // La etiqueta lleva el índice delante y el glifo `∛` no: a 11 px, dentro
      // de una tecla de 60, ese carácter se lee como un garabato.
      { etiqueta: '³√', texto: '∛(', titulo: 'raíz cúbica' },
      segunda
    ),

    trigonometrica('sin', segunda, hiperbolico),
    trigonometrica('cos', segunda, hiperbolico),
    trigonometrica('tan', segunda, hiperbolico),
    conSegunda(
      'ln',
      { etiqueta: 'ln', texto: 'ln(', titulo: 'logaritmo neperiano' },
      { etiqueta: 'eˣ', texto: 'e^(', titulo: 'e elevado a' },
      segunda
    ),
    conSegunda(
      'log',
      { etiqueta: 'log', texto: 'log(', titulo: 'logaritmo decimal' },
      { etiqueta: '10ˣ', texto: '10^(', titulo: 'diez elevado a' },
      segunda
    ),

    { id: 'pi', etiqueta: 'π', accion: insertar('π'), variante: 'fn', titulo: 'pi' },
    { id: 'euler', etiqueta: 'e', accion: insertar('e'), variante: 'fn', titulo: 'número e' },
    { id: 'reciproco', etiqueta: '¹/x', accion: insertar('⁻¹'), variante: 'fn', titulo: 'inverso' },
    { id: 'factorial', etiqueta: 'n!', accion: insertar('!'), variante: 'fn', titulo: 'factorial' },
    { id: 'exp', etiqueta: 'EXP', accion: insertar('E'), variante: 'fn', titulo: 'por diez elevado a' },

    { id: 'mod', etiqueta: 'mod', accion: insertar(' mod '), variante: 'fn', titulo: 'resto de la división' },
    { id: 'abs', etiqueta: '|x|', accion: insertar('abs('), variante: 'fn', titulo: 'valor absoluto' },
    { id: 'rand', etiqueta: 'rand', accion: insertar('rand'), variante: 'fn', titulo: 'número al azar' },
    { id: 'ans', etiqueta: 'Ans', accion: insertar('Ans'), variante: 'fn', titulo: 'último resultado' },
    { id: 'porciento', etiqueta: '%', accion: insertar('%'), variante: 'fn', titulo: 'por ciento' },
  ];
}

/** La fila de memoria. Va aparte porque no es cálculo: es guardar y recuperar. */
export const TECLAS_MEMORIA: Tecla[] = [
  { id: 'mc', etiqueta: 'MC', accion: { tipo: 'memoria', que: 'MC' }, variante: 'mem', titulo: 'borrar la memoria' },
  { id: 'mr', etiqueta: 'MR', accion: { tipo: 'memoria', que: 'MR' }, variante: 'mem', titulo: 'recuperar la memoria' },
  { id: 'mmas', etiqueta: 'M+', accion: { tipo: 'memoria', que: 'M+' }, variante: 'mem', titulo: 'sumar a la memoria' },
  { id: 'mmenos', etiqueta: 'M−', accion: { tipo: 'memoria', que: 'M-' }, variante: 'mem', titulo: 'restar de la memoria' },
  { id: 'ms', etiqueta: 'MS', accion: { tipo: 'memoria', que: 'MS' }, variante: 'mem', titulo: 'guardar en la memoria' },
];

/**
 * El bloque numérico: cuatro columnas.
 *
 * Los dígitos van en la disposición de teléfono invertida —7 8 9 arriba— que
 * es la de toda calculadora desde que existen, y no la del teclado numérico de
 * un ordenador, que es la misma. Aquí coinciden, así que teclear con el pavé
 * numérico cae donde el ojo espera.
 */
export const TECLAS_NUMERICAS: Tecla[] = [
  { id: 'limpiar', etiqueta: 'C', accion: { tipo: 'limpiar' }, variante: 'borrar', titulo: 'borrar todo' },
  { id: 'retroceso', etiqueta: '⌫', accion: { tipo: 'borrar' }, variante: 'borrar', titulo: 'borrar lo último' },
  { id: 'signo', etiqueta: '±', accion: { tipo: 'signo' }, variante: 'op', titulo: 'cambiar el signo' },
  { id: 'dividir', etiqueta: '÷', accion: insertar('÷'), variante: 'op', titulo: 'dividir' },

  { id: '7', etiqueta: '7', accion: insertar('7'), variante: 'num', titulo: 'siete' },
  { id: '8', etiqueta: '8', accion: insertar('8'), variante: 'num', titulo: 'ocho' },
  { id: '9', etiqueta: '9', accion: insertar('9'), variante: 'num', titulo: 'nueve' },
  { id: 'multiplicar', etiqueta: '×', accion: insertar('×'), variante: 'op', titulo: 'multiplicar' },

  { id: '4', etiqueta: '4', accion: insertar('4'), variante: 'num', titulo: 'cuatro' },
  { id: '5', etiqueta: '5', accion: insertar('5'), variante: 'num', titulo: 'cinco' },
  { id: '6', etiqueta: '6', accion: insertar('6'), variante: 'num', titulo: 'seis' },
  { id: 'restar', etiqueta: '−', accion: insertar('−'), variante: 'op', titulo: 'restar' },

  { id: '1', etiqueta: '1', accion: insertar('1'), variante: 'num', titulo: 'uno' },
  { id: '2', etiqueta: '2', accion: insertar('2'), variante: 'num', titulo: 'dos' },
  { id: '3', etiqueta: '3', accion: insertar('3'), variante: 'num', titulo: 'tres' },
  { id: 'sumar', etiqueta: '+', accion: insertar('+'), variante: 'op', titulo: 'sumar' },

  { id: '0', etiqueta: '0', accion: insertar('0'), variante: 'num', titulo: 'cero', ancha: true },
  { id: 'coma', etiqueta: '.', accion: insertar('.'), variante: 'num', titulo: 'coma decimal' },
  { id: 'igual', etiqueta: '=', accion: { tipo: 'igual' }, variante: 'igual', titulo: 'calcular' },
];

/**
 * Lo que hace cada tecla del teclado físico.
 *
 * Existe porque una calculadora en un ordenador que no se pueda teclear es una
 * calculadora a medias: nadie va a picar veinte dígitos con el ratón. Las
 * letras son las iniciales de la función, que es lo que hace cualquier hoja de
 * cálculo, y se anuncian en la pantalla para que no haya que adivinarlas.
 */
export const ATAJOS: Record<string, Accion> = {
  '0': insertar('0'),
  '1': insertar('1'),
  '2': insertar('2'),
  '3': insertar('3'),
  '4': insertar('4'),
  '5': insertar('5'),
  '6': insertar('6'),
  '7': insertar('7'),
  '8': insertar('8'),
  '9': insertar('9'),
  '.': insertar('.'),
  ',': insertar('.'),
  '+': insertar('+'),
  '-': insertar('−'),
  '*': insertar('×'),
  '/': insertar('÷'),
  '^': insertar('^'),
  '(': insertar('('),
  ')': insertar(')'),
  '%': insertar('%'),
  '!': insertar('!'),
  p: insertar('π'),
  e: insertar('e'),
  s: insertar('sin('),
  c: insertar('cos('),
  t: insertar('tan('),
  l: insertar('ln('),
  g: insertar('log('),
  r: insertar('√('),
  a: insertar('Ans'),
  '=': { tipo: 'igual' },
  Enter: { tipo: 'igual' },
  Backspace: { tipo: 'borrar' },
  Escape: { tipo: 'limpiar' },
  Delete: { tipo: 'limpiar' },
};
