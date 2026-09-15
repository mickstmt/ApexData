import Image from 'next/image';
import { NATIONALITY_TO_ISO, COUNTRY_TO_ISO } from '@/lib/countries';

/**
 * Circular country flag. Accepts either a demonym ("Dutch", as drivers and
 * teams report it) or a country name ("Netherlands", as circuits do), and
 * renders nothing when the value has no mapping rather than a broken image.
 */
export function CountryFlag({
  nationality,
  country,
  size = 20,
  className = '',
}: {
  nationality?: string | null;
  country?: string | null;
  size?: number;
  className?: string;
}) {
  const iso = nationality
    ? NATIONALITY_TO_ISO[nationality]
    : country
      ? COUNTRY_TO_ISO[country]
      : undefined;

  if (!iso) return null;

  const label = nationality ?? country ?? '';

  return (
    <Image
      src={`/images/flags/${iso}.svg`}
      alt={label}
      // La marca con la que se reconoce una bandera desde fuera. `src` no vale:
      // `next/image` lo reescribe a `/_next/image?url=…` y deja de contener la
      // ruta del archivo.
      data-bandera={iso}
      title={label}
      width={size}
      height={size}
      // Un SVG propio de 0,6 KB no gana nada pasando por el optimizador, y en
      // una tabla son cuarenta peticiones. Ver `OptimizedImage`.
      unoptimized
      className={`inline-block shrink-0 rounded-full ${className}`}
    />
  );
}
