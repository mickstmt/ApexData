import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { DriverAvatar } from '@/components/ui/OptimizedImage';

/**
 * El podio, arriba del todo y con la forma del podio de verdad: el segundo a la
 * izquierda, el ganador en el centro y el tercero a la derecha.
 *
 * ## Por qué está aquí arriba
 *
 * Antes había una tarjeta de GANADOR arriba y, **después de las veintidós
 * filas**, un bloque «Podio» que repetía a los tres primeros. El ganador salía
 * tres veces: tarjeta, fila 1 y podio. Medido en un iPhone, ese bloque estaba a
 * 2.042 px del principio, o sea que resumía algo por lo que ya habías pasado.
 * Ahora el podio está donde se busca y el bloque de abajo desaparece: la
 * pantalla queda más corta que antes aunque esto ocupe más.
 *
 * ## Dos decisiones que parecen detalles y no lo son
 *
 * **El número pegado a la foto no es decoración.** En tema claro, el anillo de
 * oro y el de bronce dan ΔE 1,2 en deuteranopía —el umbral de percepción está
 * en 2,3—, es decir que son el mismo color para cerca del 6 % de los hombres.
 * El anillo es refuerzo; el número es el dato. Quitarlo incumpliría la 1.4.1.
 *
 * **El peldaño va anclado abajo y el retrato en una caja de alto fijo**, para
 * que los tres nombres arranquen a la misma altura. Dejando que cada peldaño
 * empujara su columna, el texto quedaba a tres alturas distintas y en un móvil
 * eso se lee como desalineado, no como podio. El ganador sobresale por tamaño
 * de foto y por altura de peldaño, que es como sobresale en el podio real.
 */

export interface PuestoDelPodio {
  driverId: string;
  givenName: string;
  familyName: string;
  imageUrl: string | null;
  nationality: string;
  constructorId: string;
  teamName: string;
  points: number;
}

/**
 * Oro, plata y bronce, por orden de llegada.
 *
 * `orden` coloca la columna en pantalla —segundo, primero, tercero— sin tocar
 * el orden del documento, que se queda en el de llegada: quien va con lector de
 * pantalla oye primero al ganador, no al segundo.
 */
const MEDALLA = [
  {
    anillo: 'ring-podium-gold',
    tinta: 'text-podium-gold',
    peldaño: 'h-8 bg-podium-gold/15 border-t-[1.5px] border-podium-gold',
    orden: 'order-2',
  },
  {
    anillo: 'ring-podium-silver',
    tinta: 'text-podium-silver',
    peldaño: 'h-5 bg-podium-silver/15 border-t-[1.5px] border-podium-silver',
    orden: 'order-1',
  },
  {
    anillo: 'ring-podium-bronze',
    tinta: 'text-podium-bronze',
    peldaño: 'h-3 bg-podium-bronze/15 border-t-[1.5px] border-podium-bronze',
    orden: 'order-3',
  },
] as const;

function Columna({ puesto, indice }: { puesto: PuestoDelPodio; indice: number }) {
  const medalla = MEDALLA[indice];
  const esGanador = indice === 0;

  return (
    <li className={`relative flex min-w-0 flex-col items-center gap-1 pb-11 ${medalla.orden}`}>
      {/* La caja de alto fijo con la foto apoyada abajo: así el ganador se ve
          más alto por ser más grande, sin desplazar el texto de los otros dos. */}
      <span className="flex h-[3.75rem] items-end">
        <span className="relative block">
          <DriverAvatar
            src={puesto.imageUrl}
            name={`${puesto.givenName} ${puesto.familyName}`}
            size={esGanador ? 'md' : 'sm'}
          />
          {/* El anillo va aparte del avatar y a 4 px de él: entre la foto y el
              anillo se ve la tarjeta, así que el contraste se mide contra la
              tarjeta —entre 6,6:1 y 11,9:1— y no contra unos píxeles
              cualesquiera de la foto, que cambian con cada piloto. */}
          <span
            aria-hidden
            className={`pointer-events-none absolute -inset-1 rounded-full ring-2 ${medalla.anillo}`}
          />
          <span
            className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-card text-[0.6875rem] font-bold ring-[1.5px] ring-current ${medalla.tinta}`}
          >
            {indice + 1}
          </span>
        </span>
      </span>

      <Link
        href={`/drivers/${puesto.driverId}`}
        className="max-w-full truncate text-sm font-semibold hover:text-primary"
      >
        {puesto.familyName}
      </Link>
      <span className="flex max-w-full items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
        <CountryFlag nationality={puesto.nationality} size={12} />
        <span className="truncate">{puesto.teamName}</span>
      </span>
      <span className="font-mono text-sm font-bold tabular-nums">{puesto.points}</span>

      {/* El peldaño, en el color de la medalla y no en el del equipo: puesto en
          color de equipo, el escalón de oro salía con una línea naranja y el de
          bronce con una verde, y el conjunto dejaba de leerse como un podio.
          Decorativo: el puesto ya lo dan el número y el orden. */}
      <span aria-hidden className={`absolute inset-x-0 bottom-0 rounded-t-md ${medalla.peldaño}`} />
    </li>
  );
}

export function PodioDeCarrera({
  puestos,
  titulo = 'Podio',
  soldado = false,
}: {
  /** Los tres primeros, en orden de llegada. Con menos de tres no se dibuja. */
  puestos: PuestoDelPodio[];
  titulo?: string;
  /**
   * Cierto cuando debajo va `TiraDeCarrera`.
   *
   * Suelta el borde y el radio de abajo para que las dos piezas compartan
   * línea y se lean como una sola: podio sobre plinto, en vez de dos tarjetas
   * separadas por un hueco.
   */
  soldado?: boolean;
}) {
  if (puestos.length < 3) return null;

  return (
    <section
      aria-labelledby="podio"
      className={`mb-6 border border-border bg-card p-4 ${
        soldado ? 'rounded-t-lg border-b-0 pb-2' : 'rounded-lg'
      }`}
    >
      <h2
        id="podio"
        className="mb-2 flex items-center gap-2 font-mono text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted-foreground"
      >
        <Trophy aria-hidden className="h-3.5 w-3.5 text-podium-gold" />
        {titulo}
      </h2>
      {/* Una lista ordenada, no una rejilla suelta. El orden del documento es
          el de llegada; a la pantalla los coloca `order`, para que el ganador
          quede en el centro sin que un lector oiga primero al segundo. */}
      <ol className="grid grid-cols-3 items-stretch gap-2.5">
        {puestos.slice(0, 3).map((puesto, indice) => (
          <Columna key={puesto.driverId} puesto={puesto} indice={indice} />
        ))}
      </ol>
    </section>
  );
}
