import { lapTimeToMs } from '@/lib/lap-times';
import type { LapData } from '@/types';

/**
 * Cuánto se cae cada compuesto conforme se gasta.
 *
 * Es la pregunta que decide una estrategia: no cuál es el neumático más rápido
 * cuando es nuevo —eso ya se sabe— sino **cuánto tiempo pierde por vuelta**
 * mientras envejece, porque de ahí sale si compensa parar antes o aguantar.
 *
 * Dos avisos que hay que dar al leer estos números y que no se pueden calcular
 * aquí:
 *
 * - **El depósito empuja al revés.** El coche se aligera vuelta a vuelta y eso
 *   resta unas centésimas por vuelta, así que la caída de la goma es mayor que
 *   la que se dibuja: lo que se ve es el saldo de las dos fuerzas.
 * - **Cada tanda tiene su historia.** Tráfico, coche de seguridad o un piloto
 *   administrando falsean su pendiente; por eso se resume con la **mediana** de
 *   las tandas y no con la media.
 */

export interface VueltaDeTanda {
  /** Vueltas de vida del neumático, que es el eje que importa. */
  vida: number;
  /** Segundos perdidos respecto a la primera vuelta buena de esa tanda. */
  delta: number;
}

export interface TandaDeCompuesto {
  code: string;
  compuesto: string;
  vueltas: VueltaDeTanda[];
  /** Segundos por vuelta. Positivo es perder tiempo. */
  pendiente: number;
}

export interface CaidaDeCompuesto {
  compuesto: string;
  /** La mediana de las pendientes de sus tandas, en segundos por vuelta. */
  pendiente: number;
  tandas: number;
  vueltas: VueltaDeTanda[];
  /** Hasta dónde llegó la tanda más larga con ese compuesto. */
  vidaMaxima: number;
}

/** Cuántas vueltas buenas necesita una tanda para que su pendiente signifique algo. */
const MINIMO_VUELTAS = 5;

/**
 * Ajuste por mínimos cuadrados: la recta que mejor sigue a los puntos.
 *
 * Devuelve solo la pendiente, que es lo único que se usa: la ordenada en el
 * origen no dice nada porque cada tanda ya está referida a su primera vuelta.
 */
function pendienteDe(vueltas: VueltaDeTanda[]): number {
  const n = vueltas.length;
  const sumaX = vueltas.reduce((s, v) => s + v.vida, 0);
  const sumaY = vueltas.reduce((s, v) => s + v.delta, 0);
  const sumaXY = vueltas.reduce((s, v) => s + v.vida * v.delta, 0);
  const sumaXX = vueltas.reduce((s, v) => s + v.vida * v.vida, 0);

  const denominador = n * sumaXX - sumaX * sumaX;
  if (denominador === 0) return 0;

  return (n * sumaXY - sumaX * sumaY) / denominador;
}

function mediana(valores: number[]): number {
  const ordenados = [...valores].sort((a, b) => a - b);
  const medio = Math.floor(ordenados.length / 2);

  return ordenados.length % 2 === 0
    ? (ordenados[medio - 1] + ordenados[medio]) / 2
    : ordenados[medio];
}

/**
 * Reparte las vueltas en tandas y calcula la pendiente de cada una.
 *
 * Se descartan las vueltas que FastF1 marca como no fiables (`IsAccurate`) y
 * las de entrada y salida de boxes: una vuelta con parada mide veinte segundos
 * de más y por sí sola inclinaría la recta entera.
 */
export function tandasPorCompuesto(laps: LapData[]): TandaDeCompuesto[] {
  const porTanda = new Map<string, { code: string; compuesto: string; crudas: { vida: number; ms: number }[] }>();

  for (const lap of laps) {
    if (!lap.Driver || lap.Stint == null || !lap.Compound || lap.TyreLife == null) continue;
    if (lap.IsAccurate === false) continue;
    if (lap.PitInTime || lap.PitOutTime) continue;

    const ms = lapTimeToMs(lap.LapTime);
    if (ms === null) continue;

    const clave = `${lap.Driver}-${lap.Stint}`;
    const tanda = porTanda.get(clave) ?? {
      code: lap.Driver,
      compuesto: lap.Compound.toUpperCase(),
      crudas: [],
    };

    tanda.crudas.push({ vida: lap.TyreLife, ms });
    porTanda.set(clave, tanda);
  }

  const tandas: TandaDeCompuesto[] = [];

  for (const { code, compuesto, crudas } of porTanda.values()) {
    if (crudas.length < MINIMO_VUELTAS) continue;

    // Referidas a la primera vuelta de la tanda: así dos coches de ritmo
    // distinto se pueden comparar, porque lo que se mide es cuánto se cae cada
    // uno respecto a sí mismo.
    const ordenadas = [...crudas].sort((a, b) => a.vida - b.vida);
    const referencia = ordenadas[0].ms;

    const vueltas = ordenadas.map(({ vida, ms }) => ({
      vida,
      delta: (ms - referencia) / 1000,
    }));

    tandas.push({ code, compuesto, vueltas, pendiente: pendienteDe(vueltas) });
  }

  return tandas;
}

/** Agrupa las tandas por compuesto y resume su caída con la mediana. */
export function caidaPorCompuesto(laps: LapData[]): CaidaDeCompuesto[] {
  const tandas = tandasPorCompuesto(laps);
  const porCompuesto = new Map<string, TandaDeCompuesto[]>();

  for (const tanda of tandas) {
    porCompuesto.set(tanda.compuesto, [...(porCompuesto.get(tanda.compuesto) ?? []), tanda]);
  }

  return [...porCompuesto.entries()]
    .map(([compuesto, suyas]) => ({
      compuesto,
      pendiente: mediana(suyas.map((t) => t.pendiente)),
      tandas: suyas.length,
      vueltas: suyas.flatMap((t) => t.vueltas),
      vidaMaxima: Math.max(...suyas.flatMap((t) => t.vueltas.map((v) => v.vida))),
    }))
    // De más blando a más duro, que es el orden en que se entienden.
    .sort((a, b) => ORDEN.indexOf(a.compuesto) - ORDEN.indexOf(b.compuesto));
}

const ORDEN = ['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET'];

/** «+0,08 s por vuelta», que es como se dice esto en una retransmisión. */
export function comoCaida(segundosPorVuelta: number): string {
  const signo = segundosPorVuelta >= 0 ? '+' : '−';
  return `${signo}${Math.abs(segundosPorVuelta).toFixed(3)} s/vuelta`;
}
