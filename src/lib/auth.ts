import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

import { proveedorDeCorreo } from '@/lib/cuentas/correo';
import { hayCorreo, hayGoogle } from '@/lib/cuentas/disponible';
import { prisma } from '@/lib/prisma';

/**
 * Las cuentas de ApexData.
 *
 * ## Qué resuelven, y por qué son opcionales
 *
 * Los favoritos vivían en el `localStorage` de cada navegador, y eso rompía
 * tres cosas: no viajaban entre aparatos —ni siquiera entre la PWA instalada y
 * Safari en el MISMO iPhone, que tienen almacenamientos separados—, se podían
 * perder sin avisar si iOS recuperaba espacio, y los avisos dependían del
 * navegador y no de la persona.
 *
 * La cuenta es **opcional y lo seguirá siendo**. Sin entrar, la app funciona
 * exactamente igual que antes; entrar solo añade que tus cosas te sigan.
 *
 * ## Por qué la sesión va en una cookie y no en la base
 *
 * Con `strategy: 'jwt'` la sesión viaja firmada en una cookie. La alternativa
 * —guardarla en la tabla `sessions`— costaría una ida y vuelta a la base por
 * cada petición autenticada solo para saber quién eres, y la base está en
 * Virginia: eso se nota en cada pantalla.
 *
 * El adaptador se queda igualmente, porque es quien crea la persona y ata su
 * cuenta de Google. Lo único que no se usa es la tabla de sesiones, que existe
 * porque el adaptador la exige. El precio de la cookie es no poder cerrar la
 * sesión de otro aparato al instante; si algún día hace falta, se cambia esta
 * línea y esa tabla empieza a usarse sin migrar nada.
 *
 * ## Por qué el proveedor es condicional
 *
 * Sin credenciales no se declara ninguno, y la app arranca igual con el botón
 * de entrar apagado. Es el mismo trato que se le da al servicio de telemetría:
 * lo que falta se dice, no se rompe. Sin esto, ni el CI ni un arranque en
 * local sin secretos podrían levantar la app.
 */

const CLIENTE = process.env.GOOGLE_CLIENT_ID;
const SECRETO = process.env.GOOGLE_CLIENT_SECRET;

/**
 * ¿Hay con qué entrar?
 *
 * La misma pregunta que hace la interfaz para no ofrecer lo que no existe, pero
 * ella la hace a través de `@/lib/cuentas/disponible`, que no arrastra nada.
 */
export const hayProveedores = hayGoogle();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    ...(hayProveedores
      ? [
        GoogleProvider({
          clientId: CLIENTE!,
          clientSecret: SECRETO!,
          /**
           * Lo mínimo, y a propósito.
           *
           * `openid email profile` son permisos básicos: Google no los somete a
           * revisión, así que la app se puede publicar sin pasar por su proceso.
           * Pedir más obligaría a esa revisión y a guardar datos que aquí no
           * hacen falta para nada.
           */
          authorization: { params: { scope: 'openid email profile' } },
        }),
      ]
      : []),
    /**
     * Y el correo, si hay con qué enviarlo.
     *
     * Va como objeto y no como `EmailProvider(...)` porque ese módulo carga
     * `nodemailer` en su primera línea y aquí no se habla SMTP: se envía por la
     * API de Resend. Ver `@/lib/cuentas/correo`.
     *
     * El molde viene del tipo `EmailConfig` de next-auth, que arrastra tipos de
     * `nodemailer` para un campo —`server`— que este proveedor no usa. De ahí
     * la conversión: lo que se declara arriba SÍ tiene la forma que next-auth
     * lee en tiempo de ejecución.
     */
    ...(hayCorreo()
      ? [proveedorDeCorreo() as unknown as NextAuthOptions['providers'][number]]
      : []),
  ],

  /**
   * La pantalla de error, en español.
   *
   * La de serie dice «Unable to sign in» y no explica cuál de los motivos
   * posibles es. Un enlace de acceso caducado —llega al correo y se abre al día
   * siguiente— es lo más normal del mundo y merece una frase, no un cartel.
   *
   * Las demás pantallas de next-auth no se sustituyen porque no se ven: se
   * entra desde el panel de ajustes, y el envío del enlace se resuelve ahí
   * mismo sin salir de la página.
   */
  pages: { error: '/acceso/error' },

  session: { strategy: 'jwt' },

  callbacks: {
    /**
     * El identificador de la persona viaja en el testigo.
     *
     * `user` solo llega en el momento de entrar; en las demás vueltas el
     * testigo ya lo trae. Sin esto, la sesión sabría el correo pero no a qué
     * fila de `users` corresponde, que es lo que hace falta para leer y
     * escribir sus favoritos.
     */
    jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },

    session({ session, token }) {
      if (session.user && typeof token.uid === 'string') session.user.id = token.uid;
      return session;
    },
  },
};
