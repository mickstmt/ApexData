import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * La versión de las cachés del service worker no puede volver a escribirse a
 * mano.
 *
 * Estaba fijada en el archivo con un comentario que pedía subirla en cualquier
 * entrega que cambiara el HTML. Se olvidó, y un móvil con la app instalada
 * siguió sirviendo la página guardada mientras la hidrataba el JavaScript
 * nuevo: React descartaba el HTML del servidor y volvía a pintar en el cliente.
 *
 * Y acordarse no bastaba: **un worker solo se reinstala si cambian sus bytes**,
 * así que un despliegue que no tocara `sw.js` dejaba la app pegada a lo viejo
 * aunque el número fuera correcto. Ahora la versión llega en la dirección con
 * la que se registra, `/sw.js?v=<buildId>`.
 */
describe('versión del service worker', () => {
  const sw = readFileSync('public/sw.js', 'utf8');
  const registrador = readFileSync('src/components/pwa/PwaRegister.tsx', 'utf8');

  it('sale de la dirección, no de una constante escrita a mano', () => {
    expect(sw).toMatch(/URLSearchParams\(self\.location\.search[\s\S]{0,40}\.get\('v'\)/);

    const fijadas = [...sw.matchAll(/apexdata-(?:static|pages)-v?\d+/g)].map((m) => m[0]);
    expect(
      fijadas,
      `Nombres de caché con la versión escrita a mano: ${fijadas.join(', ')}. ` +
        'Debe salir del identificador de la compilación.'
    ).toEqual([]);
  });

  it('los dos nombres de caché se construyen con esa versión', () => {
    expect(sw).toMatch(/CACHE_STATIC\s*=\s*`apexdata-static-\$\{VERSION\}`/);
    expect(sw).toMatch(/CACHE_PAGES\s*=\s*`apexdata-pages-\$\{VERSION\}`/);
  });

  it('el registrador pide la versión y la pone en la dirección', () => {
    expect(registrador).toContain('/api/version');
    expect(registrador).toMatch(/register\(\s*\n?\s*version \? `\/sw\.js\?v=\$\{/);
  });

  it('sin versión hay un nombre estable, no uno vacío', () => {
    // Si `/api/version` no respondiera, mejor una caché estable que una por
    // visita —o peor, `apexdata-pages-null`—.
    expect(sw).toMatch(/\|\|\s*'sin-version'/);
  });
});
