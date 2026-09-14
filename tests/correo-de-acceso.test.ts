import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HORAS_DE_VALIDEZ, cuerpoDelEnlace, enviarEnlaceDeAcceso } from '@/lib/cuentas/correo';

/**
 * El correo con el que se entra sin contraseña.
 *
 * Lo que se prueba aquí es lo que no se ve al mirar el código y sí rompe el
 * acceso de alguien:
 *
 * - **El enlace tiene que estar en las DOS versiones.** Hay clientes de correo
 *   que no pintan HTML, y uno cuya versión de texto solo diga «pulsa aquí» es
 *   inservible en ellos. Además, un enlace a la vista es lo que permite
 *   comprobar a dónde lleva antes de pulsarlo, que en un correo de acceso no es
 *   un detalle.
 * - **Un fallo del envío tiene que lanzar.** `next-auth` decide si enseñar el
 *   aviso de «te lo hemos mandado» según si esto lanzó; tragarse un 4xx dejaría
 *   a alguien esperando un correo que nunca salió.
 */

describe('el cuerpo del correo', () => {
  const ENLACE = 'https://apexdata.meeks.fun/api/auth/callback/email?token=abc&email=a%40b.com';

  it('lleva el enlace entero en texto y en HTML', () => {
    const { texto, html } = cuerpoDelEnlace(ENLACE, 'apexdata.meeks.fun');

    expect(texto).toContain(ENLACE);
    expect(html).toContain(ENLACE);
  });

  it('dice cuánto vale, y dice lo mismo en las dos versiones', () => {
    const { texto, html } = cuerpoDelEnlace(ENLACE, 'apexdata.meeks.fun');

    expect(texto).toContain(`${HORAS_DE_VALIDEZ} horas`);
    expect(html).toContain(`${HORAS_DE_VALIDEZ} horas`);
  });

  it('dice qué hacer si no lo pediste', () => {
    // Es la frase que evita que un correo de acceso inesperado parezca un
    // ataque en curso: sin pulsar el enlace no pasa nada.
    const { texto, html } = cuerpoDelEnlace(ENLACE, 'apexdata.meeks.fun');

    expect(texto).toMatch(/no has pedido entrar/i);
    expect(html).toMatch(/no has pedido entrar/i);
  });
});

describe('el envío', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.stubEnv('RESEND_API_KEY', 'clave-de-prueba');
  });

  it('manda el correo al destinatario, firmado por el remitente configurado', async () => {
    vi.stubEnv('RESEND_FROM', 'ApexData <acceso@meeks.fun>');
    const llamada = vi.fn().mockResolvedValue({ ok: true, text: async () => '' });
    vi.stubGlobal('fetch', llamada);

    await enviarEnlaceDeAcceso('alguien@correo.com', 'https://apexdata.meeks.fun/x?token=1');

    const [url, opciones] = llamada.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(opciones.headers.Authorization).toBe('Bearer clave-de-prueba');

    const enviado = JSON.parse(opciones.body);
    expect(enviado.to).toEqual(['alguien@correo.com']);
    expect(enviado.from).toBe('ApexData <acceso@meeks.fun>');
    expect(enviado.text).toContain('https://apexdata.meeks.fun/x?token=1');
  });

  it('si Resend lo rechaza, lanza con el motivo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => '{"message":"The meeks.fun domain is not verified"}',
      })
    );

    // Y el motivo va dentro: sin él, en los registros del servidor solo queda
    // un 403 sin explicación y no hay por dónde empezar.
    await expect(
      enviarEnlaceDeAcceso('alguien@correo.com', 'https://apexdata.meeks.fun/x')
    ).rejects.toThrow(/403.*not verified/s);
  });
});
