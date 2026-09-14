/**
 * ¿Hay con qué entrar?
 *
 * Vive aparte de `@/lib/auth` a propósito: preguntarlo no debería obligar a
 * arrastrar `next-auth`, el adaptador y Prisma. El armazón de la app lo consulta
 * en cada página —para no ofrecer un botón de entrar que no lleva a ningún
 * sitio— y esa pregunta es una comparación de dos cadenas.
 *
 * Es una función y no una constante porque en el servidor de desarrollo las
 * variables de entorno pueden llegar después del primer módulo cargado; una
 * constante se quedaría con la foto del arranque.
 */
export function hayCuentas(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}
