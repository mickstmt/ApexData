import Link from 'next/link';

import { CountryFlag } from '@/components/ui/CountryFlag';
import { RaceCountdown, LocalDateTime } from '@/components/home/RaceCountdown';
import { prisma } from '@/lib/prisma';
import { raceStart } from '@/lib/race-time';

/**
 * La próxima carrera, en una tarjeta estrecha.
 *
 * Nace de la columna de contexto de Clasificación: a la derecha de la tabla
 * quedaba sitio, y lo que se quiere saber al mirar quién va primero es cuándo
 * se corre la siguiente. Estaba en la maqueta que el usuario aprobó y no llegó
 * a construirse en su momento.
 *
 * ## Por qué tiene su propia consulta
 *
 * El cálculo de «cuál es la siguiente» vivía suelto dentro de la portada,
 * mezclado con su caché. Sacarlo entero de allí es tocar la página más visitada
 * de la app para ganar nada; en vez de eso, esto pide una fila —la primera
 * carrera cuya salida aún no ha pasado— y ya está. Es una consulta de índice
 * sobre `date`.
 *
 * No se cachea a propósito, por lo mismo que la portada tampoco cachea esta
 * parte: congelar cinco minutos cuál es la próxima carrera justo cuando deja de
 * serlo es el único momento en que el dato importa.
 */
export async function ProximaCarrera() {
  const ahora = new Date();

  let carrera;
  try {
    carrera = await prisma.race.findFirst({
      // Un día de margen hacia atrás: `date` es el día y la hora va aparte, así
      // que filtrar por `>= hoy` a secas descartaría la carrera de esta misma
      // tarde. El descarte fino lo hace `raceStart` unas líneas más abajo.
      where: { date: { gte: new Date(ahora.getTime() - 24 * 60 * 60 * 1000) } },
      orderBy: [{ date: 'asc' }],
      include: { circuit: { select: { name: true, location: true, country: true } } },
    });
  } catch (error) {
    // Una tarjeta de contexto no puede tumbar la clasificación.
    console.error('No se pudo leer la próxima carrera:', error);
    return null;
  }

  if (!carrera) return null;

  const salida = raceStart(carrera);
  if (salida.getTime() < ahora.getTime()) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-display text-base font-bold">Próxima carrera</h2>
      </div>

      <div className="px-4 py-4">
        <p className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
          <CountryFlag country={carrera.circuit.country} size={16} />
          <span className="truncate">
            {carrera.circuit.name} · {carrera.circuit.location}
          </span>
        </p>

        <Link
          href={`/results/${carrera.year}/${carrera.round}`}
          transitionTypes={['nav-forward']}
          className="mb-1 block font-display text-lg font-bold leading-tight hover:text-primary"
        >
          {carrera.raceName}
        </Link>

        <p className="mb-3 text-xs text-muted-foreground">
          <LocalDateTime value={salida.toISOString()} />
        </p>

        <RaceCountdown target={salida.toISOString()} />
      </div>
    </section>
  );
}
