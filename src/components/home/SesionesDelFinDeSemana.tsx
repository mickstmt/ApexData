'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LocalDateTime, RaceCountdown } from '@/components/home/RaceCountdown';
import { estadoDeSesion } from '@/lib/sesiones';

/**
 * La tira de sesiones del fin de semana, con la siguiente señalada.
 *
 * Cuál es «la siguiente» depende de qué hora es **ahora**, y eso el servidor no
 * lo puede decidir: la portada se sirve cacheada, así que una respuesta guardada
 * a las tres seguiría señalando la práctica a las siete. Por eso el reparto se
 * hace en el navegador, después de montar, y hasta entonces la tira se pinta sin
 * destacar nada — que es exactamente lo que se veía antes.
 *
 * Una sesión no desaparece en cuanto empieza: se queda marcada como **en curso**
 * durante su duración aproximada, porque decir «la próxima es la clasificación»
 * mientras la práctica está rodando sería mentir por precisión mal entendida.
 */

export interface SesionParaLaTira {
  nombre: string;
  /** En ISO, para que el navegador la pase a su huso. */
  cuando: string;
}

/**
 * A dónde lleva cada sesión.
 *
 * Las tres que publica Jolpica van a su pestaña en la ficha de la carrera; las
 * demás, a Análisis, que es donde sí están sus tiempos porque vienen de FastF1.
 * Enviar una práctica a la ficha sería llevar a alguien a un cartel que explica
 * que ahí no hay nada.
 *
 * Y va **a esa sesión**, no a la pantalla de análisis a secas. Antes el enlace
 * era `/analysis` pelado: se abría con el último Gran Premio con resultados
 * elegido —otro fin de semana, otra sesión— y parecía que el enlace se hubiera
 * equivocado de sitio. Ahora el Gran Premio y la sesión viajan en la dirección.
 */
const DESTINO: Record<string, { pestaña?: string; analisis?: string }> = {
  Carrera: { pestaña: 'race' },
  Clasificación: { pestaña: 'qualifying' },
  Sprint: { pestaña: 'sprint' },
  'Clasif. sprint': { analisis: 'SQ' },
  'Práctica 1': { analisis: 'FP1' },
  'Práctica 2': { analisis: 'FP2' },
  'Práctica 3': { analisis: 'FP3' },
};

function enlaceDe(nombre: string, year: number, round: number): string {
  const destino = DESTINO[nombre];
  if (destino?.pestaña) return `/results/${year}/${round}?sesion=${destino.pestaña}`;
  if (destino?.analisis) {
    return `/analysis?anio=${year}&ronda=${round}&sesion=${destino.analisis}`;
  }
  return '/analysis';
}


export function SesionesDelFinDeSemana({
  sesiones,
  year,
  round,
}: {
  sesiones: SesionParaLaTira[];
  year: number;
  round: number;
}) {
  const [ahora, setAhora] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAhora(Date.now());

    // Cada minuto, como la cuenta atrás: sin esto, la sesión seguiría marcada
    // como próxima después de empezar en una pestaña que lleve horas abierta.
    const reloj = setInterval(() => setAhora(Date.now()), 60_000);
    return () => clearInterval(reloj);
  }, []);

  const estados = sesiones.map((sesion) =>
    ahora === null
      ? ('sin-saber' as const)
      : estadoDeSesion(sesion.nombre, new Date(sesion.cuando), ahora)
  );

  const proxima = estados.indexOf('pendiente');

  return (
    <ul className="grid grid-cols-2 divide-border sm:grid-cols-3 lg:grid-cols-6">
      {sesiones.map((sesion, indice) => {
        const estado = estados[indice];
        const esProxima = indice === proxima;
        const enCurso = estado === 'en-curso';

        return (
          <li
            key={sesion.nombre}
            aria-current={esProxima || enCurso ? 'step' : undefined}
            className={`border-b border-r border-border last:border-r-0 ${
              enCurso || esProxima ? 'bg-primary/5' : ''
            } ${estado === 'pasada' ? 'opacity-55' : ''}`}
          >
            <Link
              href={enlaceDe(sesion.nombre, year, round)}
              className="block p-3 ring-offset-background transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {sesion.nombre}
              {enCurso && (
                <span className="inline-flex items-center gap-1 text-live">
                  {/* El punto no parpadea con «reducir movimiento»: la regla
                      global deja la animación en 0,01 ms. */}
                  <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
                  En curso
                </span>
              )}
            </div>

            <div className="mt-0.5 text-sm">
              <LocalDateTime value={sesion.cuando} />
            </div>

            {esProxima && (
              <div className="mt-0.5">
                <RaceCountdown target={sesion.cuando} />
              </div>
            )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
