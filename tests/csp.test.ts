import { describe, expect, it } from 'vitest';
import { llevaPolitica, nuevoNonce, politicaDeContenido } from '@/lib/csp';

/**
 * La política solo vale mientras diga lo que tiene que decir. Estas pruebas
 * vigilan las cuatro directivas de las que depende de verdad; el resto es
 * higiene.
 */

const politica = (nonce = 'abc123') => politicaDeContenido(nonce, false);

function directiva(politica: string, nombre: string): string | undefined {
  return politica
    .split('; ')
    .find((d) => d.startsWith(`${nombre} `) || d === nombre);
}

describe('la política de producción', () => {
  it('autoriza los scripts por nonce, no por origen', () => {
    // `script-src 'self'` no sirve frente a un XSS: el script inyectado vive en
    // la propia página, así que YA es «self».
    expect(directiva(politica(), 'script-src')).toContain("'nonce-abc123'");
  });

  it('no admite scripts en línea sin nonce', () => {
    // Es lo que bloquea un `onerror=` metido por el marcado, que es el vector
    // real de un XSS. Comprobado también en navegador.
    expect(directiva(politica(), 'script-src')).not.toContain("'unsafe-inline'");
    expect(directiva(politica(), 'script-src')).not.toContain("'unsafe-eval'");
  });

  it('lleva strict-dynamic, o Next no puede cargar sus trozos', () => {
    expect(directiva(politica(), 'script-src')).toContain("'strict-dynamic'");
  });

  it('impide llevarse nada a otro sitio', () => {
    // La otra mitad del daño de un XSS: no poder ejecutar, y no poder exfiltrar.
    expect(directiva(politica(), 'connect-src')).toBe("connect-src 'self'");
  });

  it('impide desviar las rutas relativas con un <base>', () => {
    expect(directiva(politica(), 'base-uri')).toBe("base-uri 'self'");
  });

  it('conserva lo que ya había', () => {
    expect(directiva(politica(), 'frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(directiva(politica(), 'object-src')).toBe("object-src 'none'");
  });

  it('admite estilos en línea, y está razonado', () => {
    // React escribe los `style={{…}}` como atributos y framer-motion los cambia
    // en cada fotograma: sin esto no se pinta nada.
    expect(directiva(politica(), 'style-src')).toContain("'unsafe-inline'");
  });
});

describe('la política de desarrollo', () => {
  it('deja trabajar a la recarga en caliente', () => {
    // Next evalúa código para recargar en caliente; con la política estricta la
    // app no arranca en local. La de verdad es la de producción.
    const desarrollo = politicaDeContenido('abc123', true);
    expect(directiva(desarrollo, 'script-src')).toContain("'unsafe-eval'");
    expect(desarrollo).not.toContain('upgrade-insecure-requests');
  });
});

describe('el nonce', () => {
  it('es distinto cada vez', () => {
    const muchos = new Set(Array.from({ length: 500 }, () => nuevoNonce()));
    expect(muchos.size).toBe(500);
  });

  it('no lleva caracteres que rompan la cabecera', () => {
    for (let i = 0; i < 50; i++) {
      expect(nuevoNonce()).toMatch(/^[A-Za-z0-9+/=]+$/);
    }
  });
});

describe('qué rutas llevan política', () => {
  it('los documentos sí', () => {
    for (const ruta of ['/', '/results/2024/1', '/analysis']) {
      expect(llevaPolitica(ruta), ruta).toBe(true);
    }
  });

  it('los datos y los archivos no', () => {
    // No son documentos: no hay nada que ejecutar y la cabecera sería peso.
    for (const ruta of ['/api/drivers', '/_next/static/x.js', '/images/flags/nl.svg']) {
      expect(llevaPolitica(ruta), ruta).toBe(false);
    }
  });
});
