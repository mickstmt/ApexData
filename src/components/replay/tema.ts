/**
 * La pantalla del replay va siempre en carbón, sea cual sea el tema de la app.
 *
 * Es una pantalla de ver, como un vídeo: la pista y los coches necesitan un
 * fondo que no compita, y las tintas de las banderas y de los equipos están
 * calibradas contra este fondo. La página de alrededor —cabecera, barra de
 * pestañas— sigue el tema claro u oscuro del usuario.
 *
 * Son los mismos valores del tema oscuro de `globals.css`, escritos en hex
 * porque el canvas no lee variables CSS y aquí no hay tema que resolver.
 */
export const CARBON = {
  fondo: '#0B0B0F',
  superficie: '#151519',
  superficie2: '#1B1B22',
  borde: '#26262E',
  texto: '#F5F5F7',
  apagado: '#A2A2AC',
  lima: '#CCFF00',
} as const;
