import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastBetween } from '@/lib/team-colors';

/**
 * Los colores del replay, contra el listón que le toca a cada uno.
 *
 * No se comprueba una lista de hex —esa se puede cambiar con toda la razón—
 * sino lo que tiene que seguir siendo cierto después de cambiarlos: que el
 * texto llegue a 4,5:1 y que un gráfico con significado llegue a 3:1, en los
 * DOS temas.
 *
 * Existe porque aquí ya se coló un fallo: al estrenar el tema claro se le dio
 * al «OUT» el mismo rojo que a la píldora, y como tinta sobre el fondo claro
 * eso son 3,22:1. El compilador no lo ve y el ojo tampoco, porque el rojo
 * sobre blanco parece contrastado sin estarlo.
 */

/** Umbrales de WCAG: 1.4.3 para texto, 1.4.11 para gráficos con significado. */
const TEXTO = 4.5;
const GRAFICO = 3;

function tokens(): { claro: Record<string, string>; oscuro: Record<string, string> } {
  const css = readFileSync('src/app/globals.css', 'utf8');
  // Los tokens claros viven en `:root` y los oscuros en `.dark`, que va
  // después. Se parte por ahí en vez de emparejar llaves.
  const corte = css.indexOf('.dark {');
  expect(corte).toBeGreaterThan(0);

  const leer = (trozo: string) => {
    const salida: Record<string, string> = {};
    // Solo declaraciones con un color literal: `var(--replay-x)` no lleva `:`
    // detrás del nombre, así que no entra.
    for (const [, nombre, valor] of trozo.matchAll(/--replay-([a-z0-9-]+):\s*(#[0-9A-Fa-f]{3,8})/g)) {
      salida[nombre] = valor;
    }
    return salida;
  };

  return { claro: leer(css.slice(0, corte)), oscuro: leer(css.slice(corte)) };
}

describe('los colores del replay llegan a su listón', () => {
  const { claro, oscuro } = tokens();

  it('los dos temas declaran los mismos tokens', () => {
    expect(Object.keys(claro).sort()).toEqual(Object.keys(oscuro).sort());
    expect(Object.keys(claro).length).toBeGreaterThan(10);
  });

  for (const [tema, t] of [
    ['claro', claro],
    ['oscuro', oscuro],
  ] as const) {
    describe(`tema ${tema}`, () => {
      it('el texto principal y el apagado se leen sobre el fondo', () => {
        expect(contrastBetween(t.texto, t.fondo)).toBeGreaterThanOrEqual(TEXTO);
        expect(contrastBetween(t.apagado, t.fondo)).toBeGreaterThanOrEqual(TEXTO);
        expect(contrastBetween(t.hueco, t.fondo)).toBeGreaterThanOrEqual(TEXTO);
      });

      it('la tinta de REPRODUCIR se lee sobre su acento', () => {
        expect(contrastBetween(t['acento-tinta'], t.acento)).toBeGreaterThanOrEqual(TEXTO);
      });

      it('el trazado se despega del fondo como gráfico', () => {
        expect(contrastBetween(t.trazado, t.fondo)).toBeGreaterThanOrEqual(GRAFICO);
      });

      it('las banderas se despegan del fondo como gráfico', () => {
        for (const bandera of ['amarilla', 'naranja', 'roja'] as const) {
          expect(contrastBetween(t[bandera], t.fondo)).toBeGreaterThanOrEqual(GRAFICO);
        }
      });

      it('la tinta de cada píldora se lee sobre su bandera', () => {
        // Negro sobre ámbar y naranja; blanco sobre roja. Es lo que pinta
        // `ReplayClient`, y el fondo de la píldora es el propio color, así que
        // esto no depende del tema de la página.
        expect(contrastBetween('#000000', t.amarilla)).toBeGreaterThanOrEqual(TEXTO);
        expect(contrastBetween('#000000', t.naranja)).toBeGreaterThanOrEqual(TEXTO);
        expect(contrastBetween('#FFFFFF', t.roja)).toBeGreaterThanOrEqual(TEXTO);
      });

      it('el «OUT» se lee como texto, que es más de lo que pide un bloque', () => {
        expect(contrastBetween(t['roja-texto'], t.fondo)).toBeGreaterThanOrEqual(TEXTO);
      });
    });
  }

  it('el rojo de bloque y el de tinta no son el mismo por casualidad', () => {
    // Si algún día coincidieran, uno de los dos estaría fallando: no hay un
    // solo rojo que sirva de fondo de píldora y de tinta sobre los dos fondos.
    expect(contrastBetween('#FFFFFF', claro.roja)).toBeGreaterThanOrEqual(TEXTO);
    expect(contrastBetween(oscuro['roja-texto'], oscuro.fondo)).toBeGreaterThanOrEqual(TEXTO);
    expect(oscuro['roja-texto']).not.toBe(claro['roja-texto']);
  });
});
