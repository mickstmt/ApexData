/**
 * Lo que se ve mientras llega la carrera.
 *
 * Son 1,6 MB comprimidos —2,6 sin comprimir— y en un móvil tardan lo que
 * tardan: un esqueleto que late no dice si va a acabar. Una barra que avanza
 * sí, y el porcentaje es real porque el meta dice cuántos bytes van a llegar.
 */
export function CargaDelReplay({ fraccion, mensaje }: { fraccion: number | null; mensaje: string }) {
  const pct = fraccion === null ? null : Math.round(Math.max(0, Math.min(1, fraccion)) * 100);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 px-6 py-16 text-center">
      {/* Solo el mensaje se anuncia. El porcentaje cambia cien veces durante
          la descarga, y dentro de la región viva un lector de pantalla los
          leería todos. Quien no ve la barra necesita saber que se está
          cargando, no cada paso. */}
      <p role="status" className="text-sm text-[var(--replay-apagado)]">
        {mensaje}
      </p>
      <div className="h-2 w-full overflow-hidden rounded bg-[var(--replay-superficie-2)]" aria-hidden>
        <div
          className={`h-full rounded bg-[var(--replay-acento)] transition-[width] duration-200 motion-reduce:transition-none ${pct === null ? 'w-1/4 animate-pulse' : ''}`}
          style={pct === null ? undefined : { width: `${pct}%` }}
        />
      </div>
      <p aria-hidden className="font-mono text-xs tabular-nums text-[var(--replay-tenue)]">
        {pct === null ? 'preparando…' : `${pct} %`}
      </p>
    </div>
  );
}
