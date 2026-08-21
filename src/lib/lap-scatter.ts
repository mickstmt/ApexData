import { lapTimeToMs } from '@/lib/lap-times';
import type { LapData } from '@/types';

/**
 * Los datos de la dispersión de tiempos por vuelta.
 *
 * La pregunta que responde el gráfico no es «quién fue más rápido» —eso ya lo
 * dice la tabla de vueltas rápidas— sino **cómo de constante fue cada uno**: una
 * nube apretada es un piloto que repite ritmo, una nube dispersa es tráfico,
 * errores o neumáticos que se caen.
 */

export interface PuntoVuelta {
  code: string;
  vuelta: number;
  /** Tiempo de la vuelta en milisegundos. */
  ms: number;
}

export interface ResumenPiloto {
  code: string;
  vueltas: number;
  mejor: number;
  mediana: number;
  /**
   * Rango intercuartílico: la mitad central de sus vueltas cabe en esta
   * horquilla. Se usa en vez de la desviación típica porque una sola parada en
   * boxes dispara la desviación y no dice nada del ritmo.
   */
  intercuartil: number;
}

export interface Dispersion {
  /** Todas las vueltas con tiempo legible. */
  puntos: PuntoVuelta[];
  /** Las que caben en la escala. */
  visibles: PuntoVuelta[];
  /** Cuántas se salen, para poder decirlo en vez de esconderlo. */
  fuera: number;
  /** La vuelta más rápida de la sesión, en milisegundos. */
  mejor: number;
  /** El techo de la escala. */
  techo: number;
  totalVueltas: number;
  pilotos: string[];
}

/**
 * Dónde se corta el eje vertical.
 *
 * Elegido midiendo, no a ojo: sobre la carrera de Baréin 2024 (1.127 vueltas de
 * 20 pilotos), cortar al 105 % deja fuera el 46 % —las primeras vueltas con
 * depósito lleno son legítimamente lentas—, al 107 % el 12 %, al 110 % el 5,2 %
 * y al 115 % el 4,2 %. Que entre 110 y 115 apenas cambie nada significa que ese
 * ~4 % son las paradas de verdad: 20 pilotos por dos paradas es un 3,5 %.
 *
 * Así que el 110 % deja fuera boxes y coche de seguridad sin recortar una sola
 * vuelta de carrera.
 */
export const CORTE = 1.1;

export function prepararDispersion(laps: LapData[]): Dispersion {
  const puntos: PuntoVuelta[] = [];
  let totalVueltas = 0;

  for (const lap of laps) {
    totalVueltas = Math.max(totalVueltas, lap.LapNumber ?? 0);

    const ms = lapTimeToMs(lap.LapTime);
    if (!lap.Driver || !lap.LapNumber || ms === null) continue;

    puntos.push({ code: lap.Driver, vuelta: lap.LapNumber, ms });
  }

  if (puntos.length === 0) {
    return { puntos, visibles: [], fuera: 0, mejor: 0, techo: 0, totalVueltas, pilotos: [] };
  }

  const mejor = Math.min(...puntos.map((p) => p.ms));
  const techo = mejor * CORTE;
  const visibles = puntos.filter((p) => p.ms <= techo);

  return {
    puntos,
    visibles,
    fuera: puntos.length - visibles.length,
    mejor,
    techo,
    totalVueltas,
    pilotos: [...new Set(puntos.map((p) => p.code))].sort(),
  };
}

/** El valor en un percentil, interpolando entre los dos vecinos. */
function percentil(ordenados: number[], p: number): number {
  if (ordenados.length === 1) return ordenados[0];

  const posicion = (ordenados.length - 1) * p;
  const bajo = Math.floor(posicion);
  const alto = Math.ceil(posicion);

  if (bajo === alto) return ordenados[bajo];

  return ordenados[bajo] + (ordenados[alto] - ordenados[bajo]) * (posicion - bajo);
}

/**
 * El resumen de un piloto, calculado **solo con sus vueltas visibles**.
 *
 * Con las de boxes dentro, la mediana se desplaza y el intercuartílico se
 * dispara: el resumen hablaría de sus paradas en vez de su ritmo.
 */
export function resumirPiloto(visibles: PuntoVuelta[], code: string): ResumenPiloto | null {
  const suyas = visibles.filter((p) => p.code === code).map((p) => p.ms);
  if (suyas.length === 0) return null;

  const ordenados = [...suyas].sort((a, b) => a - b);

  return {
    code,
    vueltas: ordenados.length,
    mejor: ordenados[0],
    mediana: percentil(ordenados, 0.5),
    intercuartil: percentil(ordenados, 0.75) - percentil(ordenados, 0.25),
  };
}

/** De milisegundos a «1:32.608», que es como se leen los tiempos de vuelta. */
export function comoTiempo(ms: number): string {
  const total = ms / 1000;
  const minutos = Math.floor(total / 60);
  const segundos = total - minutos * 60;

  if (minutos === 0) return segundos.toFixed(3);

  return `${minutos}:${segundos.toFixed(3).padStart(6, '0')}`;
}
