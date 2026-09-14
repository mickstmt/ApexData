import 'next-auth';
import 'next-auth/jwt';

/**
 * Lo que `next-auth` no sabe de nuestra sesión.
 *
 * De serie, `session.user` trae nombre, correo e imagen pero no el
 * identificador. Nosotros lo necesitamos en cada petición que lee o escribe
 * favoritos: es la clave de la fila de `users`. Se mete en el testigo al
 * entrar y de ahí pasa a la sesión.
 */
declare module 'next-auth' {
  interface Session {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    /** El `id` de la persona en `users`. */
    uid?: string;
  }
}
