import Link from 'next/link';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { DriverAvatar } from '@/components/ui/OptimizedImage';
import { gentilicio } from '@/lib/countries';
import { teamColor } from '@/lib/team-colors';

/**
 * La cabecera del detalle de una fila: quién es, de dónde y con quién corre.
 *
 * ## Por qué la foto está aquí y no en la fila
 *
 * Se midió con la tipografía real a 358 px de ancho. Una foto de 28 px en la
 * fila deja el apellido en 59 px cuando «Verstappen» necesita 89, así que
 * trunca hasta al ganador; y a ese tamaño la cara mide unos 11 px, porque el
 * original es 206×206 con el rostro ocupando un 40 % del encuadre. Una cara de
 * 11 px no identifica a nadie, que era justo para lo que se ponía.
 *
 * En el detalle, en cambio, hay 324 px de ancho y **sólo una fila abierta a la
 * vez**: aquí una foto es una foto, no veinte. A 48 px la cara mide unos 19,
 * que es el tamaño al que ya se ven en la clasificación general.
 */
export function FichaDePiloto({
  driverId,
  givenName,
  familyName,
  imageUrl,
  nationality,
  constructorId,
  teamName,
}: {
  driverId: string;
  givenName: string;
  familyName: string;
  imageUrl: string | null;
  nationality: string;
  constructorId: string;
  teamName: string;
}) {
  const color = teamColor(constructorId);

  return (
    <div className="flex items-center gap-3">
      <DriverAvatar src={imageUrl} name={`${givenName} ${familyName}`} size="sm" />
      <div className="min-w-0 flex-1">
        <Link
          href={`/drivers/${driverId}`}
          className="block truncate font-semibold hover:text-primary"
        >
          {givenName} {familyName}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
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
  );
}
