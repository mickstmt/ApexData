import NextAuth from 'next-auth';

import { authOptions } from '@/lib/auth';

/**
 * Las rutas de la sesión: entrar, salir, el testigo y la vuelta de Google.
 *
 * Es el único sitio del árbol donde vive `NextAuth`. Todo lo que decide está
 * en `@/lib/auth`, que no importa nada de Next y por eso se puede leer y
 * probar sin levantar un servidor.
 */
const manejador = NextAuth(authOptions);

export { manejador as GET, manejador as POST };
