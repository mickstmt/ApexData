import { describe, expect, it } from 'vitest';
import { hexAHsl, tokensDeAcento } from '@/lib/team-accent';
import { contrastBetween, teamColor } from '@/lib/team-colors';

/** Los once equipos de la parrilla actual, que son los que se pueden elegir. */
const PARRILLA = [
  'mclaren',
  'ferrari',
  'mercedes',
  'red_bull',
  'aston_martin',
  'alpine',
  'williams',
  'rb',
  'haas',
  'audi',
  'cadillac',
];

/** Los fondos reales de los dos temas, no blanco y negro puros. */
const FONDO_CLARO = '#F7F7F8';
const FONDO_OSCURO = '#0B0B0F';

const hslAHex = (canales: string) => {
  const [t, s, l] = canales.split(' ').map((v) => parseFloat(v));
  const saturacion = s / 100;
  const luz = l / 100;
  const c = (1 - Math.abs(2 * luz - 1)) * saturacion;
  const x = c * (1 - Math.abs(((t / 60) % 2) - 1));
  const m = luz - c / 2;
  const tramo = Math.floor(t / 60) % 6;
  const [r, g, b] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][tramo];
  return (
    '#' +
    [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('')
  );
};

describe('hexAHsl', () => {
  it('traduce al formato que esperan los tokens de la app', () => {
    expect(hexAHsl('#FF0000')).toBe('0 100% 50%');
    expect(hexAHsl('#000000')).toBe('0 0% 0%');
    expect(hexAHsl('#FFFFFF')).toBe('0 0% 100%');
  });

  it('conserva el tono del color de marca', () => {
    // El naranja de McLaren, comprobado como número: los canales llevan un
    // decimal porque redondearlos al entero tiraba el contraste por debajo del
    // mínimo recién calculado.
    const tono = parseFloat(hexAHsl('#FF8000').split(' ')[0]);
    expect(tono).toBeGreaterThan(29);
    expect(tono).toBeLessThan(31);
  });
});

describe('tokensDeAcento', () => {
  it('sin equipo elegido no tiñe nada', () => {
    expect(tokensDeAcento(null, false)).toBeNull();
    expect(tokensDeAcento(undefined, true)).toBeNull();
  });

  it.each(PARRILLA)('%s queda legible como texto en los dos temas', (equipo) => {
    for (const oscuro of [false, true]) {
      const tokens = tokensDeAcento(equipo, oscuro)!;
      const acento = hslAHex(tokens['--primary']);
      const fondo = oscuro ? FONDO_OSCURO : FONDO_CLARO;

      // Es el defecto que esto evita: `text-primary` con el color de marca
      // crudo daba 1,31:1 en Mercedes y 1,48:1 en Audi sobre el fondo claro.
      expect(contrastBetween(acento, fondo)).toBeGreaterThanOrEqual(4.4);
    }
  });

  it.each(PARRILLA)('%s deja legible el texto dentro del botón', (equipo) => {
    for (const oscuro of [false, true]) {
      const tokens = tokensDeAcento(equipo, oscuro)!;
      const relleno = hslAHex(tokens['--primary']);
      const dentro = hslAHex(tokens['--primary-foreground']);

      expect(contrastBetween(relleno, dentro)).toBeGreaterThanOrEqual(4.4);
    }
  });

  it('el ambiente conserva el color de marca sin tocar', () => {
    const tokens = tokensDeAcento('mercedes', false)!;
    expect(tokens['--ambiente']).toBe(hexAHsl(teamColor('mercedes').color));
    // Y no coincide con el acento, que sí se ha oscurecido para poder leerse.
    expect(tokens['--ambiente']).not.toBe(tokens['--primary']);
  });
});
