import { contrastBetween, readableOnLight, teamColor } from '@/lib/team-colors';

/**
 * El acento de la app, teñido por el equipo favorito.
 *
 * Los tokens de ApexData son canales HSL sueltos (`--primary: 72 100% 20%`),
 * así que teñir la app entera es reescribir tres variables en el documento: lo
 * que ya usa `text-primary`, `bg-primary` o el anillo de foco cambia solo.
 *
 * La trampa está en que **`--primary` hace dos trabajos**: es el relleno de los
 * botones y también la tinta de los enlaces. El color de marca crudo no sirve
 * para lo segundo —el turquesa de Mercedes da 1,31:1 sobre el fondo claro, y
 * seis de los once equipos actuales están por debajo de 3:1—, así que el acento
 * es la variante **derivada a grado texto (4,5:1)**, y el color de marca puro
 * se reserva para el ambiente, que solo se usa al 10 % de opacidad.
 */

/** Contraste que WCAG pide al texto. */
const TEXTO = 4.5;

/** Los dos extremos de tinta posibles dentro de un botón relleno. */
const NEGRO = '#000000';
const BLANCO = '#FFFFFF';

/** El fondo del tema oscuro: hsl(240 15% 5%). */
const FONDO_OSCURO = '#0B0B0F';

/**
 * Aclara el color hasta que se lee como texto sobre el fondo oscuro.
 *
 * Los valores `onDark` de la paleta se escribieron a mano para rayas y líneas,
 * que solo necesitan 3:1: el dorado de Cadillac se queda en 4,39:1, y como
 * acento acaba siendo texto de enlace. Aquí se sube lo justo, conservando el
 * tono, igual que `readableOnLight` hace en el otro sentido.
 */
function tintaSobreOscuro(hex: string, minimo: number): string {
  let candidato = hex.toUpperCase();

  for (let paso = 0; paso < 40 && contrastBetween(candidato, FONDO_OSCURO) < minimo; paso++) {
    const factor = (paso + 1) * 0.05;
    const canales = [1, 3, 5].map((i) => {
      const valor = parseInt(hex.slice(i, i + 2), 16);
      return Math.round(valor + (255 - valor) * factor);
    });
    candidato = `#${canales.map((c) => c.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  }

  return candidato;
}

export interface AcentoDeEquipo {
  /** Tinta y relleno: legible como texto sobre el fondo del tema. */
  '--primary': string;
  /** Lo que va dentro del botón relleno: negro o blanco, el que más contraste. */
  '--primary-foreground': string;
  /** El anillo de foco acompaña al acento. */
  '--ring': string;
  /** El color de marca sin tocar. Solo se pinta con opacidad baja. */
  '--ambiente': string;
}

/** De `#FF8000` a `24 100% 50%`, que es el formato que esperan los tokens. */
export function hexAHsl(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const luz = (max + min) / 2;
  const delta = max - min;

  let tono = 0;
  if (delta !== 0) {
    if (max === r) tono = ((g - b) / delta) % 6;
    else if (max === g) tono = (b - r) / delta + 2;
    else tono = (r - g) / delta + 4;
  }

  const saturacion = delta === 0 ? 0 : delta / (1 - Math.abs(2 * luz - 1));

  // Un decimal, no enteros: redondeando al entero, el dorado de Cadillac se
  // derivaba a 4,51:1 y llegaba al documento con 4,39:1, por debajo del minimo
  // que se acababa de calcular. Lo pillo la prueba, no la vista.
  const cifra = (valor: number) => String(Math.round(valor * 10) / 10);

  return `${cifra(((tono * 60) % 360 + 360) % 360)} ${cifra(saturacion * 100)}% ${cifra(luz * 100)}%`;
}

/**
 * Los tokens que hay que escribir en el documento para teñir la app.
 *
 * Devuelve `null` cuando no hay equipo elegido, que es la señal para quitar las
 * variables y dejar el verde de la marca.
 */
export function tokensDeAcento(
  constructorId: string | null | undefined,
  oscuro: boolean
): AcentoDeEquipo | null {
  if (!constructorId) return null;

  const { color, onDark } = teamColor(constructorId);

  // En los dos temas se deriva a grado texto: las variantes de la paleta están
  // pensadas para rayas (3:1) y como acento acaban siendo enlaces.
  const acento = oscuro ? tintaSobreOscuro(onDark, TEXTO) : readableOnLight(color, TEXTO);
  const dentro = contrastBetween(acento, NEGRO) >= contrastBetween(acento, BLANCO) ? NEGRO : BLANCO;

  return {
    '--primary': hexAHsl(acento),
    '--primary-foreground': hexAHsl(dentro),
    '--ring': hexAHsl(acento),
    '--ambiente': hexAHsl(color),
  };
}
