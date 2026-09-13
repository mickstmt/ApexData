/**
 * El final de la carrera: cuándo cae la bandera a cuadros y en qué orden queda
 * la clasificación.
 *
 * ## Por qué hace falta
 *
 * El replay ordena por metros recorridos, y eso deja de valer en cuanto cae la
 * bandera. Medido contra el resultado oficial, mirando el último instante del
 * replay en tres carreras de 2026:
 *
 * | carrera      | orden por metros | orden por cruces de meta |
 * |--------------|------------------|--------------------------|
 * | Hungría      | 8 fallos de 10   | 2 de 10                  |
 * | Países Bajos | 5 de 10          | 0                        |
 * | Italia       | 4 de 10          | 0                        |
 *
 * La causa es que la bandera cae entre 66 y 79 segundos ANTES del final de los
 * datos: ese minuto largo es la vuelta de celebración. El ganador levanta el
 * pie, los de atrás siguen rodando y le comen metros, y el replay termina
 * enseñando un podio que no es. En Italia el oficial era ANT-RUS-VER-NOR y el
 * replay al final daba VER-NOR-ANT-RUS.
 *
 * ## Qué manda
 *
 * El **resultado oficial** cuando existe, porque es el único que sabe de
 * sanciones: en Hungría HAM cruzó antes que LEC —6015,9 contra 6020,2— pero
 * oficialmente LEC es cuarto. Los cruces no pueden saber eso.
 *
 * Y los **cruces de meta** cuando no hay oficial todavía: una carrera recién
 * terminada tiene posiciones antes que resultados en la base, y 0 a 2 fallos
 * de 10 es infinitamente mejor que 4 a 8.
 */

/** Fracción de la línea de tiempo a partir de la cual un cruce puede ser la bandera. */
const MINIMO_PARA_SER_LA_BANDERA = 0.7;

/** Lo que hace falta de cada piloto: su código y cuándo cruzó cada vuelta. */
export interface PilotoDelFinal {
  code: string;
  laps: number[];
}

/** Un puesto de la clasificación oficial, tal y como lo guarda la base. */
export interface PuestoOficial {
  code: string;
  /** `1:51:15.281` para el ganador, `+3.857` para el resto, o nada. */
  tiempo: string | null;
}

export interface FinalDeCarrera {
  /** Instante en que cae la bandera a cuadros: el último cruce del ganador. */
  bandera: number;
  /** Segundos de sesión de ese instante, sin redondear al paso. */
  banderaEnSegundos: number;
  /** Los pilotos por índice, en el orden en que quedan clasificados. */
  orden: number[];
  /**
   * Lo que enseña la columna de tiempos al terminar, por índice de piloto.
   *
   * Manda el tiempo oficial, y no el que se puede medir aquí, porque es el
   * único coherente con la posición que se está enseñando: en Hungría 2026 HAM
   * cruzó 4,3 s antes que LEC y sin embargo sale quinto, porque le cayeron
   * cinco segundos de sanción. Con el hueco medido en pista, la torre diría
   * que el quinto llegó antes que el cuarto.
   */
  llegada: string[];
  /**
   * Instante en que cada piloto toma la bandera, o `Infinity` si no la tomó.
   *
   * Un retirado también tiene un último cruce, pero muy anterior al del
   * ganador; por eso el corte es «su último cruce es posterior a la bandera» y
   * no «tiene cruces». Todo el que sigue en pista cuando el líder recibe la
   * bandera da una vuelta más y la recibe también.
   */
  cruce: Float64Array;
}

/**
 * Calcula el final, o `null` si esta sesión no lo tiene: sin cruces de meta no
 * hay bandera que dar, y entonces el replay se comporta como siempre.
 *
 * `ordenOficial` son los códigos de piloto en el orden de la clasificación
 * oficial, incluidos los retirados. Los que no aparezcan —un piloto que la
 * base no tenga— se ponen detrás por cruces, en vez de desaparecer.
 */
export function finalDeCarrera(
  pilotos: PilotoDelFinal[],
  timeline: { step: number; count: number },
  oficial: PuestoOficial[] | null
): FinalDeCarrera | null {
  const { step: paso, count } = timeline;
  if (!pilotos.length || paso <= 0 || count <= 0) return null;

  const vueltas = pilotos.map((p) => p.laps.length);
  const ultimo = pilotos.map((p) => (p.laps.length ? p.laps[p.laps.length - 1] : Number.NaN));
  if (!vueltas.some((v) => v > 0)) return null;

  // El ganador en pista: el que más vueltas dio y, entre esos, el que antes
  // cruzó por última vez.
  const porCruces = pilotos
    .map((_, i) => i)
    .filter((i) => vueltas[i] > 0)
    .sort((a, b) => vueltas[b] - vueltas[a] || ultimo[a] - ultimo[b]);

  const ganador = porCruces[0];
  const banderaEnSegundos = ultimo[ganador];

  /**
   * La bandera tiene que caer cerca del final de los datos, o no es la bandera.
   *
   * Un replay siempre termina poco después de la carrera: medido, la bandera
   * cae en el 98,8 %, el 99,1 % y el 98,9 % de la línea de tiempo. Si los
   * cruces dicen que la carrera acabó a mitad del replay, esos cruces no son
   * de estos datos —una sesión recortada, unas vueltas mal leídas— y congelar
   * la torre ahí sería peor que no tocarla: se quedaría quieta media carrera.
   *
   * El listón está en el 70 % y no en el 95 % a propósito: separa de sobra lo
   * medido de lo absurdo sin depender de que el final se haya cortado fino.
   */
  const duracion = (count - 1) * paso;
  if (duracion > 0 && banderaEnSegundos < duracion * MINIMO_PARA_SER_LA_BANDERA) return null;

  const bandera = Math.min(count - 1, Math.max(0, Math.round(banderaEnSegundos / paso)));

  // Recortado a la línea de tiempo: el último cruce puede caer unas décimas
  // DESPUÉS del último instante —medido en Italia 2026, el decimoquinto cruzó
  // en 6754,37 y los datos terminan en 6754,25— y entonces su banderita no
  // llegaba a salir nunca, ni con el replay en el final.
  const cruce = new Float64Array(pilotos.length).fill(Number.POSITIVE_INFINITY);
  for (let i = 0; i < pilotos.length; i++) {
    if (vueltas[i] > 0 && ultimo[i] >= banderaEnSegundos) cruce[i] = Math.min(ultimo[i], duracion);
  }

  // Los que no cruzaron van detrás, y entre ellos el que más lejos llegó
  // primero; es donde los deja también el orden por metros.
  const sinCruzar = pilotos
    .map((_, i) => i)
    .filter((i) => !porCruces.includes(i))
    .sort((a, b) => vueltas[b] - vueltas[a]);

  const porPista = [...porCruces, ...sinCruzar];
  const orden = ordenar(pilotos, porPista, oficial);

  // La columna de tiempos al terminar: el oficial si lo hay, y si no el hueco
  // de verdad entre esta bandera y la del ganador.
  const tiempos = new Map(oficial?.map((p) => [p.code, p.tiempo]) ?? []);
  const maxVueltas = vueltas[ganador];
  const llegada = pilotos.map((p, i) => {
    if (!Number.isFinite(cruce[i])) return '';
    if (i === orden[0]) return 'líder';
    const abajo = maxVueltas - vueltas[i];
    if (abajo >= 1) return abajo === 1 ? '+1 vuelta' : `+${abajo} vueltas`;
    // Con `ultimo` y no con `cruce`: el hueco es el de verdad, aunque su
    // bandera caiga unas décimas después del último instante del replay.
    return textoDeLlegada(tiempos.get(p.code) ?? null, ultimo[i] - banderaEnSegundos);
  });

  return { bandera, banderaEnSegundos, orden, cruce, llegada };
}

/**
 * El hueco con el que se termina, con un decimal como el resto de la torre.
 *
 * El oficial viene como `+3.857` y, pasado el minuto, como `+1:05.187`; el del
 * ganador es su tiempo total y no un hueco, así que no empieza por `+` y aquí
 * no se usa.
 */
function textoDeLlegada(oficial: string | null, medido: number): string {
  const delOficial = segundosDeHueco(oficial?.trim() ?? '');
  const segundos = Number.isFinite(delOficial) ? delOficial : medido;
  return Number.isFinite(segundos) ? `+${segundos.toFixed(1)}s` : '';
}

/**
 * Los segundos de un hueco oficial, o `NaN` si eso no es un hueco.
 *
 * Estricto a propósito. `parseFloat('1:05.187')` devuelve **1**, y con eso el
 * undécimo de Italia 2026 —que terminó a 1:05 del ganador— aparecía en la
 * torre con `+1.0s`, por delante del décimo.
 */
function segundosDeHueco(texto: string): number {
  const partes = /^\+(?:(\d+):)?(\d{1,2}(?:\.\d+)?)$/.exec(texto);
  if (!partes) return Number.NaN;
  return (partes[1] ? Number(partes[1]) * 60 : 0) + Number(partes[2]);
}

/** El oficial manda; lo que no esté en él se añade detrás, por cruces. */
function ordenar(pilotos: PilotoDelFinal[], porPista: number[], oficial: PuestoOficial[] | null): number[] {
  if (!oficial?.length) return porPista;

  const porCodigo = new Map<string, number>();
  pilotos.forEach((p, i) => porCodigo.set(p.code, i));

  const orden: number[] = [];
  const puestos = new Set<number>();
  for (const { code } of oficial) {
    const i = porCodigo.get(code);
    if (i === undefined || puestos.has(i)) continue;
    orden.push(i);
    puestos.add(i);
  }

  // Un oficial que no reconoce a casi nadie es un oficial de otra carrera o de
  // otra numeración: mejor los cruces, que al menos son de estos datos.
  if (orden.length < porPista.length / 2) return porPista;

  for (const i of porPista) if (!puestos.has(i)) orden.push(i);
  return orden;
}

/** El instante de la línea de tiempo que le toca a un segundo dado. */
export function instanteDe(segundos: number, paso: number, count: number): number {
  if (!Number.isFinite(segundos) || paso <= 0) return count - 1;
  return Math.min(count - 1, Math.max(0, Math.round(segundos / paso)));
}
