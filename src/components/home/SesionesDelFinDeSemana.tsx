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
 * A dónde lleva cada sesión: a su pestaña en la ficha de la carrera.
 *
 * Las prácticas y la clasificación al sprint iban a Análisis, y con razón
 * mientras la ficha solo sabía enseñar un cartel diciendo que Jolpica no las
 * publica: mandarlas allí era llevar a alguien a leer que no hay nada. Ahora
 * esas pestañas piden los tiempos a la cronometría y los enseñan, así que el
 * desvío ya no tiene sentido — desde la portada se entra a la ficha del fin de
 * semana, sin cambiar de sección a mitad de camino.
 *
 * Análisis sigue estando, y su enlace directo también: es la herramienta para
 * comparar vueltas, no el sitio al que ir a ver quién fue el más rápido.
 */
const DESTINO: Record<string, string> = {
  Carrera: 'race',
  Clasificación: 'qualifying',
  Sprint: 'sprint',
  'Clasif. sprint': 'sprint-qualifying',
  'Práctica 1': 'practice1',
  'Práctica 2': 'practice2',
  'Práctica 3': 'practice3',
};

function enlaceDe(nombre: string, year: number, round: number): string {
  const pestaña = DESTINO[nombre];
  if (pestaña) return `/results/${year}/${round}?sesion=${pestaña}`;
  return `/results/${year}/${round}`;
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

  /*
   * La última sesión ocupa dos huecos, y con eso desaparece el recuadro vacío.
   *
   * Los dos formatos de fin de semana dan **cinco** sesiones: el normal (tres
   * prácticas, clasificación y carrera) y el del sprint (una práctica, clasif.
   * al sprint, sprint, clasificación y carrera). Cinco en una rejilla de dos,
   * tres o seis columnas siempre deja un hueco suelto al final, justo al lado
   * de CARRERA. Con la última ocupando dos, la cuenta sale exacta en los tres
   * anchos: 6 huecos en 2 columnas son 3 filas, en 3 columnas 2 filas, y en 6
   * columnas una sola fila.
   *
   * Se comprueba el cinco en vez de darlo por hecho: si algún fin de semana
   * llegara con otro número de sesiones, ensanchar la última descuadraría la
   * rejilla en vez de arreglarla, y es mejor volver al hueco vacío que a una
   * fila rota.
   */
  const ultima = sesiones.length - 1;
  const carreraAncha = sesiones.length === 5;

  return (
    <ul className="grid grid-cols-2 divide-border sm:grid-cols-3 lg:grid-cols-6">
      {sesiones.map((sesion, indice) => {
        const estado = estados[indice];
        const esProxima = indice === proxima;
        const enCurso = estado === 'en-curso';
        // La carrera es el acto principal: al ocupar el doble de ancho, se le
        // da también el doble de presencia en vez de dejarla flotando.
        const anchaYPrincipal = carreraAncha && indice === ultima;

        return (
          <li
            key={sesion.nombre}
            aria-current={esProxima || enCurso ? 'step' : undefined}
            className={`border-b border-r border-border last:border-r-0 ${
              carreraAncha && indice === ultima ? 'col-span-2' : ''
            } ${enCurso || esProxima ? 'bg-primary/5' : ''} ${
              estado === 'pasada' ? 'opacity-55' : ''
            }`}
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

            <div className={`mt-0.5 ${anchaYPrincipal ? 'text-base font-semibold sm:text-lg' : 'text-sm'}`}>
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
