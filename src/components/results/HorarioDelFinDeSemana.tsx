import { CalendarClock } from 'lucide-react';
import { estadoDeSesion, sesionesOrdenadas, type FinDeSemana } from '@/lib/sesiones';

/**
 * El horario del fin de semana: una fila por sesión, con su día y su hora.
 *
 * ## Por qué una columna y filas de 36 px
 *
 * Medido a 358 px con la tipografía real. La rejilla de dos columnas que usa la
 * portada ocupa 218 px frente a los 222 de una sola columna —cuatro píxeles— y
 * a cambio obliga a meter la fecha entera dentro de cada celda, repitiendo el
 * mes cinco veces y sin que las horas lleguen a formar columna. En una sola, el
 * día se comprime a «VIE 6» y las cinco horas caen en un mismo borde derecho.
 *
 * Las filas son de 36 y no de 44 porque **no son objetivos táctiles**: aquí son
 * texto, no enlaces. La barra de pestañas está justo encima y ya lleva a cada
 * sesión; enlazar también desde aquí sería duplicar un control que está a 32 px.
 *
 * ## Por qué el día sale del instante de cada sesión
 *
 * No de la fecha de la carrera. Que «las prácticas son en viernes» es verdad o
 * mentira según quién mire: en Lima, una carrera de las 04:00Z sale el día
 * anterior. Cada fila calcula el suyo, y en UTC primero —igual que el servidor—
 * para no desajustar la hidratación. Ni el día ni la hora cambian el alto, así
 * que el cambio al hidratar no mueve la maqueta.
 */

/**
 * Si una sesión trae hora de verdad o sólo una fecha disfrazada de instante.
 *
 * La fuente publica la hora de las sesiones **desde 2022**; antes sólo da el
 * día, y el sembrado lo guarda como medianoche UTC. Sin este filtro, las doce
 * temporadas anteriores pintarían un horario con «00:00» en todas las filas,
 * que es peor que no enseñar nada: no es un hueco, es un dato falso.
 *
 * Medianoche exacta vale como señal, y está comprobado: de las 352 carreras,
 * ninguna sesión de 2022 en adelante cae en 00:00:00Z, y el reparto sale limpio
 * en 237 fines de semana sólo con fecha y 115 con horas reales.
 */
function traeHora(cuando: Date): boolean {
  return cuando.getUTCHours() !== 0 || cuando.getUTCMinutes() !== 0 || cuando.getUTCSeconds() !== 0;
}

const ESTILO_DEL_DIA: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric' };
const ESTILO_DE_LA_HORA: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
};

function escribir(cuando: Date, timeZone?: string) {
  const zona = timeZone ? { timeZone } : {};
  return {
    dia: cuando.toLocaleDateString('es-ES', { ...ESTILO_DEL_DIA, ...zona }).toUpperCase(),
    hora: cuando.toLocaleTimeString('es-ES', { ...ESTILO_DE_LA_HORA, ...zona }),
  };
}

export function HorarioDelFinDeSemana({
  carrera,
  comienzoDeLaCarrera,
  /**
   * La hora actual, o `null` antes de hidratar.
   *
   * Se recibe en vez de leerse aquí para que toda la página comparta el mismo
   * instante: dos relojes distintos en la misma pintura pueden marcar sesiones
   * distintas como «la próxima».
   */
  ahora,
}: {
  carrera: FinDeSemana;
  comienzoDeLaCarrera: Date;
  ahora: number | null;
}) {
  const sesiones = sesionesOrdenadas(carrera, comienzoDeLaCarrera).filter((sesion) =>
    traeHora(sesion.cuando)
  );

  // Se pinta en UTC en el primer render y se cambia a la zona del navegador al
  // montar, que es el único orden que no desajusta la hidratación. No hace
  // falta estado propio para saberlo: `ahora` es nulo hasta que la página
  // monta, que es exactamente la misma señal.
  const local = ahora !== null;

  // Con una sola sesión no hay horario que enseñar: es la propia carrera, cuya
  // hora ya está en la cabecera. Es lo que pasa en las temporadas anteriores a
  // 2022, donde la fuente no publica la hora de las sesiones.
  if (sesiones.length < 2) return null;

  const estados = sesiones.map((sesion) =>
    ahora === null ? 'pendiente' : estadoDeSesion(sesion.nombre, sesion.cuando, ahora)
  );
  // La primera pendiente es la que viene. Si el fin de semana ya terminó no hay
  // ninguna, y entonces tampoco se atenúa nada: cinco filas al 55 % son un
  // bloque gris sin contraste interno, y atenuar sólo significa algo frente a
  // algo vivo.
  const proxima = ahora === null ? -1 : estados.indexOf('pendiente');
  const enCurso = estados.indexOf('en-curso');
  const terminado = ahora !== null && proxima === -1 && enCurso === -1;

  return (
    <section
      aria-labelledby="horario"
      className="rounded-lg border border-border bg-card p-6"
    >
      <h2 id="horario" className="mb-3 flex items-center gap-2 text-xl font-bold">
        <CalendarClock aria-hidden className="h-5 w-5 text-primary" />
        Horario del fin de semana
      </h2>

      <dl className="m-0">
        {sesiones.map((sesion, indice) => {
          const { dia, hora } = escribir(sesion.cuando, local ? undefined : 'UTC');
          const estado = estados[indice];
          const esProxima = indice === proxima;
          const esAhora = estado === 'en-curso';
          const atenuada = !terminado && estado === 'pasada';

          return (
            <div
              key={sesion.nombre}
              {...(esProxima || esAhora ? { 'aria-current': 'step' as const } : {})}
              className={`flex min-h-[2.25rem] items-center justify-between gap-3 border-l-[3px] pl-2.5 ${
                esProxima || esAhora ? 'border-primary' : 'border-transparent'
              } ${atenuada ? 'opacity-55' : ''}`}
            >
              <dt className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                <span className="truncate">{sesion.nombre}</span>
                {esAhora ? (
                  <span className="shrink-0 rounded bg-live/15 px-1.5 py-0.5 font-mono text-[0.625rem] font-bold tracking-wider text-live">
                    EN CURSO
                  </span>
                ) : esProxima ? (
                  <span className="shrink-0 rounded bg-primary px-1.5 py-0.5 font-mono text-[0.625rem] font-bold tracking-wider text-primary-foreground">
                    PRÓXIMA
                  </span>
                ) : null}
              </dt>
              <dd className="m-0 flex shrink-0 items-baseline gap-2.5">
                <span
                  suppressHydrationWarning
                  className="w-[3.25rem] text-right font-mono text-[0.6875rem] font-bold text-muted-foreground"
                >
                  {dia}
                </span>
                <span
                  suppressHydrationWarning
                  className="w-11 text-right font-mono text-sm tabular-nums"
                >
                  {hora}
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
