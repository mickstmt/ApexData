import Link from 'next/link';
import { useId } from 'react';
import { Trophy } from 'lucide-react';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { DriverAvatar } from '@/components/ui/OptimizedImage';
import { gentilicio } from '@/lib/countries';
import { teamColor } from '@/lib/team-colors';

/**
 * El poleman: quien sale primero el domingo.
 *
 * ## Por qué no es un podio de tres
 *
 * En carrera y en sprint se reparten trofeos y puntos a los tres primeros, así
 * que ahí el bloque de arriba es un podio. El sábado no: la pole es un puesto,
 * y el segundo y el tercero de la Q3 no reciben nada. Montar aquí tres
 * columnas con peldaños diría que hubo un podio que no existió.
 *
 * Lo que sí se hereda del podio es el tratamiento del primero —foto, anillo de
 * oro, bandera— para que el sábado tenga su protagonista igual que el domingo.
 * El segundo y el tercero llevan plata y bronce en su dorsal de la tabla, que
 * es donde importa quién sale desde dónde.
 *
 * El anillo va separado de la foto por el color de la tarjeta, de modo que su
 * contraste se mide contra la tarjeta y no contra unos píxeles cualesquiera de
 * la imagen, que cambian con cada piloto.
 */
export function PoleDelSabado({
  driverId,
  givenName,
  familyName,
  imageUrl,
  nationality,
  constructorId,
  teamName,
  tiempo,
}: {
  driverId: string;
  givenName: string;
  familyName: string;
  imageUrl: string | null;
  nationality: string;
  constructorId: string;
  teamName: string;
  /** El mejor tiempo de la sesión. Nulo si no quedó registrado. */
  tiempo: string | null;
}) {
  // El identificador se genera y no se escribe a mano: durante una transición
  // de página conviven en el DOM la que sale y la que entra, así que dos
  // instancias de esto coexisten un instante. Con un `id` fijo eso son dos
  // elementos con el mismo identificador — HTML inválido, un lector que no
  // sabe cuál nombra a cuál, y pruebas que fallan sin estar roto lo que
  // vigilan. Pasó en el CI.
  const rotulo = useId();

  const color = teamColor(constructorId);

  return (
    <section
      aria-labelledby={rotulo}
      className="mb-8 rounded-lg border border-podium-gold/40 bg-podium-gold/5 p-5"
    >
      <h2
        id={rotulo}
        className="mb-3 flex items-center gap-2 font-mono text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-podium-gold"
      >
        <Trophy aria-hidden className="h-3.5 w-3.5" />
        Pole position
      </h2>

      <div className="flex items-center gap-4">
        <span className="relative block shrink-0">
          <DriverAvatar src={imageUrl} name={`${givenName} ${familyName}`} size="md" />
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-1 rounded-full ring-2 ring-podium-gold"
          />
        </span>

        <div className="min-w-0 flex-1">
          <Link
            href={`/drivers/${driverId}`}
            className="block truncate text-xl font-bold hover:text-primary"
          >
            {givenName} {familyName}
          </Link>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CountryFlag nationality={nationality} size={14} />
              {gentilicio(nationality)}
            </span>
            <Link
              href={`/constructors/${constructorId}`}
              className="flex items-center gap-1.5 hover:text-primary"
            >
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: color.color }}
              />
              {teamName}
            </Link>
          </div>
        </div>
      </div>

      {tiempo && (
        <p className="mt-4 flex items-baseline justify-between gap-3 border-t border-podium-gold/20 pt-3">
          <span className="text-xs text-muted-foreground">Mejor tiempo</span>
          <span className="font-mono text-2xl font-bold tabular-nums text-podium-gold">
            {tiempo}
          </span>
        </p>
      )}
    </section>
  );
}
