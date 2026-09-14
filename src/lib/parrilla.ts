import { prisma } from '@/lib/prisma';

/**
 * Quién es cada piloto, buscándolo por sus tres letras.
 *
 * ## Para qué
 *
 * Las prácticas y la clasificación al sprint no vienen de Jolpica sino de
 * FastF1, y FastF1 manda de cada vuelta **tres letras y el nombre del equipo**.
 * Nada más. Por eso esas dos tablas salían sin foto, sin dorsal, sin bandera y
 * con «VER» en vez de «Max Verstappen»: no era una decisión de diseño, es que
 * nadie cruzó ese código con la ficha que ya tenemos guardada.
 *
 * Este directorio hace ese cruce una vez por página. Son veintidós entradas.
 *
 * ## De dónde salen las fichas
 *
 * Dos fuentes, en este orden:
 *
 * 1. **La propia carrera**, si ya tiene resultados o clasificación. Es la más
 *    exacta: dice con qué equipo corrió cada piloto **ese** fin de semana, que
 *    es lo que hay que enseñar en las prácticas de ese mismo fin de semana.
 * 2. **La última ronda de la temporada que sí tenga resultados.** Hace falta
 *    porque el viernes de un gran premio la carrera aún no ha corrido y la
 *    primera fuente está vacía — que es justo cuando se miran las prácticas.
 *
 * Quien no aparezca en ninguna —un piloto de una sola sesión de viernes, que
 * los hay— se queda con sus tres letras y sin foto. Es la degradación honesta:
 * mejor tres letras que una ficha de otro.
 */

export interface FichaDePiloto {
  driverId: string;
  nombre: string;
  foto: string | null;
  nacion: string;
  dorsal: number | null;
  equipo: string;
  equipoId: string;
  equipoNacion: string;
}

/** El directorio, con las tres letras en mayúsculas como clave. */
export type DirectorioDePilotos = Record<string, FichaDePiloto>;

/** Lo mínimo que hace falta de una entrada de resultados para armar una ficha. */
interface Entrada {
  driver: {
    driverId: string;
    givenName: string;
    familyName: string;
    code: string | null;
    permanentNumber: number | null;
    nationality: string;
    imageUrl: string | null;
  };
  team: { name: string; constructorId: string; nationality: string };
}

/**
 * El directorio a partir de varias listas, en orden de preferencia.
 *
 * Puro y exportado para poder probarlo: la regla que importa —que la primera
 * fuente gane, porque dice con qué equipo corrió ese fin de semana— no se ve
 * mirando el código y sí se rompe sin querer.
 */
export function construirDirectorio(...fuentes: Entrada[][]): DirectorioDePilotos {
  const directorio: DirectorioDePilotos = {};
  for (const fuente of fuentes) fichar(directorio, fuente);
  return directorio;
}

/** Lo que hace falta de una entrada, para que las pruebas no armen un Prisma entero. */
export type EntradaDeParrilla = Entrada;

function fichar(destino: DirectorioDePilotos, entradas: Entrada[]) {
  for (const { driver, team } of entradas) {
    // Sin código no hay por dónde buscarlo: FastF1 no manda otra cosa.
    if (!driver.code) continue;

    const clave = driver.code.toUpperCase();
    // El primero que llega manda, y por eso el orden de las fuentes importa:
    // la del propio fin de semana entra antes que la de la última ronda.
    if (destino[clave]) continue;

    destino[clave] = {
      driverId: driver.driverId,
      nombre: `${driver.givenName} ${driver.familyName}`,
      foto: driver.imageUrl,
      nacion: driver.nationality,
      dorsal: driver.permanentNumber,
      equipo: team.name,
      equipoId: team.constructorId,
      equipoNacion: team.nationality,
    };
  }
}

const SELECCION = {
  driver: {
    select: {
      driverId: true,
      givenName: true,
      familyName: true,
      code: true,
      permanentNumber: true,
      nationality: true,
      imageUrl: true,
    },
  },
  team: { select: { name: true, constructorId: true, nationality: true } },
} as const;

export async function directorioDePilotos(
  year: number,
  propias: Entrada[]
): Promise<DirectorioDePilotos> {
  const directorio = construirDirectorio(propias);

  try {
    // La última ronda del año que tenga resultados. Se pide su número primero
    // para no traerse la temporada entera y quedarse con veintidós filas.
    const ultima = await prisma.result.findFirst({
      where: { race: { year } },
      orderBy: { race: { round: 'desc' } },
      select: { race: { select: { round: true } } },
    });

    if (ultima) {
      const parrilla = await prisma.result.findMany({
        where: { race: { year, round: ultima.race.round } },
        select: SELECCION,
      });
      fichar(directorio, parrilla);
    }
  } catch (error) {
    // Un directorio incompleto degrada a tres letras; no vale la pena tumbar
    // la página de una carrera porque falle esta consulta de adorno.
    console.error('No se pudo completar el directorio de pilotos:', error);
  }

  return directorio;
}

/** Lo que se enseña de alguien a quien no se encontró: sus tres letras. */
export function fichaDesconocida(codigo: string, equipo: string | null | undefined): FichaDePiloto {
  return {
    driverId: '',
    nombre: codigo,
    foto: null,
    nacion: '',
    dorsal: null,
    equipo: equipo ?? '—',
    equipoId: '',
    equipoNacion: '',
  };
}
