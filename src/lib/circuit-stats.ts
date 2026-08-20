/**
 * El historial de un circuito: quién ha ganado aquí y desde dónde salió.
 *
 * Este módulo es **puro a propósito**: no importa Prisma ni nada de servidor,
 * porque la tabla de móvil —que es un componente de cliente— usa
 * `contarSalida`. Cuando esto vivía junto a la consulta, la ficha se
 * descargaba 64 KB con el cliente de Prisma dentro; ninguna otra página lo
 * hacía. La consulta vive al lado, en `circuit-history.ts`.
 *
 * La ficha se construye solo con lo que la base guarda de verdad. Las
 * columnas de especificaciones del circuito —longitud, curvas, zonas DRS,
 * récord de vuelta— están vacías en los 36 trazados con carreras, así que no
 * se enseñan: una ficha llena de guiones dice menos que una ficha corta.
 *
 * Lo que sí hay son dieciséis temporadas de resultados, y con ellas se puede
 * responder a la pregunta que distingue a un circuito de otro: **¿aquí se
 * adelanta?** La parrilla del ganador lo cuenta mejor que ninguna
 * especificación —Mónaco y Monza dan números opuestos—.
 */

export interface VictoriaEnCircuito {
  year: number;
  round: number;
  raceName: string;
  driverId: string;
  driver: string;
  teamId: string;
  team: string;
  /** Puesto de salida. **0 significa desde el pit lane**, no la posición cero. */
  grid: number;
  time: string | null;
}

export interface Racha {
  id: string;
  nombre: string;
  victorias: number;
}

export interface ResumenDeCircuito {
  pilotos: Racha[];
  equipos: Racha[];
  /** Porcentaje de victorias logradas saliendo desde la primera plaza, redondeado. */
  desdeLaPole: number | null;
  /** Parrilla media del ganador. Excluye las salidas desde el pit lane. */
  gridMedio: number | null;
  /** La victoria desde más atrás. Una desde el pit lane gana a cualquier parrilla. */
  remontada: VictoriaEnCircuito | null;
}

/**
 * «Desde la pole», «desde 7.º» o «desde el pit lane».
 *
 * Vive aquí y no junto a la tabla de móvil porque la ficha —que es de
 * servidor— también lo dice en su frase de la remontada, y una función
 * exportada desde un módulo `'use client'` no se puede llamar desde el
 * servidor: no lo ve ni el tipado ni el lint ni la compilación, solo estalla
 * al abrir la página.
 */
export function contarSalida(grid: number): string {
  if (grid === 0) return 'desde el pit lane';
  if (grid === 1) return 'desde la pole';
  return `desde ${grid}.º`;
}

/** Cuánto hay que remontar. El pit lane se ordena por detrás de cualquier parrilla. */
function distanciaRemontada(grid: number): number {
  return grid === 0 ? Number.POSITIVE_INFINITY : grid;
}

function contar(
  victorias: VictoriaEnCircuito[],
  id: (v: VictoriaEnCircuito) => string,
  nombre: (v: VictoriaEnCircuito) => string
): Racha[] {
  const cuenta = new Map<string, Racha>();

  for (const victoria of victorias) {
    const clave = id(victoria);
    const anotado = cuenta.get(clave);
    if (anotado) anotado.victorias += 1;
    else cuenta.set(clave, { id: clave, nombre: nombre(victoria), victorias: 1 });
  }

  // Empate resuelto por nombre para que el orden no dependa de cómo llegaron
  // las filas: dos visitas seguidas tienen que enseñar la misma lista.
  return [...cuenta.values()].sort(
    (a, b) => b.victorias - a.victorias || a.nombre.localeCompare(b.nombre, 'es')
  );
}

/**
 * Los años en que este circuito acogió más de una carrera.
 *
 * Cuatro veces ha pasado —Red Bull Ring en 2020 y 2021, Silverstone y Baréin
 * en 2020— y entonces dos filas comparten año, ganador y equipo: sin el nombre
 * del gran premio, el historial enseña lo que parece la misma carrera dos
 * veces. Solo se nombra en esos años; ponerlo en todos sería ruido.
 */
export function añosRepetidos(victorias: VictoriaEnCircuito[]): Set<number> {
  const vistos = new Set<number>();
  const repetidos = new Set<number>();

  for (const v of victorias) {
    if (vistos.has(v.year)) repetidos.add(v.year);
    vistos.add(v.year);
  }

  return repetidos;
}

export function resumirVictorias(victorias: VictoriaEnCircuito[]): ResumenDeCircuito {
  if (victorias.length === 0) {
    return { pilotos: [], equipos: [], desdeLaPole: null, gridMedio: null, remontada: null };
  }

  const desdeParrilla = victorias.filter((v) => v.grid > 0);

  const remontada = victorias.reduce((peor, v) =>
    distanciaRemontada(v.grid) > distanciaRemontada(peor.grid) ? v : peor
  );

  return {
    pilotos: contar(
      victorias,
      (v) => v.driverId,
      (v) => v.driver
    ),
    equipos: contar(
      victorias,
      (v) => v.teamId,
      (v) => v.team
    ),
    desdeLaPole: Math.round((victorias.filter((v) => v.grid === 1).length / victorias.length) * 100),
    gridMedio:
      desdeParrilla.length > 0
        ? Math.round(
            (desdeParrilla.reduce((suma, v) => suma + v.grid, 0) / desdeParrilla.length) * 10
          ) / 10
        : null,
    // Ganar saliendo primero no es una remontada; solo se cuenta como tal si
    // alguien salió por detrás alguna vez.
    remontada: distanciaRemontada(remontada.grid) > 1 ? remontada : null,
  };
}
