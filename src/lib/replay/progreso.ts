/**
 * Cuánto lleva recorrido cada coche, y lo que sale de ahí: el orden, el hueco
 * al líder, la vuelta, y quién se quedó fuera.
 *
 * ## Por qué se proyecta sobre el trazado
 *
 * Una posición `(x, y)` no dice quién va delante. Proyectarla sobre la línea
 * de referencia del circuito —el punto más cercano de la vuelta rápida— da los
 * metros de vuelta, y con las vueltas contadas, los metros desde la salida. Eso
 * sí ordena. Es lo que hace el proyecto original con un KD-tree; aquí basta
 * una rejilla, porque son 22 coches.
 *
 * ## Por qué la vuelta se cuenta con los metros y no con los cruces de meta
 *
 * FastF1 da el instante en que cada coche cruza la meta, y parecía lo natural.
 * Pero ese reloj y el cero del trazado no coinciden por unas muestras, y en el
 * desfase el progreso saltaba una vuelta entera: todos los de detrás medían
 * el mismo hueco al líder. Se vio en el mockup. Con un solo reloj —los metros
 * caen de golpe, luego se cruzó la meta— no hay desfase posible.
 */

import type { TrackPoint } from '@/types';
import { SIN_DATO, type BloqueDePosiciones } from './bloque';

export interface Trazado {
  xs: Float64Array;
  ys: Float64Array;
  /** Metros de vuelta de cada punto. */
  ds: Float64Array;
  /** Metros de la vuelta entera. */
  longitud: number;
  /** Rejilla: celda → índices de los puntos que caen en ella. */
  celdas: Map<number, number[]>;
  celda: number;
  minX: number;
  minY: number;
  columnas: number;
  filas: number;
}

/** Tamaño de celda en decímetros: ~40 m, unas cinco muestras del trazado. */
const CELDA = 400;

export function prepararTrazado(puntos: TrackPoint[]): Trazado {
  const n = puntos.length;
  const xs = new Float64Array(n), ys = new Float64Array(n), ds = new Float64Array(n);
  let minX = Infinity, minY = Infinity, maxX = -Infinity;

  puntos.forEach((p, i) => {
    xs[i] = p.x; ys[i] = p.y; ds[i] = p.distance ?? 0;
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
  });

  const columnas = Math.max(1, Math.ceil((maxX - minX) / CELDA) + 1);
  let maxY = -Infinity;
  for (let i = 0; i < n; i++) if (ys[i] > maxY) maxY = ys[i];
  const filas = Math.max(1, Math.ceil((maxY - minY) / CELDA) + 1);
  const celdas = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const clave = claveDeCelda(xs[i], ys[i], minX, minY, columnas);
    const lista = celdas.get(clave);
    if (lista) lista.push(i);
    else celdas.set(clave, [i]);
  }

  return { xs, ys, ds, longitud: n ? ds[n - 1] : 0, celdas, celda: CELDA, minX, minY, columnas, filas };
}

function claveDeCelda(x: number, y: number, minX: number, minY: number, columnas: number): number {
  return Math.floor((y - minY) / CELDA) * columnas + Math.floor((x - minX) / CELDA);
}

/** El índice del punto del trazado más cercano a `(x, y)`. */
export function puntoMasCercano(trazado: Trazado, x: number, y: number): number {
  const { xs, ys, minX, minY, columnas, filas, celdas } = trazado;
  const cx = Math.floor((x - minX) / CELDA);
  const cy = Math.floor((y - minY) / CELDA);

  let mejor = -1, distancia = Infinity;

  // Fuera de la rejilla —un coche en el garaje de un circuito grande— se mira
  // entero: es raro y barato. Y dentro, las celdas se acotan a la rejilla,
  // porque una columna fuera de rango se confunde con otra fila.
  const dentro = cx >= 0 && cx < columnas && cy >= 0 && cy < filas;

  // La celda y las ocho de alrededor; si ninguna tiene puntos, se amplía.
  for (let radio = 1; dentro && radio <= 4 && mejor === -1; radio++) {
    for (let dy = -radio; dy <= radio; dy++) {
      const fila = cy + dy;
      if (fila < 0 || fila >= filas) continue;
      for (let dx = -radio; dx <= radio; dx++) {
        const columna = cx + dx;
        if (columna < 0 || columna >= columnas) continue;
        const lista = celdas.get(fila * columnas + columna);
        if (!lista) continue;
        for (const i of lista) {
          const ex = xs[i] - x, ey = ys[i] - y, d = ex * ex + ey * ey;
          if (d < distancia) { distancia = d; mejor = i; }
        }
      }
    }
  }

  if (mejor !== -1) return mejor;

  // Muy lejos de todo (un coche en el garaje de un circuito grande): se mira entero.
  for (let i = 0; i < xs.length; i++) {
    const ex = xs[i] - x, ey = ys[i] - y, d = ex * ex + ey * ey;
    if (d < distancia) { distancia = d; mejor = i; }
  }
  return mejor;
}

/**
 * Metros recorridos desde la salida por cada coche en cada instante.
 *
 * `NaN` donde no hay posición. Monótono: un coche no retrocede, y así el
 * ruido de la proyección no cambia el orden.
 */
export function calcularProgreso(bloque: BloqueDePosiciones, trazado: Trazado): Float64Array[] {
  const { datos, count, pilotos } = bloque;
  const L = trazado.longitud;

  return Array.from({ length: pilotos }, (_, piloto) => {
    const base = piloto * 2 * count;
    const salida = new Float64Array(count);
    let previo = NaN, acumulado = 0, primero = NaN;

    for (let k = 0; k < count; k++) {
      const x = datos[base + k];
      // `previo` NO se borra en un hueco: si el coche cruzó la meta mientras
      // no había posición, al volver sus metros son pequeños y sin la
      // comparación con el último valor conocido no se detectaría la vuelta.
      // El progreso se quedaría plano una vuelta entera y `estaFuera` lo daría
      // por retirado sin estarlo.
      if (x === SIN_DATO) { salida[k] = NaN; continue; }
      const d = trazado.ds[puntoMasCercano(trazado, x, datos[base + count + k])];

      if (!Number.isNaN(previo)) {
        if (d - previo < -L / 2) acumulado += L;
        else if (d - previo > L / 2) acumulado -= L;
      }

      salida[k] = acumulado + d;
      previo = d;
      if (Number.isNaN(primero)) primero = salida[k];
    }

    // En la parrilla los coches están DETRÁS de la meta, o sea al final del
    // trazado: sin esto, la salida ya contaría como una vuelta hecha.
    const desplazar = primero > L / 2 ? L : 0;
    let max = -Infinity;
    for (let k = 0; k < count; k++) {
      if (Number.isNaN(salida[k])) continue;
      salida[k] -= desplazar;
      if (salida[k] < max) salida[k] = max;
      else max = salida[k];
    }

    return salida;
  });
}

/**
 * Cuánto tiene que avanzar un coche para decir que ya arrancó: un metro.
 *
 * Las distancias del trazado vienen en decímetros. El progreso ya es monótono,
 * así que no hay ruido que filtrar; el umbral solo evita contar como arranque
 * un temblor de la proyección.
 */
const ARRANQUE = 10;

/**
 * El instante en que cada coche se mueve por primera vez, o `-1` si nunca.
 *
 * ## Para qué
 *
 * Quien sale **desde el pit lane** aparecía **líder desde el primer segundo**.
 * No es un fallo de la proyección: el pit lane está físicamente por delante de
 * la línea de meta, así que proyectarlo sobre el trazado da un número mayor que
 * el de toda la parrilla. Medido en España 2026: BEA salía proyectado en el
 * metro **549** mientras la parrilla estaba entre el 23 y el 170, y figuraba
 * primero durante los **doce primeros segundos**, hasta que el resto le pasaba
 * por encima.
 *
 * Lo que sí distingue a ese coche no es dónde está, es que **no se ha movido**:
 * espera en el pit lane a que pase la carrera. Y eso vale para el que se cala
 * en la parrilla igual de bien, sin tener que saber de dónde salió.
 *
 * ## Por qué no se usó la parrilla oficial
 *
 * Porque no lo dice. En la base, BEA tiene `grid = 22`, no el `0` con el que
 * otras fuentes marcan una salida desde el pit lane. Y lo geométrico —está 63 m
 * fuera de la línea de carrera— separa, pero el peor caso normal de Italia
 * estaba a 24 m: demasiado cerca para fiarse de un umbral con una sola muestra.
 */
export function arranques(progreso: Float64Array[]): Int32Array {
  const salida = new Int32Array(progreso.length).fill(-1);

  for (let i = 0; i < progreso.length; i++) {
    const suyo = progreso[i];
    let partida = Number.NaN;

    for (let k = 0; k < suyo.length; k++) {
      const p = suyo[k];
      if (Number.isNaN(p)) continue;
      if (Number.isNaN(partida)) {
        partida = p;
        continue;
      }
      if (p - partida > ARRANQUE) {
        salida[i] = k;
        break;
      }
    }
  }

  return salida;
}

/**
 * Los pilotos con posición en `k`, del primero al último.
 *
 * Con `arranques`, quien todavía no se ha movido va **detrás** de quien sí,
 * pase lo que pase con los metros. Es lo que impide que el que sale del pit
 * lane figure líder: está más adelante en el trazado, pero no ha empezado a
 * correr. Antes de que arranque nadie no cambia nada — están todos igual.
 */
export function ordenEn(progreso: Float64Array[], k: number, arrancados?: Int32Array): number[] {
  const orden: number[] = [];
  for (let i = 0; i < progreso.length; i++) if (!Number.isNaN(progreso[i][k])) orden.push(i);

  if (!arrancados) {
    orden.sort((a, b) => progreso[b][k] - progreso[a][k]);
    return orden;
  }

  /**
   * Cuenta como «ya va» quien arranca dentro de los cinco segundos siguientes.
   *
   * Sin esta holgura, en el primer instante no se ha movido nadie y el
   * desempate vuelve a los metros — con el del pit lane otra vez delante.
   * Medido en España 2026: la parrilla se pone en marcha entre 1,3 y 3,0 s, y
   * el del pit lane a los **20**. Cinco segundos separa de sobra las dos cosas
   * y dice lo que hay que decir: quien sale con la parrilla está en la carrera
   * aunque su coche aún no se haya movido; quien espera en el pit lane, no.
   */
  const GRACIA = 20;
  const yaVa = (i: number) => arrancados[i] >= 0 && arrancados[i] <= k + GRACIA;

  orden.sort((a, b) => {
    const va = yaVa(a);
    const vb = yaVa(b);
    if (va !== vb) return va ? -1 : 1;
    return progreso[b][k] - progreso[a][k];
  });

  return orden;
}

/**
 * Segundos que el líder lleva de ventaja a un coche: cuánto antes pasó el
 * líder por donde este coche está ahora. Es un hueco de verdad, no una regla
 * de tres con una velocidad supuesta.
 *
 * Se busca por bisección y no barriendo hacia atrás: la historia del líder es
 * monótona, así que el último instante en que estuvo por detrás se encuentra
 * en unos veinte pasos en vez de miles. Barrer costaba lo que durase el hueco,
 * por piloto y por cuarto de segundo, y con la carrera parada recorría la
 * parada entera.
 *
 * ## Por qué recibe un reloj
 *
 * El tiempo que se cuenta entre «el líder pasó por aquí» y «ahora» tiene que
 * ser tiempo de CARRERA. Contando el del calendario, una bandera roja entra
 * entera en todos los huecos: en la captura del usuario la parrilla marcaba
 * +1416 s repartidos en un rango de quince segundos, y la píldora ya decía
 * PISTA LIBRE. La inflación sobrevivía al reinicio porque los coches todavía no
 * habían pasado del progreso que el líder tenía al pararse.
 *
 * Con el reloj de `relojDeCarrera` sale constante y correcto en los tres
 * momentos: antes de la bandera, durante y después. Sin él —el reloj es
 * opcional— se comporta como siempre.
 */
export function huecoEn(
  progreso: Float64Array[],
  k: number,
  lider: number,
  piloto: number,
  paso: number,
  reloj?: Int32Array
): number {
  const p = progreso[piloto][k];
  if (piloto === lider || Number.isNaN(p)) return 0;

  const historia = progreso[lider];

  /** Instantes de carrera entre dos momentos, saltándose lo que no se corrió. */
  const entre = (desde: number, hasta: number) =>
    reloj ? reloj[hasta] - reloj[desde] : hasta - desde;

  // El líder ya estaba por delante en la salida: todo lo que se lleva corrido.
  if (Number.isNaN(historia[0]) || historia[0] >= p) return entre(0, k) * paso;

  let bajo = 0, alto = k;
  while (bajo < alto) {
    const medio = (bajo + alto + 1) >> 1;
    if (historia[medio] < p) bajo = medio;
    else alto = medio - 1;
  }

  // `bajo` es el último instante con el líder por detrás; en el siguiente ya
  // había pasado por aquí.
  return entre(bajo + 1, k) * paso;
}

/** En qué vuelta va un coche, desde 1. */
export function vueltaEn(progreso: Float64Array[], piloto: number, k: number, longitud: number): number {
  const p = progreso[piloto][k];
  if (Number.isNaN(p) || longitud <= 0) return 1;
  return Math.max(1, Math.floor(p / longitud) + 1);
}

/** Cuántos instantes quieto cuentan como haberse quedado fuera: un minuto. */
export const INSTANTES_QUIETO = 240;

/**
 * Cuánto tiene que durar un parón para considerarlo una detención de carrera.
 *
 * Treinta segundos. El reloj de carrera se queda plano también en instantes
 * sueltos —ruido de la proyección—, y eso no es una bandera roja. La de Italia
 * duró 1819 segundos.
 */
const PARADA_MINIMA = 120;

/**
 * Cuánto tiene que llevar parado un coche, al detenerse la carrera, para darlo
 * por retirado ya.
 *
 * Diez segundos, y el número no es de pulgar. Medido en Italia 2026 en el
 * instante exacto en que la carrera se detiene: **LEC llevaba 23,3 s sin
 * moverse y todos los demás 0,0 o 0,3**. Diez cae en mitad de ese hueco, muy
 * por encima del ruido y muy por debajo del único coche que de verdad estaba
 * fuera. También es más de lo que dura cualquier parada en boxes normal.
 */
const QUIETO_ANTES_DE_PARAR = 40;

/**
 * Para cada instante, cuándo empezó la última detención de carrera, o `-1`.
 *
 * Se calcula una vez y **sigue valiendo después del relanzamiento**: eso es lo
 * que permite que quien se quedó fuera antes de la roja siga fuera cuando los
 * demás arrancan, en vez de parpadear.
 */
export interface ParadaDeLaCarrera {
  /** Primer instante en que la carrera deja de avanzar. */
  desde: number;
  /** Primer instante en que vuelve a avanzar. */
  hasta: number;
}

/**
 * Los tramos en que la carrera estuvo detenida de verdad.
 *
 * El reloj de carrera se queda plano cuando nadie avanza, asi que sus mesetas
 * largas SON las paradas. Es la unica medida que no depende de que el dato
 * oficial siga declarando la roja: en Italia 2026 la declaro **103 segundos** y
 * la parada real duro **1819**.
 */
export function paradasDeLaCarrera(reloj: Int32Array): ParadaDeLaCarrera[] {
  const n = reloj.length;
  const paradas: ParadaDeLaCarrera[] = [];

  let k = 1;
  while (k < n) {
    if (reloj[k] === reloj[k - 1]) {
      const desde = k - 1;
      while (k < n && reloj[k] === reloj[desde]) k++;
      if (k - desde >= PARADA_MINIMA) paradas.push({ desde, hasta: k });
    } else {
      k++;
    }
  }

  return paradas;
}

/**
 * Para cada instante, cuando empezo la ultima parada vigente, o `-1`.
 *
 * **Sigue valiendo despues del relanzamiento**: eso es lo que permite que quien
 * se quedo fuera antes de la roja siga fuera cuando los demas arrancan, en vez
 * de parpadear.
 *
 * No se puede saber al empezar —un paron de dos segundos es ruido— ni hay que
 * esperar a que acabe, que es lo que hacia la primera version y dejaba a LEC
 * sin declarar hasta el minuto 35. Se sabe a los treinta segundos de empezar.
 */
export function inicioDeLaParada(reloj: Int32Array, paradas: ParadaDeLaCarrera[]): Int32Array {
  const salida = new Int32Array(reloj.length).fill(-1);

  let vigente = -1;
  let p = 0;
  for (let i = 0; i < salida.length; i++) {
    while (p < paradas.length && paradas[p].desde + PARADA_MINIMA <= i) vigente = paradas[p++].desde;
    salida[i] = vigente;
  }

  return salida;
}

/**
 * Si un coche se quedó fuera: lleva un minuto de CARRERA sin avanzar mientras
 * el líder sí avanza. Una parada en boxes son veinte o treinta segundos, no
 * sesenta.
 *
 * ## Por qué el minuto se cuenta en tiempo de carrera y no de reloj
 *
 * Sin el reloj, la ventana son los 240 instantes anteriores pase lo que pase.
 * Con una bandera roja eso es catastrófico: durante la parada no se mueve
 * nadie —líder incluido— así que no salta nada, pero **en cuanto el líder
 * arranca la vuelta de formación él ya avanza y los demás siguen con el
 * progreso plano de la parada**. Todos cumplen la condición a la vez.
 *
 * Medido en Italia 2026, contando quién pasa de dentro a fuera en cada
 * instante: en el minuto 35:32 salían **veintiún pilotos de golpe** —la
 * parrilla entera— y otros cinco en la parada de la parrilla del
 * relanzamiento. La torre se llenaba de OUT y el mapa disparaba veintiún
 * avisos de abandono con sus ondas. El usuario lo describió como «rarísimo».
 *
 * Con el reloj de carrera la ventana se salta la parada entera y mira a
 * cuando de verdad estaban rodando, donde los coches sí se movían. Quedan los
 * abandonos de verdad: LEC, ALO y STR.
 *
 * Es el tercer fallo de la misma familia —el delta que se inflaba con la roja
 * y el reloj que seguía corriendo con todos parados— y siempre por lo mismo:
 * medir tiempo de pared donde había que medir tiempo de carrera. El reloj es
 * opcional para no romper a quien no lo tenga; sin él se comporta como antes.
 */
export function estaFuera(
  progreso: Float64Array[],
  piloto: number,
  k: number,
  lider: number,
  reloj?: Int32Array,
  paradas?: Int32Array
): boolean {
  const p = progreso[piloto][k];
  if (Number.isNaN(p)) return true;
  if (piloto === lider) return false;

  /**
   * El que ya estaba parado cuando la carrera se detuvo.
   *
   * Sin esto, el minuto de carrera que exige la regla de abajo no se completa
   * hasta bastante después del relanzamiento: en Italia, LEC se paraba en el
   * minuto 4 y no se daba por retirado hasta el 36. El usuario lo dijo bien:
   * «estaría mal mostrar el DNF al minuto 36 ya que en realidad es al 5».
   *
   * Durante la detención no se mueve nadie, así que ahí no hay nada que
   * distinguir. Lo que sí distingue es **cuánto llevaba parado cada uno justo
   * antes**: 23,3 s LEC contra 0,0 de los demás.
   */
  if (paradas) {
    const inicio = paradas[k];
    const antesDeParar = inicio - QUIETO_ANTES_DE_PARAR;
    if (
      inicio >= 0 &&
      antesDeParar >= 0 &&
      progreso[piloto][k] === progreso[piloto][inicio] &&
      progreso[piloto][inicio] === progreso[piloto][antesDeParar]
    ) {
      return true;
    }
  }

  const antes = reloj ? instanteHaceUnMinutoDeCarrera(reloj, k) : k - INSTANTES_QUIETO;
  if (antes < 0) return false;

  const quieto = p === progreso[piloto][antes];
  const liderAvanza = progreso[lider][k] - progreso[lider][antes] > 0;
  return quieto && liderAvanza;
}

/**
 * El instante en que el reloj de carrera marcaba un minuto menos que ahora, o
 * `-1` si todavía no se ha corrido tanto.
 *
 * Por bisección y no barriendo hacia atrás: el reloj es monótono, así que se
 * encuentra en unos veinte pasos en vez de doscientos cuarenta, y esto se
 * llama por cada piloto y por cada instante que se pinta.
 */
function instanteHaceUnMinutoDeCarrera(reloj: Int32Array, k: number): number {
  const objetivo = reloj[k] - INSTANTES_QUIETO;
  if (objetivo < 0) return -1;

  let bajo = 0;
  let alto = k;
  while (bajo < alto) {
    const medio = (bajo + alto + 1) >> 1;
    if (reloj[medio] <= objetivo) bajo = medio;
    else alto = medio - 1;
  }
  return bajo;
}
