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
export function hayGoogle(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** ¿Y con qué mandar un enlace de acceso por correo? */
export function hayCorreo(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * ¿Se puede entrar de alguna manera?
 *
 * Con una vía basta para que la cuenta exista; de cuáles son se encarga la
 * pantalla, que enseña una fila por cada una.
 */
export function hayCuentas(): boolean {
  return hayGoogle() || hayCorreo();
}

/** Las vías de acceso que hay hoy, para pintar una fila por cada una. */
export interface ViasDeAcceso {
  google: boolean;
  correo: boolean;
}

export function viasDeAcceso(): ViasDeAcceso {
  return { google: hayGoogle(), correo: hayCorreo() };
}
