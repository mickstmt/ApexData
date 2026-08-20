/**
 * Qué temporadas cubre ApexData, en un solo sitio.
 *
 * Antes cada comando llevaba sus años escritos a mano —`seed:all` repetía
 * «2023 2024 2025 2026» dos veces— y por eso el comando documentado para
 * reconstruir la base **solo reproducía 4 de las 17 temporadas** que hay en
 * producción. Es la clase de deuda que no se nota hasta el día que hay que
 * levantar la base de cero, que es justo el día en que no se puede improvisar.
 *
 * El año final no se fija: sale del reloj, así que en enero entra la temporada
 * nueva sin tocar nada. Si Jolpica todavía no publica su calendario, el
 * sembrador lo dice y sigue.
 */

/** La primera temporada con datos completos en Jolpica para este proyecto. */
export const PRIMERA_TEMPORADA = 2010;

/**
 * Las carreras al sprint existen desde 2021: pedirlas para los años anteriores
 * son ~20 peticiones por temporada que siempre vuelven vacías.
 */
export const PRIMERA_TEMPORADA_SPRINT = 2021;

export function temporadas(hasta = new Date().getFullYear()): number[] {
  const años: number[] = [];
  for (let año = PRIMERA_TEMPORADA; año <= hasta; año++) años.push(año);
  return años;
}

/**
 * Traduce los argumentos de la línea de comandos a una lista de años.
 *
 * - `--todas` (o `--all`): todo lo que cubre el proyecto.
 * - `--current`: solo el año en curso.
 * - años sueltos: los que se pidan.
 */
export function anosPedidos(args: string[], hoy = new Date().getFullYear()): number[] {
  if (args.includes('--todas') || args.includes('--all')) return temporadas(hoy);
  if (args.includes('--current')) return [hoy];

  return args.map(Number).filter((año) => Number.isInteger(año) && año >= 1950);
}
