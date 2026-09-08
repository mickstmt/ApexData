import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { esSondeoDeServerAction } from '@/lib/sondeos';

describe('sondeos de Server Actions', () => {
  it('rechaza un POST con la cabecera de acción', () => {
    // Los valores reales que llegaron al registro de producción.
    for (const inventado of ['0', '1', 'action', 'x']) {
      const cabeceras = new Headers({ 'Next-Action': inventado });
      expect(esSondeoDeServerAction('POST', cabeceras)).toBe(true);
    }
  });

  it('da igual cómo se escriban las mayúsculas de la cabecera', () => {
    expect(esSondeoDeServerAction('POST', new Headers({ 'next-action': '0' }))).toBe(true);
  });

  it('no toca la navegación normal', () => {
    expect(esSondeoDeServerAction('GET', new Headers())).toBe(false);
    expect(esSondeoDeServerAction('GET', new Headers({ 'Next-Action': '0' }))).toBe(false);
  });

  it('no toca las rutas de la API, que sí reciben POST', () => {
    // `/api/push` manda JSON y jamás esta cabecera.
    const cabeceras = new Headers({ 'Content-Type': 'application/json' });
    expect(esSondeoDeServerAction('POST', cabeceras)).toBe(false);
  });
});

/**
 * La premisa que sostiene el rechazo en bloque.
 *
 * El middleware corta **cualquier** petición con cabecera `Next-Action` sin
 * mirar su contenido, y eso solo es correcto mientras ApexData no tenga ninguna
 * Server Action. El día que alguien añada la primera, dejaría de funcionar sin
 * ningún mensaje que explique por qué: la petición se iría en un 404 antes de
 * llegar a ninguna parte.
 *
 * Esta prueba es lo que convierte ese silencio en un aviso. Si falla, no es que
 * la Server Action esté mal: es que hay que quitar el corte del middleware y
 * validar el formato del identificador en su lugar.
 */
describe('la premisa del middleware', () => {
  function fuentes(carpeta: string): string[] {
    const encontradas: string[] = [];

    for (const entrada of readdirSync(carpeta)) {
      const camino = join(carpeta, entrada);

      if (statSync(camino).isDirectory()) {
        encontradas.push(...fuentes(camino));
      } else if (/\.tsx?$/.test(entrada)) {
        encontradas.push(camino);
      }
    }

    return encontradas;
  }

  it('ApexData sigue sin tener ninguna Server Action', () => {
    const conAccion = fuentes(join(process.cwd(), 'src')).filter((camino) => {
      const codigo = readFileSync(camino, 'utf8');
      return /^\s*['"]use server['"]/m.test(codigo);
    });

    expect(
      conAccion,
      'Hay Server Actions nuevas: el middleware las está bloqueando. Ver src/lib/sondeos.ts'
    ).toEqual([]);
  });
});
