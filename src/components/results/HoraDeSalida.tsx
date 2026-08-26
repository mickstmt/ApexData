'use client';

import { useEffect, useState } from 'react';

/**
 * La hora a la que sale la carrera, en el reloj de quien mira.
 *
 * ## Por qué la hora va en local y la fecha no
 *
 * `Race.date` es un día de calendario —la base lo guarda a medianoche UTC— y
 * por eso se escribe siempre en UTC: es el día que publica la F1. La hora de
 * salida, en cambio, es un instante, y la pregunta que responde es «¿a qué hora
 * la veo?», que sólo tiene sentido en el reloj propio.
 *
 * ## La trampa que obliga a llevar el día a cuestas
 *
 * Esas dos decisiones se contradicen cuando el instante local cae en otro día.
 * El Gran Premio de Australia sale a las 04:00Z del domingo; en Lima eso son
 * **las 23:00 del sábado**. Escribir «8 de marzo · 23:00» en la misma línea
 * haría llegar un día tarde a quien lo lea.
 *
 * Medido sobre la base: pasa en **5 de 352** carreras, y una de ellas es
 * Australia todos los años. Por eso la hora lleva el día de la semana delante
 * **sólo cuando no coincide** con el de la fecha: el resto de las veces sería
 * ruido, y aquí es lo único que impide un error de veinticuatro horas.
 *
 * ## Por qué se pinta primero en UTC
 *
 * Servidor y navegador no comparten zona, así que el primer pintado usa UTC
 * —una hora real, no un hueco, que además deja legible la copia que guarda el
 * service worker— y al hidratar se cambia a la local. Es el mismo orden que ya
 * sigue `LocalDateTime`; hacerlo al revés desajusta la hidratación.
 */

/**
 * Escribe la hora, con el día delante sólo si discrepa del de la fecha.
 *
 * Recibe la salida como cadena ISO y no como `Date` a propósito: así todo lo
 * que entra al efecto es un valor primitivo y no un objeto nuevo en cada
 * pintura, que es lo que convierte una sincronización en una cascada.
 */
function escribir(salidaISO: string | null, diaDeLaFecha: number, timeZone?: string): string | null {
  if (!salidaISO) return null;
  const salida = new Date(salidaISO);
  const zona = timeZone ? { timeZone } : {};

  const hora = salida.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...zona,
  });

  const diaMostrado = Number(
    new Intl.DateTimeFormat('en-GB', { day: 'numeric', ...zona }).format(salida)
  );
  if (diaMostrado === diaDeLaFecha) return hora;

  return `${salida.toLocaleDateString('es-ES', { weekday: 'short', ...zona })} ${hora}`;
}

export function HoraDeSalida({
  /** El día de calendario del gran premio, tal como está en la base. */
  fecha,
  /** La hora de salida en UTC, como la manda la fuente: «04:00:00Z». */
  hora,
}: {
  fecha: Date | string;
  hora: string | null;
}) {
  const dia = new Date(fecha);
  // `Race.date` está a medianoche UTC, así que su día se lee en UTC.
  const diaDeLaFecha = dia.getUTCDate();
  const salidaISO = hora ? `${dia.toISOString().slice(0, 10)}T${hora.replace('Z', '')}Z` : null;

  const [texto, setTexto] = useState(() => escribir(salidaISO, diaDeLaFecha, 'UTC'));

  useEffect(() => {
    // La zona horaria del navegador es un sistema externo del que esta página
    // sólo puede enterarse al montar: leerla durante el render haría que
    // servidor y cliente pintaran cosas distintas.
    setTexto(escribir(salidaISO, diaDeLaFecha));
  }, [salidaISO, diaDeLaFecha]);

  if (!texto) return null;

  return (
    <span suppressHydrationWarning className="font-mono tabular-nums">
      {texto}
    </span>
  );
}
