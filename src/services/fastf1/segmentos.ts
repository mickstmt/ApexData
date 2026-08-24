/**
 * Lo que se le puede meter a la URL del servicio de telemetría.
 *
 * La web hace de proxy hacia un servicio que **no tiene dominio**: vive en la
 * red interna del VPS y se dejó así a propósito, para no exponer a internet un
 * servicio sin límite de peticiones. Ese aislamiento se puede anular sin querer
 * desde aquí, y se anuló: los segmentos se interpolaban en la URL tal cual, y
 * Next decodifica `%2F`, `%3F` y `%23` dentro de un segmento dinámico. Con eso,
 * una petición desde internet alcanzaba **cualquier ruta** del servicio interno:
 *
 *     GET /api/laps/2100/..%2F..%2F..%2Fhealth%23/R
 *     → {"status":"healthy","cache_enabled":true,"cache_dir":"./cache/fastf1"}
 *
 * Eso es la respuesta del servicio, no la de la web. Comprobado en producción el
 * 2026-08-24 y encontrado por dos auditorías por separado.
 *
 * Se ataja aquí y no en cada ruta a propósito: son trece construcciones de URL y
 * siete rutas distintas: validar en cada una es olvidarse en la siguiente. Esta
 * es la única puerta por la que se sale hacia el servicio.
 */

/** Un fallo de validación no debe parecerse a un fallo del servidor. */
export class SegmentoInvalidoError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'SegmentoInvalidoError';
  }
}

/**
 * FastF1 acepta el nombre del Gran Premio, el del circuito, el país o el número
 * de ronda, y hace coincidencia difusa. Por eso no hay lista blanca posible: se
 * acota la FORMA —letras, dígitos, espacios y los separadores que aparecen en
 * nombres reales— y se deja fuera todo lo que sirve para navegar una URL.
 */
const EVENTO = /^[\p{L}\p{N} .'\-_]{1,60}$/u;

/** Códigos de piloto: tres letras, o el número de coche. */
const PILOTO = /^[A-Za-z]{2,4}$|^[0-9]{1,2}$/;

/**
 * FastF1 solo tiene cronometría desde 2018, y no puede haber datos del futuro.
 * Sin este techo, `/api/laps/3000/1/R` cuesta 3,5 s de servicio y no se cachea
 * porque el camino de error no guarda nada: repetirlo sale gratis al atacante y
 * caro a nosotros.
 */
export const PRIMERA_TEMPORADA = 2018;

export function anioValido(anio: number): boolean {
  const techo = new Date().getUTCFullYear() + 1;
  return Number.isInteger(anio) && anio >= PRIMERA_TEMPORADA && anio <= techo;
}

/** El Gran Premio, listo para meter en la URL. Lanza si no tiene forma de tal. */
export function segmentoEvento(evento: string | number): string {
  const texto = String(evento);

  if (!EVENTO.test(texto)) {
    throw new SegmentoInvalidoError(
      'El Gran Premio solo puede llevar letras, números, espacios, puntos, guiones y apóstrofos.'
    );
  }

  return encodeURIComponent(texto);
}

/** El piloto, listo para meter en la URL. Lanza si no tiene forma de tal. */
export function segmentoPiloto(piloto: string): string {
  if (!PILOTO.test(piloto)) {
    throw new SegmentoInvalidoError(
      'El piloto se indica con su código de tres letras o con su número de coche.'
    );
  }

  return encodeURIComponent(piloto);
}

/**
 * Un número que va a la URL, acotado.
 *
 * `limit` llegaba sin techo ni suelo hasta `.head(limit)` de pandas, donde un
 * negativo cambia la semántica en silencio —descarta los últimos en vez de
 * tomar los primeros—.
 */
export function numeroAcotado(valor: number, minimo: number, maximo: number): number {
  if (!Number.isFinite(valor)) return minimo;
  return Math.min(Math.max(Math.trunc(valor), minimo), maximo);
}

/** El año, comprobado antes de salir hacia el servicio. */
export function segmentoAnio(anio: number): number {
  if (!anioValido(anio)) {
    throw new SegmentoInvalidoError(
      `El año debe estar entre ${PRIMERA_TEMPORADA} y ${new Date().getUTCFullYear() + 1}: FastF1 no tiene cronometría anterior, ni del futuro.`
    );
  }

  return anio;
}
