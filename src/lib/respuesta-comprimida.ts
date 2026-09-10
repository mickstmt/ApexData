/**
 * Comprimir lo que sale por `/api/` cuando el navegador lo acepta.
 *
 * Existe porque Next **no comprime las rutas de API**. Comprime las páginas
 * —la portada llega en gzip— pero un `Response` devuelto por un route handler
 * sale tal cual. Medido el 2026-09-10 en el servidor standalone y contra
 * producción: `/api/laps` de una carrera son 690 652 bytes por el cable con o
 * sin `Accept-Encoding`, y el proxy inverso del VPS tampoco lo toca.
 *
 * Vive aparte de las rutas porque la decisión —¿comprimo o no, y con qué
 * cabeceras?— es lo único que puede equivocarse, y así se prueba sin levantar
 * un servidor. El navegador descomprime solo: `json()` y `arrayBuffer()`
 * devuelven lo mismo que sin comprimir.
 */

import { gzipSync } from 'node:zlib';

export interface RespuestaComprimida {
  /** Sobre un `ArrayBuffer` propio: es lo que `Response` acepta como cuerpo. */
  cuerpo: Uint8Array<ArrayBuffer>;
  cabeceras: Record<string, string>;
}

/**
 * ¿Pide gzip?
 *
 * La cabecera es una lista de codificaciones con peso: `br;q=1.0, gzip;q=0.8`.
 * Se lee token a token y no con una expresión regular: `\bgzip\b` daba por
 * bueno `x-gzip-nope`, porque el guion es frontera de palabra. Y `gzip;q=0`
 * es la forma de decir que NO se acepta.
 */
export function aceptaGzip(cabeceras: Headers): boolean {
  const valor = cabeceras.get('accept-encoding') ?? '';

  for (const token of valor.split(',')) {
    const [nombre, ...parametros] = token.trim().toLowerCase().split(';');
    if (nombre !== 'gzip' && nombre !== 'x-gzip') continue;

    const peso = parametros
      .map((p) => p.trim())
      .find((p) => p.startsWith('q='))
      ?.slice(2);

    return peso === undefined || Number.parseFloat(peso) > 0;
  }

  return false;
}

/**
 * El cuerpo listo para `new Response`, comprimido si se aceptó.
 *
 * `Vary` va siempre, comprimido o no: una caché intermedia tiene que saber que
 * la misma URL puede tener dos cuerpos distintos según quién la pida.
 */
export function comprimirSiAcepta(
  cabecerasDePeticion: Headers,
  cuerpo: string | ArrayBuffer | Uint8Array
): RespuestaComprimida {
  // `new Uint8Array(...)` copia sobre un `ArrayBuffer` propio. Hace falta
  // porque un `Buffer` de Node o una vista sobre un `SharedArrayBuffer` no
  // valen como cuerpo de `Response` según los tipos, y copiar 2,6 MB cuesta
  // menos de un milisegundo.
  const bytes: Uint8Array<ArrayBuffer> =
    typeof cuerpo === 'string' ? new TextEncoder().encode(cuerpo) : new Uint8Array(cuerpo);

  if (!aceptaGzip(cabecerasDePeticion)) {
    return { cuerpo: bytes, cabeceras: { Vary: 'Accept-Encoding' } };
  }

  return {
    cuerpo: new Uint8Array(gzipSync(bytes)),
    cabeceras: { 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' },
  };
}
