import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fechaDeCarrera, fechaDeCarreraCorta } from '@/lib/fechas';

describe('fechaDeCarrera', () => {
  // Medianoche UTC: así están las 352 carreras de la base, porque `date` es una
  // fecha de calendario y la hora de salida va en `time`.
  const australia2026 = '2026-03-08T00:00:00.000Z';

  it('da el día de calendario, no el instante', () => {
    expect(fechaDeCarrera(australia2026)).toBe('8 de marzo de 2026');
    expect(fechaDeCarreraCorta(australia2026)).toBe('08 mar');
  });

  it('no se mueve con la zona horaria de quien mira', () => {
    // El defecto: sin fijar la zona, en Lima —cinco horas por detrás—
    // medianoche UTC del día 8 son las siete de la tarde del 7, y el Gran
    // Premio de Australia salía fechado un día antes del que es. De paso
    // rompía la hidratación, porque el servidor va en UTC y el navegador no.
    const enLima = new Date(australia2026).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Lima',
    });

    expect(enLima).toBe('7 de marzo de 2026');
    expect(fechaDeCarrera(australia2026)).not.toBe(enLima);
  });

  it('acepta un Date además de una cadena', () => {
    expect(fechaDeCarrera(new Date(australia2026))).toBe('8 de marzo de 2026');
  });
});

describe('ninguna fecha se formatea sin zona horaria', () => {
  /**
   * Esta es la prueba que de verdad importa: el fallo no fue escribir mal una
   * función, fue olvidar `timeZone` en tres sitios sueltos durante meses.
   *
   * Se permite una excepción, y sólo una: `RaceCountdown` **recibe** la zona
   * como parámetro, porque ahí sí se quiere la del navegador —la pregunta es
   * «¿a qué hora la veo?»— y lo hace en el único orden que no desajusta la
   * hidratación: pinta en UTC como el servidor y cambia en un efecto.
   */
  const PERMITIDOS = new Set(['src/components/home/RaceCountdown.tsx']);

  const archivos = execSync('git ls-files "src/**/*.ts" "src/**/*.tsx"', { encoding: 'utf8' })
    .trim()
    .split('\n');

  it('encuentra archivos que revisar', () => {
    // Sin esto, un `git ls-files` que fallara haría pasar la prueba sin mirar
    // nada.
    expect(archivos.length).toBeGreaterThan(50);
  });

  it('todo formateo de fecha fija la zona', () => {
    const culpables: string[] = [];

    for (const archivo of archivos) {
      if (PERMITIDOS.has(archivo)) continue;
      const fuente = readFileSync(archivo, 'utf8');

      const llamadas = fuente.matchAll(
        /(?:toLocaleDateString|toLocaleString|toLocaleTimeString)\s*\(([\s\S]{0,320}?)\)\s*[;,}\n]/g
      );

      for (const llamada of llamadas) {
        const argumentos = llamada[1];
        // Sin configuración regional no es una fecha: `(1234).toLocaleString('es')`
        // formatea números y no le afecta ninguna zona.
        if (!/['"][a-z]{2}(-[A-Z]{2})?['"]/.test(argumentos)) continue;
        if (!/(day|month|year|weekday|hour|minute)/.test(argumentos)) continue;
        if (/timeZone/.test(argumentos)) continue;

        const linea = fuente.slice(0, llamada.index).split('\n').length;
        culpables.push(`${archivo}:${linea}`);
      }
    }

    expect(
      culpables,
      `Formatean una fecha sin fijar la zona: ${culpables.join(', ')}. ` +
        'Usa `fechaDeCarrera` o `fechaDeCarreraCorta` de `@/lib/fechas`, o pasa ' +
        '`timeZone` explícitamente.'
    ).toEqual([]);
  });
});
