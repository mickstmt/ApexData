import type { FilaDeSesion } from '@/services/openf1/tipos';

/**
 * La clasificación de una sesión, tal y como la da FastF1.
 *
 * ## Por qué existe
 *
 * Los avisos salían de OpenF1, y con OpenF1 hay que esperar. Ellos consideran
 * «en directo» —y de pago— desde treinta minutos antes de empezar hasta treinta
 * después de terminar, así que antes de ese momento no hay nada que pedirles:
 * de ahí los 35 minutos de espera que lleva `ventana.ts`.
 *
 * Medido durante el GP de España 2026, desde que baja la bandera hasta que cada
 * fuente tiene los datos:
 *
 * | Sesión | FastF1 | OpenF1 |
 * |---|---|---|
 * | **Carrera** | **9m 57s** | 46m 44s |
 * | Clasificación | 25m 00s | 30m 59s |
 * | Práctica 3 | 42m 57s | 49m 56s |
 *
 * El caso real que lo cierra: la carrera terminó a las 15:00 UTC y el aviso le
 * llegó al usuario a las **15:50:38** — cincuenta minutos, que se descomponen
 * en los 35 de espera, los 12 que tardó OpenF1 en publicar, y el barrido.
 *
 * ## Lo que NO sirve, y hay que decirlo
 *
 * En **prácticas**, `session.results` de FastF1 trae las 22 filas pero con
 * `Position` a nulo y sin tiempos: no hay clasificación que leer. Comprobado
 * contra el servicio con la FP1 de España. El experimento de la carrera de
 * fuentes contaba filas, no resultados, así que su medida de las prácticas
 * decía «la sesión ya carga», no «ya hay clasificación».
 *
 * Por eso esto devuelve `null` cuando lo que llega no sirve, y quien llama
 * vuelve a OpenF1. El peor caso es el comportamiento de siempre, nunca un aviso
 * equivocado.
 */

/** Las columnas de `session.results` que se usan. Verificadas contra el servicio. */
interface FilaCruda {
  Position?: number | null;
  ClassifiedPosition?: string | null;
  Abbreviation?: string | null;
  FullName?: string | null;
  BroadcastName?: string | null;
  TeamName?: string | null;
  TeamColor?: string | null;
  DriverNumber?: string | number | null;
  Time?: string | null;
  Status?: string | null;
  Points?: number | null;
  Q1?: string | null;
  Q2?: string | null;
  Q3?: string | null;
}

/**
 * Cuántas filas tienen que traer posición para fiarse.
 *
 * La mitad. Con menos, o son las filas vacías de una práctica o es una sesión a
 * medio publicar, y en los dos casos es mejor esperar a OpenF1 que inventar un
 * orden.
 */
const MINIMO_CON_PUESTO = 0.5;

/**
 * `1:26.746` o `4.351` o `94:23.754` en segundos, o `null` si no es un tiempo.
 *
 * FastF1 los manda ya formateados por el servicio, que convierte los
 * `Timedelta` a texto antes de serializar.
 */
export function segundosDeTiempo(texto: string | null | undefined): number | null {
  if (!texto) return null;
  const partes = /^(?:(\d+):)?(\d{1,2}(?:\.\d+)?)$/.exec(texto.trim());
  if (!partes) return null;
  const minutos = partes[1] ? Number(partes[1]) : 0;
  const segundos = Number(partes[2]);
  return Number.isFinite(minutos) && Number.isFinite(segundos) ? minutos * 60 + segundos : null;
}

/**
 * Cómo acabó cada uno, leyendo `ClassifiedPosition`.
 *
 * Es texto y trae una letra cuando no hay puesto: `R` retirado, `D`
 * descalificado, `E` excluido, `W` quien ni tomó la salida, `N` sin clasificar.
 * Se mira esta y no `Status`, que lleva la CAUSA —«Retired», «Accident»,
 * «Engine»— y no un juego cerrado de valores. Un doblado sí terminó: su
 * `ClassifiedPosition` es un número.
 */
function comoAcabo(fila: FilaCruda): {
  abandono: boolean;
  noSalio: boolean;
  descalificado: boolean;
} {
  const puesto = (fila.ClassifiedPosition ?? '').trim().toUpperCase();
  const estado = (fila.Status ?? '').trim();

  const descalificado = puesto === 'D' || puesto === 'E' || estado === 'Disqualified';
  const noSalio = puesto === 'W';
  const fueraDeOtroModo = Boolean(puesto) && !/^\d+$/.test(puesto);

  return {
    descalificado,
    noSalio,
    abandono: (fueraDeOtroModo && !descalificado && !noSalio) || estado === 'Retired',
  };
}

/** El mejor tiempo de una clasificación: el del último tramo al que llegó. */
function mejorDeLosTramos(fila: FilaCruda): number | null {
  for (const columna of ['Q3', 'Q2', 'Q1'] as const) {
    const valor = segundosDeTiempo(fila[columna]);
    if (valor !== null) return valor;
  }
  return null;
}

/**
 * Pasa los resultados de FastF1 a las filas que entiende la redacción, o
 * `null` si lo que llega no sirve para avisar.
 *
 * `esCarrera` cambia qué significa la columna `Time`: en carrera el primero
 * trae el tiempo total y los demás **el hueco con él**, así que el total de
 * cada uno se reconstruye sumando. En clasificación el tiempo vive en los
 * tramos.
 */
export function filasDeFastF1(
  resultados: Record<string, unknown>[] | null | undefined,
  esCarrera: boolean
): FilaDeSesion[] | null {
  if (!resultados?.length) return null;

  const crudas = resultados as unknown as FilaCruda[];
  const conPuesto = crudas.filter((f) => typeof f.Position === 'number' && Number.isFinite(f.Position));
  if (conPuesto.length < crudas.length * MINIMO_CON_PUESTO) return null;

  const ordenadas = [...conPuesto].sort((a, b) => (a.Position as number) - (b.Position as number));

  // El total del ganador, del que cuelgan los demás.
  const totalDelPrimero = esCarrera ? segundosDeTiempo(ordenadas[0]?.Time) : null;

  const filas: FilaDeSesion[] = ordenadas.map((fila, indice) => {
    const final = comoAcabo(fila);
    const fuera = final.abandono || final.noSalio || final.descalificado;
    const doblado = (fila.Status ?? '').trim() === 'Lapped';

    /**
     * El tiempo se deja en `null` antes que ponerlo mal.
     *
     * Un doblado trae su hueco **en su propia vuelta**, así que sumárselo al
     * total del ganador daría un número que no existe. La redacción ya sabe
     * callarse cuando esto es nulo; enseñar un hueco falso no tiene arreglo.
     */
    let tiempo: number | null = null;
    if (esCarrera) {
      if (indice === 0) tiempo = totalDelPrimero;
      else if (!fuera && !doblado && totalDelPrimero !== null) {
        const hueco = segundosDeTiempo(fila.Time);
        tiempo = hueco === null ? null : totalDelPrimero + hueco;
      }
    } else {
      tiempo = mejorDeLosTramos(fila);
    }

    const codigo = (fila.Abbreviation ?? '').trim();

    return {
      puesto: fuera ? null : Math.round(fila.Position as number),
      dorsal: Number(fila.DriverNumber ?? 0) || 0,
      nombre: (fila.FullName || fila.BroadcastName || codigo).trim(),
      codigo,
      equipo: (fila.TeamName ?? '').trim(),
      color: fila.TeamColor ? `#${String(fila.TeamColor).replace(/^#/, '')}` : null,
      tiempo,
      puntos: typeof fila.Points === 'number' && Number.isFinite(fila.Points) ? fila.Points : null,
      abandono: final.abandono,
      noSalio: final.noSalio,
      descalificado: final.descalificado,
    };
  });

  // Sin códigos de piloto no hay aviso que redactar: mejor OpenF1.
  return filas.every((f) => f.codigo.length > 0) ? filas : null;
}
