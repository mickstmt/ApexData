/**
 * Peticiones que solo pueden venir de un escáner.
 *
 * No es seguridad: es silencio. Lo que se rechaza aquí ya lo rechazaba Next por
 * su cuenta, sin ejecutar nada. La diferencia es que lo rechazaba **gritando**,
 * y el registro del contenedor acababa siendo ilegible.
 */

/**
 * La cabecera que Next usa para llamar a una Server Action.
 *
 * Un identificador de verdad son cuarenta caracteres hexadecimales. Lo que
 * llega en los sondeos son `0`, `1`, `action`, `x` — una lista de palabras
 * recorrida en bucle, buscando la vulnerabilidad de Server Actions de 2024.
 */
const CABECERA_DE_ACCION = 'next-action';

/**
 * ¿Es un sondeo de Server Actions?
 *
 * ## Por qué se puede rechazar todo sin mirar
 *
 * **ApexData no tiene ni una Server Action.** Ni un `'use server'`, ni un
 * `<form>` con acción de servidor: los datos se leen en el servidor y se
 * escriben por rutas de `/api/`. Así que cualquier petición que traiga esta
 * cabecera es, por definición, de alguien que no es la aplicación.
 *
 * Esa afirmación es la que sostiene esta función entera, y por eso hay una
 * prueba —`tests/sondeos.test.ts`— que recorre el código y **falla si algún día
 * aparece una Server Action**. Sin ella, quien añadiera la primera se
 * encontraría con que no funciona y sin ninguna pista de por qué.
 *
 * ## Por qué 404 y no 400
 *
 * Un 400 confirma que la cabecera se entendió y que había algo que entender. Un
 * 404 no dice nada, que es exactamente lo que merece quien va probando puertas.
 */
export function esSondeoDeServerAction(metodo: string, cabeceras: Headers): boolean {
  if (metodo !== 'POST') return false;
  return cabeceras.has(CABECERA_DE_ACCION);
}
