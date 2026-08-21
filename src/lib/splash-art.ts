/**
 * La composición de la pantalla de apertura, definida una sola vez.
 *
 * Se dibuja en dos sitios que tienen que coincidir **al píxel**: la imagen que
 * iOS enseña al tocar el icono (un PNG por geometría, generado con `sharp`) y
 * el fondo de la pantalla de apertura dentro de la app (CSS). Si difieren, se
 * ve el salto entre una y otra — que es exactamente el defecto que se quitó el
 * 2026-08-20 y que no conviene reintroducir por una esquina mal calculada.
 *
 * Por eso todo va en **fracciones de la pantalla** y las curvas son de una sola
 * esquina: así el generador puede calcularlas para las trece geometrías de
 * iPhone y el navegador puede reproducirlas con `border-radius`, que se resuelve
 * igual —radio horizontal sobre el ancho de la caja, vertical sobre su alto—.
 *
 * «Dos ápices»: una curva entra desde arriba a la izquierda y otra desde abajo
 * a la derecha, como el trazado de dos curvas opuestas.
 */

export interface FormaDeApertura {
  /** De qué lado nace la forma. La esquina que se curva es siempre la interior. */
  anclaje: 'arriba' | 'abajo-derecha';
  /** Fracción del ancho de la pantalla. */
  ancho: number;
  /** Fracción del alto de la pantalla. */
  alto: number;
  /** Radio de la esquina interior, en fracción del lado propio de la forma. */
  radio: number;
}

export const FORMAS: FormaDeApertura[] = [
  { anclaje: 'arriba', ancho: 1, alto: 0.26, radio: 0.58 },
  { anclaje: 'abajo-derecha', ancho: 0.72, alto: 0.18, radio: 0.52 },
];

/** Los estilos para el navegador. Porcentajes, que es como los resuelve CSS. */
export function estiloDeForma(forma: FormaDeApertura): React.CSSProperties {
  const porcentaje = (valor: number) => `${valor * 100}%`;

  if (forma.anclaje === 'arriba') {
    return {
      top: 0,
      left: 0,
      width: porcentaje(forma.ancho),
      height: porcentaje(forma.alto),
      borderBottomRightRadius: porcentaje(forma.radio),
    };
  }

  return {
    bottom: 0,
    right: 0,
    width: porcentaje(forma.ancho),
    height: porcentaje(forma.alto),
    borderTopLeftRadius: porcentaje(forma.radio),
  };
}

/**
 * La misma forma como camino SVG, para rasterizarla.
 *
 * El radio se traduce a una elipse —radio horizontal sobre el ancho de la
 * forma, vertical sobre su alto— porque es exactamente lo que hace
 * `border-radius` con un porcentaje. Calcularlo como un círculo daría una curva
 * parecida y descuadrada, que es la clase de diferencia que produce el salto.
 */
export function caminoDeForma(forma: FormaDeApertura, ancho: number, alto: number): string {
  const w = forma.ancho * ancho;
  const h = forma.alto * alto;
  const rx = forma.radio * w;
  const ry = forma.radio * h;

  if (forma.anclaje === 'arriba') {
    // Esquina inferior derecha curvada: de este a sur del centro de la elipse.
    return `M 0 0 L ${w} 0 L ${w} ${h - ry} A ${rx} ${ry} 0 0 1 ${w - rx} ${h} L 0 ${h} Z`;
  }

  const x = ancho - w;
  const y = alto - h;

  // Esquina superior izquierda curvada: de norte a oeste del centro.
  return `M ${x + rx} ${y} A ${rx} ${ry} 0 0 0 ${x} ${y + ry} L ${x} ${alto} L ${ancho} ${alto} L ${ancho} ${y} Z`;
}

/** El lienzo entero como SVG: fondo, las dos formas y nada más. */
export function fondoDeApertura(
  ancho: number,
  alto: number,
  fondo: string,
  acento: string
): string {
  const caminos = FORMAS.map(
    (forma) => `<path d="${caminoDeForma(forma, ancho, alto)}" fill="${acento}"/>`
  ).join('');

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" ` +
    `viewBox="0 0 ${ancho} ${alto}">` +
    `<rect width="${ancho}" height="${alto}" fill="${fondo}"/>${caminos}</svg>`
  );
}
