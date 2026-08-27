/**
 * Las dos cifras de la carrera, en una línea al pie del podio.
 *
 * ## De dónde sale
 *
 * Antes eran dos tarjetas de 134 px cada una entre el podio y la tabla, y por
 * su culpa la primera posición quedaba **190 px por debajo de lo que se ve sin
 * arrastrar** en un iPhone. Medido: 247 px de bloque; ahora **37**.
 *
 * Se consultó a dos agentes y discreparon. Uno proponía quitarlas y marcar con
 * un rayo la fila de quien hizo la vuelta rápida; el otro decía que eso la
 * escondería dentro de veinte filas. Decidió una medición que no tenía
 * ninguno: **el rayo rompe la fila del ganador**. Con él truncan Verstappen,
 * Hülkenberg y van der Garde; sin él sólo el caso extremo. El hueco del
 * apellido ya se había repartido con las banderas.
 *
 * ## Dos decisiones que parecen detalle
 *
 * **El piloto va con su código de tres letras**, no con el apellido: en la
 * maqueta «Verstappen» se cortaba por 7 px, y VER es además como lo escribe la
 * cronometría. Los 84 pilotos de la base tienen código, y si faltara se cae a
 * las tres primeras letras del apellido.
 *
 * **La velocidad punta sólo en escritorio.** En 358 px, añadir «210 km/h» hace
 * truncar los apellidos largos; a partir de `md` sobra sitio y el dato vuelve.
 */

export function TiraDeCarrera({
  vueltas,
  vueltaRapida,
}: {
  /** Vueltas que completó el ganador. */
  vueltas: number | null | undefined;
  /** La vuelta rápida de la carrera, si la hubo. */
  vueltaRapida: {
    tiempo: string;
    /** El código de tres letras; si falta, el apellido sirve de respaldo. */
    codigo: string | null;
    apellido: string;
    velocidad: string | null;
  } | null;
}) {
  // Sin ninguno de los dos datos no hay tira que dibujar, y una tira vacía
  // pegada al podio se leería como un borde suelto.
  if (!vueltas && !vueltaRapida) return null;

  const piloto = vueltaRapida
    ? (vueltaRapida.codigo ?? vueltaRapida.apellido.slice(0, 3).toUpperCase())
    : null;

  return (
    // Comparte borde con el podio —que pierde el suyo inferior— para que los
    // dos se lean como una pieza: podio sobre plinto, no dos tarjetas.
    <div className="-mt-6 mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-b-lg border border-t-0 border-border bg-card px-3 py-2">
      {vueltas ? (
        <p className="m-0 flex items-baseline gap-1.5">
          <span className="font-mono text-[0.9375rem] font-bold tabular-nums">{vueltas}</span>
          <span className="font-mono text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Vueltas
          </span>
        </p>
      ) : null}

      {vueltas && vueltaRapida ? (
        <span aria-hidden className="h-4 w-px shrink-0 self-center bg-border" />
      ) : null}

      {vueltaRapida ? (
        <p className="m-0 flex min-w-0 flex-1 items-baseline gap-1.5">
          <span className="shrink-0 font-mono text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            {/* El rótulo largo no cabe en una línea a 358 px: con él la tira
                pasa de 37 a 68 px porque parte en dos. */}
            <span className="md:hidden">V. rápida</span>
            <span className="hidden md:inline">Vuelta rápida</span>
          </span>
          <span className="font-mono text-[0.9375rem] font-bold tabular-nums">
            {vueltaRapida.tiempo}
          </span>
          <span className="shrink-0 font-mono text-xs font-bold tracking-wide text-muted-foreground">
            {piloto}
            <span className="sr-only"> — {vueltaRapida.apellido}</span>
          </span>
          {vueltaRapida.velocidad ? (
            <span className="hidden shrink-0 font-mono text-xs text-muted-foreground md:inline">
              · {vueltaRapida.velocidad} km/h
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
