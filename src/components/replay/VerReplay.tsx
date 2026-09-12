import Link from 'next/link';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';

/** FastF1 no tiene posiciones anteriores a esta temporada. */
export const PRIMERA_TEMPORADA_CON_REPLAY = 2018;

/**
 * La puerta al replay desde la ficha de una carrera.
 *
 * Solo se enseña cuando hay algo que ver: la sesión ya rodó y es de una
 * temporada con posiciones. Es un enlace y no un botón porque abre otra
 * pantalla, y así se puede abrir en otra pestaña o copiar.
 *
 * Su ancho lo decide quien lo coloca. Suelto medía 147 px pegado a la
 * izquierda, en el hueco entre el podio y la tabla de resultados —dos piezas
 * de 358—, y se leía como una pastilla caída ahí: eso era lo «descuadrado».
 * Al pie de la tarjeta del resumen ocupa su ancho y queda pegado a lo que
 * reproduce.
 */
export function VerReplay({
  year,
  round,
  sesion,
  className = '',
}: {
  year: number;
  round: number;
  sesion: 'R' | 'S';
  className?: string;
}) {
  if (year < PRIMERA_TEMPORADA_CON_REPLAY) return null;

  const href = `/results/${year}/${round}/replay${sesion === 'S' ? '?sesion=S' : ''}`;

  return (
    <Link
      href={href}
      className={cn(
        'inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground',
        'ring-offset-background transition-colors hover:bg-primary/90',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
    >
      <Play className="h-4 w-4" aria-hidden />
      {sesion === 'S' ? 'Ver el sprint' : 'Ver la carrera'}
    </Link>
  );
}
