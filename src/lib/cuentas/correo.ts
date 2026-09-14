/**
 * Entrar con el correo, sin contraseña.
 *
 * ## Qué es
 *
 * El segundo proveedor, junto a Google, y el que el usuario pidió tras ver el
 * acceso de Flashscore: «también se puede registrar simplemente con email». Se
 * escribe la dirección, llega un enlace, y al pulsarlo se entra. No hay
 * contraseña que recordar ni que perder, y no hay que guardar ningún secreto de
 * nadie — que es justamente lo que uno no quiere custodiar.
 *
 * ## Por qué no se usa el proveedor de correo de next-auth
 *
 * Porque arrastra `nodemailer`, que aquí no hace falta: `next-auth/providers/email`
 * lo carga en la primera línea del módulo, así que basta importarlo para
 * necesitarlo instalado, y su único trabajo sería hablar SMTP. Resend expone
 * una API de HTTP, así que enviar es un `fetch`. El proveedor se declara a mano
 * —son seis campos— y no entra una dependencia más en la imagen.
 *
 * ## Por qué es opcional, igual que Google
 *
 * Sin `RESEND_API_KEY` no se declara, la app arranca igual y en la pantalla
 * solo aparece Google. Es el mismo trato que reciben el servicio de telemetría
 * y las credenciales de Google: lo que falta se dice, no se rompe.
 */

/** Cuánto vale el enlace. Un día es lo que trae next-auth de serie. */
export const HORAS_DE_VALIDEZ = 24;

/**
 * Quién firma el correo.
 *
 * Tiene que ser una dirección del dominio verificado en Resend (`meeks.fun`) o
 * Amazon lo rechaza antes de salir. Se deja configurable porque el dominio de
 * producción y el de una prueba no tienen por qué ser el mismo.
 */
function remitente(): string {
  return process.env.RESEND_FROM ?? 'ApexData <acceso@meeks.fun>';
}

/**
 * El correo, en texto y en HTML.
 *
 * Las dos versiones dicen lo MISMO y llevan el enlace completo: hay clientes
 * que no pintan HTML, y un correo cuya versión de texto solo diga «pulsa aquí»
 * es un correo inservible en ellos. Además, un enlace a la vista es lo que
 * permite comprobar a dónde lleva antes de pulsarlo, que en un correo de acceso
 * no es un detalle.
 */
export function cuerpoDelEnlace(enlace: string, anfitrion: string) {
  const texto = [
    `Entrar en ApexData`,
    ``,
    `Pulsa este enlace para entrar en tu cuenta:`,
    enlace,
    ``,
    `El enlace vale ${HORAS_DE_VALIDEZ} horas y solo se puede usar una vez.`,
    ``,
    `Si no has pedido entrar en ${anfitrion}, ignora este correo: sin pulsar el`,
    `enlace no pasa nada.`,
  ].join('\n');

  // Sin hoja de estilos ni imágenes: un correo no las tiene garantizadas, y
  // este solo necesita decir una cosa. Los colores van a fuego porque en un
  // correo no hay variables de CSS.
  const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:24px;background:#f2f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#14141a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #d8d8df;border-radius:14px">
    <tr><td style="padding:28px 28px 8px">
      <p style="margin:0 0 18px;font-size:20px;font-weight:700;letter-spacing:-0.01em">Apex<span style="color:#526600">Data</span></p>
      <p style="margin:0 0 6px;font-size:17px;font-weight:600">Entrar en tu cuenta</p>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#5c5c68">
        Pulsa el botón y entras. No hay contraseña que recordar.
      </p>
      <a href="${enlace}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#526600;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none">Entrar en ApexData</a>
      <p style="margin:20px 0 0;font-size:12.5px;line-height:1.6;color:#5c5c68">
        El enlace vale ${HORAS_DE_VALIDEZ} horas y solo se puede usar una vez.
        Si el botón no funciona, copia esta dirección:
      </p>
      <p style="margin:6px 0 0;font-size:12px;line-height:1.5;word-break:break-all;color:#5c5c68">${enlace}</p>
    </td></tr>
    <tr><td style="padding:16px 28px 26px;border-top:1px solid #e8e8ee">
      <p style="margin:0;font-size:12px;line-height:1.6;color:#5c5c68">
        Si no has pedido entrar en ${anfitrion}, ignora este correo: sin pulsar el enlace no pasa nada.
      </p>
    </td></tr>
  </table>
</body>
</html>`;

  return { texto, html };
}

/** Manda el correo por Resend. Lanza si no sale, que es lo que next-auth espera. */
export async function enviarEnlaceDeAcceso(destinatario: string, enlace: string) {
  const { host } = new URL(enlace);
  const { texto, html } = cuerpoDelEnlace(enlace, host);

  const respuesta = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: remitente(),
      to: [destinatario],
      subject: 'Entrar en ApexData',
      text: texto,
      html,
    }),
  });

  if (!respuesta.ok) {
    // El cuerpo del error de Resend dice qué pasó —dominio sin verificar, clave
    // mala, dirección rechazada— y sin él aquí solo quedaría un 4xx sin
    // explicación en los registros del servidor.
    const detalle = await respuesta.text().catch(() => '');
    throw new Error(`Resend rechazó el envío (${respuesta.status}): ${detalle}`);
  }
}

/**
 * El proveedor, con la forma que `next-auth` espera de uno de correo.
 *
 * `server` está porque el tipo lo exige y no se usa: quien envía es
 * `sendVerificationRequest`, y ahí no hay SMTP ninguno.
 */
export function proveedorDeCorreo() {
  return {
    id: 'email',
    type: 'email',
    name: 'Email',
    server: {},
    from: remitente(),
    maxAge: HORAS_DE_VALIDEZ * 60 * 60,
    options: {},
    async sendVerificationRequest({ identifier, url }: { identifier: string; url: string }) {
      await enviarEnlaceDeAcceso(identifier, url);
    },
  };
}
