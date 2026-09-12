import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { SESIONES, rutaDeSesion, TODAS_LAS_SESIONES } from '@/lib/push/redaccion';

/**
 * A dónde lleva un aviso al tocarlo.
 *
 * El fallo que vigila: los avisos abrían `/results/{año}/{ronda}` a secas, sin
 * `?sesion=`, así que todos aterrizaban en la pestaña por defecto. El usuario
 * tocó el aviso de la clasificación del sábado y llegó a CARRERA, que ni se
 * había corrido. Le pasaba igual al de la FP3 y a las previas.
 */
describe('el destino de un aviso', () => {
  it('cada sesión abre por su pestaña', () => {
    expect(rutaDeSesion(2026, 14, SESIONES['Practice 3'].pestana)).toBe(
      '/results/2026/14?sesion=practice3'
    );
    expect(rutaDeSesion(2026, 14, SESIONES.Qualifying.pestana)).toBe(
      '/results/2026/14?sesion=qualifying'
    );
    expect(rutaDeSesion(2026, 12, SESIONES['Sprint Qualifying'].pestana)).toBe(
      '/results/2026/12?sesion=sprint-qualifying'
    );
    expect(rutaDeSesion(2026, 12, SESIONES.Sprint.pestana)).toBe('/results/2026/12?sesion=sprint');
  });

  it('la carrera va sin parámetro, porque ya es la pestaña de partida', () => {
    expect(rutaDeSesion(2026, 14, SESIONES.Race.pestana)).toBe('/results/2026/14');
  });

  it('las siete sesiones tienen pestaña, y ninguna se repite', () => {
    // Sin esto, añadir una sesión nueva y olvidar su pestaña volvería a mandar
    // ese aviso a la carrera sin que nada avisara.
    const pestanas = Object.values(SESIONES).map((s) => s.pestana);

    expect(pestanas).toHaveLength(TODAS_LAS_SESIONES.length);
    expect(new Set(pestanas).size).toBe(pestanas.length);
    expect(pestanas.every(Boolean)).toBe(true);
  });

  /**
   * Las pestañas que la ficha acepta de verdad.
   *
   * Se escriben aquí a mano a propósito: `RaceDetailClient` es un componente de
   * cliente y no se puede importar en una prueba de nodo, así que esta lista es
   * la copia que hay que mantener a la par. Si alguien renombra una pestaña
   * allí, esto no se entera — pero al menos deja escrito contra qué se acordó.
   */
  it('los identificadores son los que entiende la ficha', () => {
    const QUE_ACEPTA_LA_FICHA = [
      'practice1',
      'practice2',
      'practice3',
      'sprint-qualifying',
      'sprint',
      'qualifying',
      'race',
    ];

    for (const sesion of Object.values(SESIONES)) {
      expect(QUE_ACEPTA_LA_FICHA, `«${sesion.nombre}» apunta a una pestaña que no existe`).toContain(
        sesion.pestana
      );
    }
  });

  /**
   * Que nadie vuelva a escribir la dirección a mano.
   *
   * `rutaDeSesion` estar bien no basta: el fallo era que los dos sitios que
   * mandan avisos NO la usaban, y construían `/results/{año}/{ronda}` por su
   * cuenta. Una prueba sobre la función sola habría pasado en verde con el
   * fallo delante, que es exactamente la prueba vacua que ya salió tres veces
   * en este proyecto.
   *
   * Montar el camino real pediría simular prisma y OpenF1 enteros. Leer el
   * fuente es más tosco, pero caza justo lo que se rompió — y el proyecto ya
   * lee archivos en `contraste-replay.test.ts` por el mismo motivo.
   */
  it('quien manda avisos no arma la dirección por su cuenta', () => {
    const QUIENES_AVISAN = ['avisos-de-sesion.ts', 'previas-de-sesion.ts'];

    for (const archivo of QUIENES_AVISAN) {
      const fuente = readFileSync(join(process.cwd(), 'src/lib/push', archivo), 'utf8');

      expect(fuente, `${archivo} escribe la dirección a mano en vez de usar rutaDeSesion`)
        .not.toMatch(/`\/results\/\$\{/);
      expect(fuente, `${archivo} ya no usa rutaDeSesion`).toContain('rutaDeSesion(');
    }
  });
});
