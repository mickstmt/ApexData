'use client';

import { CalendarClock, Construction, Radio } from 'lucide-react';
import Link from 'next/link';
import { LocalDateTime, RaceCountdown } from '@/components/home/RaceCountdown';
import { Parrilla, ParrillaDesdeTiempos } from './ParrillaProvisional';
import type { QueEnseñar } from '@/lib/sesiones';
import type { Driver, Qualifying, Team } from '@prisma/client';

/**
 * Lo que se enseña cuando una sesión todavía no tiene resultados.
 *
 * Antes había una sola pantalla —«En Desarrollo»— para tres situaciones que
 * para quien mira son completamente distintas: que la sesión aún no se ha
 * corrido, que acaba de correrse y los resultados no han llegado, o que esa
 * sesión nunca va a tener datos por esta vía. Ahora cada una dice lo suyo.
 *
 * Y cuando la carrera aún no ha salido pero la clasificación ya se corrió, en
 * vez de un hueco se enseña **la parrilla**, que es información de verdad y es
 * justo lo que se quiere mirar el domingo por la mañana. Con su advertencia: no
 * es la parrilla definitiva, porque las sanciones se aplican después y nuestra
 * fuente no las publica hasta que hay resultados.
 */

export type ParrillaProvisional = (Qualifying & { driver: Driver; team: Team })[];

export function SesionPendiente({
  estado,
  nombre,
  parrilla,
  reconstruir,
}: {
  estado: QueEnseñar;
  nombre: string;
  /** El orden de la clasificación, si ya se corrió y ya está en la base. */
  parrilla?: ParrillaProvisional;
  /**
   * De qué sesión reconstruir la parrilla cuando la base no la tiene.
   *
   * Es el caso del sprint: lo ordena la clasificación al sprint, que Jolpica
   * no publica nunca, así que la única forma de enseñarla el sábado por la
   * mañana es rehacerla desde la cronometría de FastF1.
   */
  reconstruir?: { year: number; round: number; sesion: 'Q' | 'SQ' };
}) {
  // `resultados` no llega nunca aquí —para eso están las tablas—, pero el tipo
  // lo admite y sin esta salida el resto no puede leer `cuando`.
  if (estado.tipo === 'resultados') return null;

  if (estado.tipo === 'sin-fuente') {
    return (
      <div className="rounded-lg border border-border bg-card p-10 text-center">
        <Construction className="mx-auto mb-4 h-12 w-12 text-muted-foreground" aria-hidden />
        <h3 className="mb-2 text-xl font-bold">Todavía no hay datos de {nombre}</h3>
        <p className="mx-auto mb-4 max-w-prose text-sm text-muted-foreground">
          La fuente de resultados que usa esta página —Jolpica— publica carrera, clasificación y
          sprint, pero no las prácticas libres ni la clasificación al sprint.
        </p>
        <p className="mx-auto max-w-prose text-sm text-muted-foreground">
          Esos tiempos sí están en FastF1, que ya alimenta la sección de{' '}
          <Link href="/analysis" className="text-primary hover:underline">
            análisis
          </Link>
          : ahí puedes ver las vueltas de cualquier sesión de este fin de semana.
        </p>
      </div>
    );
  }

  const encabezado = {
    'aun-no-corre': {
      icono: CalendarClock,
      titulo: `${nombre} aún no se ha corrido`,
      cuerpo: 'Cuando termine, los resultados aparecen aquí en menos de una hora.',
    },
    'en-curso': {
      icono: Radio,
      titulo: `${nombre} se está corriendo ahora`,
      cuerpo: 'Los resultados llegan poco después de la bandera a cuadros.',
    },
    'sin-publicar': {
      icono: CalendarClock,
      titulo: `${nombre} ya terminó, pero los resultados aún no han llegado`,
      cuerpo: 'La fuente tarda un rato en publicarlos. Se vuelven a pedir cada hora.',
    },
  }[estado.tipo];

  const Icono = encabezado.icono;

  return (
    <>
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Icono className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden />
        <h3 className="mb-2 text-xl font-bold">{encabezado.titulo}</h3>

        <p className="mb-1 text-sm text-muted-foreground">
          <LocalDateTime value={estado.cuando.toISOString()} />
        </p>

        {estado.tipo === 'aun-no-corre' && (
          <div className="mb-3">
            <RaceCountdown target={estado.cuando.toISOString()} />
          </div>
        )}

        <p className="mx-auto max-w-prose text-sm text-muted-foreground">{encabezado.cuerpo}</p>
      </div>

      {parrilla && parrilla.length > 0 ? (
        <Parrilla
          origen="Según el orden de la clasificación."
          puestos={parrilla.map((puesto) => ({
            clave: String(puesto.id),
            puesto: puesto.position,
            nombre: `${puesto.driver.givenName} ${puesto.driver.familyName}`,
            equipo: puesto.team.name,
            equipoId: puesto.team.constructorId,
            tiempo: puesto.q3 || puesto.q2 || puesto.q1 || null,
          }))}
        />
      ) : (
        reconstruir && (
          <ParrillaDesdeTiempos
            year={reconstruir.year}
            round={reconstruir.round}
            sesion={reconstruir.sesion}
          />
        )
      )}

    </>
  );
}
