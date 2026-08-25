/**
 * El color del dorsal según el puesto.
 *
 * Antes el primero iba en oro y el segundo y el tercero compartían el acento
 * de la marca, así que **la plata y el bronce no se veían en ninguna parte**:
 * los tres tokens existían desde el principio pero sólo se usaban en un bloque
 * que estaba después de la tabla.
 *
 * ## Por qué borde y no sólo relleno
 *
 * La plata *es* gris. Un relleno gris al 20 % sobre una tarjeta gris da ΔE 8,8
 * contra el dorsal neutro del cuarto en tema oscuro y 7,8 en claro: por debajo
 * del umbral al que se distinguen dos rellenos en un elemento pequeño. Medido,
 * no estimado. El borde va a color pleno y contrasta 8,7:1 contra la tarjeta,
 * así que es él quien hace el trabajo; el relleno sólo acompaña.
 *
 * El número sigue dentro del dorsal, que es lo que cumple la 1.4.1: en tema
 * claro el oro y el bronce dan ΔE 1,2 en deuteranopía —el umbral está en 2,3—,
 * o sea que para cerca del 6 % de los hombres son el mismo color.
 */

const MEDALLAS = [
  'bg-podium-gold/20 text-podium-gold ring-[1.5px] ring-inset ring-podium-gold',
  'bg-podium-silver/20 text-podium-silver ring-[1.5px] ring-inset ring-podium-silver',
  'bg-podium-bronze/20 text-podium-bronze ring-[1.5px] ring-inset ring-podium-bronze',
] as const;

const SIN_MEDALLA = 'bg-muted/50 text-foreground';

/**
 * Las clases del recuadro de posición.
 *
 * `posición` es la de clasificación, no el índice de la fila: quien no termina
 * no tiene, y quien queda cuarto tras una descalificación puede estar tercero
 * en la lista sin haber subido al podio.
 */
export function clasesDeDorsal(posición: number | null | undefined): string {
  if (posición === null || posición === undefined || posición < 1 || posición > 3) {
    return SIN_MEDALLA;
  }
  return MEDALLAS[posición - 1];
}
