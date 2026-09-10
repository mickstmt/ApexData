/**
 * Si hay sitio al que retroceder **dentro de la app**.
 *
 * Los botones de «volver» de las fichas son enlaces al listado, o sea
 * navegación hacia delante: para el router es una página nueva y por eso
 * aterrizan arriba del todo. Medido en las tres fichas: la posición pasaba de
 * 500 px a 0. El gesto de deslizar sí la conservaba —462 px—, y esa diferencia
 * entre el gesto y el botón es justo lo que se sentía raro.
 *
 * Para arreglarlo hay que saber una cosa que el enlace no sabe: si quien lo
 * pulsa llegó desde dentro. Si vino de fuera —un aviso push, un enlace
 * compartido, la app recién abierta— retroceder lo sacaría de ApexData, y ahí
 * el enlace al listado es lo correcto.
 *
 * ## Por qué un contador y no `history.length`
 *
 * `history.length` cuenta también lo que había en la pestaña antes de llegar
 * aquí, así que dice «hay historia» cuando esa historia es de otro sitio. Este
 * contador solo sube con las navegaciones de esta app en esta carga, que es
 * exactamente la pregunta.
 *
 * Se reinicia solo al recargar, y está bien que lo haga: tras una carga
 * completa no hay ningún paso atrás que dar dentro de la app.
 */

let pasosDentroDeLaApp = 0;

/** Lo llama la transición de página cada vez que cambia la dirección. */
export function anotarNavegacion(): void {
  pasosDentroDeLaApp += 1;
}

/** ¿Retroceder devuelve a una pantalla de ApexData? */
export function sePuedeRetroceder(): boolean {
  return pasosDentroDeLaApp > 0;
}

/** Solo para las pruebas: deja el contador como recién cargado. */
export function olvidarNavegaciones(): void {
  pasosDentroDeLaApp = 0;
}
