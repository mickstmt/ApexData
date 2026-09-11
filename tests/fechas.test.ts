import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fechaDeCarrera, fechaDeCarreraCorta, horaUTCDe, tieneHoraConocida } from '@/lib/fechas';

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
   * Las excepciones son componentes que **reciben** la zona como parámetro,
   * porque ahí sí se quiere la del navegador —la pregunta es «¿a qué hora la
   * veo?»— y lo hacen en el único orden que no desajusta la hidratación:
   * pintan en UTC como el servidor y cambian al montar.
   */
  const PERMITIDOS = new Set([
    'src/components/home/RaceCountdown.tsx',
    'src/components/results/HoraDeSalida.tsx',
    'src/components/results/HorarioDelFinDeSemana.tsx',
  ]);

  /**
   * `--others --exclude-standard` incluye los archivos aún sin añadir.
   *
   * Sin eso, un componente recién creado no se revisaba hasta comprometerlo, y
   * la prueba pasaba en local para fallar en el CI. Pasó exactamente así.
   */
  const archivos = execSync(
    'git ls-files --cached --others --exclude-standard "src/**/*.ts" "src/**/*.tsx"',
    { encoding: 'utf8' }
  )
    .trim()
    .split('\n')
    .filter(Boolean);

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

describe('la hora de una sesión, cuando se sabe', () => {
  // Las cifras salen de contar la base entera, no de suponer: de 2010 a 2021
  // las 237 carreras guardan el día de cada sesión a medianoche UTC porque
  // Ergast no publicaba horarios; de 2022 en adelante las 115 traen la hora.
  it('una sesión de 2022 en adelante lleva su hora dentro', () => {
    expect(tieneHoraConocida(new Date('2026-03-06T01:30:00Z'))).toBe(true);
    expect(horaUTCDe(new Date('2026-03-06T01:30:00Z'))).toBe('01:30:00Z');
  });

  it('una de antes de 2022 es solo el día, y eso NO es medianoche', () => {
    // Escribir «00:00» aquí no sería un dato viejo, sería uno inventado.
    expect(tieneHoraConocida(new Date('2015-03-13T00:00:00Z'))).toBe(false);
  });

  it('sin fecha no hay hora que enseñar', () => {
    expect(tieneHoraConocida(null)).toBe(false);
    expect(tieneHoraConocida(undefined)).toBe(false);
  });

  it('la hora se escribe como la manda la fuente, con ceros delante', () => {
    expect(horaUTCDe(new Date('2026-03-08T04:00:00Z'))).toBe('04:00:00Z');
    expect(horaUTCDe(new Date('2026-11-21T23:05:07Z'))).toBe('23:05:07Z');
  });

  it('se lee en UTC, no en la zona de quien ejecuta la prueba', () => {
    // Si esto se leyera en local, la misma sesión daría horas distintas según
    // dónde corra el CI — y en media España saldría una hora de más.
    expect(horaUTCDe('2026-03-06T01:30:00Z')).toBe('01:30:00Z');
    expect(tieneHoraConocida('2015-03-13T00:00:00Z')).toBe(false);
  });
});
