import type { ReactNode } from 'react';

/**
 * Etiqueta corta: un estado, un código, una elección.
 *
 * El primitivo que faltaba del S3 (Card/Table/Chip/Sheet). No lo pide la
 * estética sino la repetición: «HOY» y «FINALIZADO» en el calendario, el código
 * del piloto en su tarjeta y los equipos elegibles del acento se dibujaban cada
 * uno con su propia mezcla de `rounded-*`, `px-*` y `text-xs`, y el siguiente
 * componente habría inventado la suya.
 *
 * Tres tonos, que son los tres papeles que hacían falta:
 *
 * - `solido`: el estado que hay que ver primero. Usa el acento entero, así que
 *   se tiñe con el equipo favorito.
 * - `suave`: identificación, no alarma —el código de un piloto—. El acento al
 *   10 %, con la tinta del acento encima.
 * - `apagado`: lo que ya pasó. Gris, para que no compita con lo vivo.
 */

type Tono = 'solido' | 'suave' | 'apagado';

const TONOS: Record<Tono, string> = {
  solido: 'bg-primary text-primary-foreground',
  suave: 'bg-primary/10 text-primary',
  apagado: 'bg-muted text-muted-foreground',
};

export function Chip({
  children,
  tono = 'apagado',
  className = '',
}: {
  children: ReactNode;
  tono?: Tono;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${TONOS[tono]} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * El mismo aspecto, pero para elegir.
 *
 * Es un botón de verdad —no un `div` con `onClick`— y se anuncia con
 * `aria-pressed`, que es lo que distingue «elegido» de «pulsado» para quien no
 * ve la pantalla. Mide 44 px de alto porque es un objetivo táctil, que es el
 * mínimo que la auditoría fijó y que una prueba de navegador vigila.
 */
export function ChipSeleccionable({
  children,
  elegido,
  onClick,
  className = '',
}: {
  children: ReactNode;
  elegido: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={elegido}
      onClick={onClick}
      className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        elegido
          ? 'border-primary bg-primary/10 text-foreground'
          : 'border-input hover:border-foreground/40'
      } ${className}`}
    >
      {children}
    </button>
  );
}
