import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { aceptaGzip, comprimirSiAcepta } from '@/lib/respuesta-comprimida';

/**
 * Next no comprime las rutas de API —medido: 690 KB de vueltas por el cable
 * pidiendo gzip— así que lo hace esto. Conviene que esté probado, porque un
 * cuerpo comprimido con la cabecera equivocada es basura para el navegador.
 */

const bloque = new Uint8Array(20_000).map((_, i) => i % 7);

describe('si el navegador acepta gzip', () => {
  it('lo lee entre otras codificaciones y con pesos', () => {
    expect(aceptaGzip(new Headers({ 'accept-encoding': 'br;q=1.0, gzip;q=0.8, *;q=0.1' }))).toBe(true);
    expect(aceptaGzip(new Headers({ 'accept-encoding': 'gzip, deflate, br' }))).toBe(true);
  });

  it('no se deja engañar por un nombre parecido', () => {
    // `\bgzip\b` daba esto por bueno: el guion es frontera de palabra.
    expect(aceptaGzip(new Headers({ 'accept-encoding': 'x-gzip-nope' }))).toBe(false);
    expect(aceptaGzip(new Headers({ 'accept-encoding': 'gzipped' }))).toBe(false);
    expect(aceptaGzip(new Headers())).toBe(false);
  });

  it('gzip con peso cero es que NO se acepta', () => {
    expect(aceptaGzip(new Headers({ 'accept-encoding': 'gzip;q=0, identity' }))).toBe(false);
    // Y el alias antiguo de HTTP cuenta como gzip.
    expect(aceptaGzip(new Headers({ 'accept-encoding': 'x-gzip' }))).toBe(true);
  });
});

describe('el cuerpo que sale', () => {
  it('comprimido va con su cabecera y se recupera intacto', () => {
    const { cuerpo, cabeceras } = comprimirSiAcepta(
      new Headers({ 'accept-encoding': 'gzip' }),
      bloque
    );

    expect(cabeceras['Content-Encoding']).toBe('gzip');
    expect(cuerpo.byteLength).toBeLessThan(bloque.byteLength / 4);
    expect(new Uint8Array(gunzipSync(cuerpo))).toEqual(bloque);
  });

  it('sin gzip sale tal cual y sin cabecera de codificación', () => {
    const { cuerpo, cabeceras } = comprimirSiAcepta(new Headers(), bloque);

    expect(cabeceras['Content-Encoding']).toBeUndefined();
    expect(cuerpo).toEqual(bloque);
  });

  it('Vary va siempre, para que una caché no mezcle los dos cuerpos', () => {
    expect(comprimirSiAcepta(new Headers(), bloque).cabeceras.Vary).toBe('Accept-Encoding');
    expect(
      comprimirSiAcepta(new Headers({ 'accept-encoding': 'gzip' }), bloque).cabeceras.Vary
    ).toBe('Accept-Encoding');
  });

  it('acepta texto y ArrayBuffer además de bytes', () => {
    const texto = comprimirSiAcepta(new Headers({ 'accept-encoding': 'gzip' }), '{"a":1}');
    expect(gunzipSync(texto.cuerpo).toString()).toBe('{"a":1}');

    const buffer = comprimirSiAcepta(new Headers(), bloque.buffer.slice(0, 8) as ArrayBuffer);
    expect(buffer.cuerpo.byteLength).toBe(8);
  });
});
