'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Skeleton } from './Skeleton';
import { logoVaEnColor, teamInk } from '@/lib/team-colors';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  fill = false,
  sizes,
  objectFit = 'cover',
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${className}`}
        style={fill ? {} : { width, height }}
      >
        <span className="text-xs text-muted-foreground">Imagen no disponible</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={fill ? {} : { width, height }}>
      {isLoading && (
        <div className="absolute inset-0">
          <Skeleton className="h-full w-full" />
        </div>
      )}
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        sizes={sizes}
        priority={priority}
        className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'} ${
          objectFit === 'cover' ? 'object-cover' :
          objectFit === 'contain' ? 'object-contain' :
          objectFit === 'fill' ? 'object-fill' :
          objectFit === 'none' ? 'object-none' :
          'object-scale-down'
        }`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </div>
  );
}

// Utility component for driver avatars with placeholder
export function DriverAvatar({
  src,
  name,
  size = 'md',
}: {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-16 w-16',
    lg: 'h-24 w-24',
    xl: 'h-48 w-48',
  };


  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center rounded-full border-2 border-primary bg-gradient-to-br from-primary/20 to-primary/5 ${sizeClasses[size]}`}
      >
        <span className={`font-bold text-primary ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-3xl'}`}>
          {initials}
        </span>
      </div>
    );
  }

  const dimension = size === 'sm' ? 48 : size === 'md' ? 64 : size === 'lg' ? 96 : 192;

  return (
    <OptimizedImage
      src={src}
      alt={`Foto de ${name}`}
      width={dimension}
      height={dimension}
      // `overflow-hidden` va con `rounded-full` y no es opcional: el redondeo
      // está en la envoltura y la foto es un hijo, así que sin recortar salía
      // **cuadrada** en toda la app —clasificación incluida— y se desbordaba
      // sobre lo que tuviera debajo. Costaba verlo porque el fondo de las
      // fotos es transparente y el borde recto se confundía con el aire.
      className={`overflow-hidden rounded-full ${sizeClasses[size]}`}
      objectFit="cover"
    />
  );
}

/**
 * Logo de equipo.
 *
 * Dos correcciones que vienen de verlos en pantalla:
 *
 * 1. **Caja rectangular, no cuadrada.** Casi ningún logo lo es: `alfa` mide
 *    240×50 (4,8:1) y `sauber` 916×1958. Metidos en un cuadrado de 48 px, el
 *    primero se dibujaba a 48×10 px — la queja de "se ven súper chiquitos".
 *    Ahora manda el alto y el ancho acompaña.
 * 2. **Silueta monocroma.** Los archivos traen la tinta fija: McLaren, Mercedes
 *    y Williams son oscuros y desaparecían sobre el carbón; `audi` es gris muy
 *    claro y desaparece sobre blanco. Pintarlos con el color del texto los hace
 *    legibles en los dos temas, y la identidad del equipo ya la lleva su barra
 *    de color, que es donde el sistema de diseño dice que debe vivir.
 */
/**
 * Cuando no hay logo, el nombre hace de logo.
 *
 * Diecisiete de los veinticinco equipos de la base no tienen archivo, y la
 * mayoría no lo tendrá nunca: son escuderías desaparecidas. De los actuales
 * faltan cinco —Ferrari, Red Bull, Aston Martin, RB y Cadillac—, y no por
 * descuido: sus marcas están registradas y no viven en Wikimedia con licencia
 * libre, que es de donde el script baja las demás.
 *
 * Dos letras grises parecían un hueco; el nombre del equipo con su color
 * parece una decisión. Se recorta la coletilla porque «F1 Team» no distingue a
 * nadie: lo que identifica es «Cadillac», no «Team».
 */
function nombreDeMarca(name: string): string {
  return name.replace(/\s+(F1\s+Team|F1|Racing|Team)$/i, '').trim() || name;
}

export function TeamLogo({
  src,
  name,
  constructorId,
  size = 'md',
}: {
  src?: string | null;
  name: string;
  /** Para teñir el respaldo con el color del equipo, no con el de la app. */
  constructorId?: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const box = {
    sm: 'h-6 max-w-[72px]',
    md: 'h-9 max-w-[112px]',
    lg: 'h-12 max-w-[160px]',
  };

  if (!src) {
    return (
      <span
        // `team-ink` resuelve al tono legible de cada tema: el color de marca
        // crudo no vale como tinta —seis de los once actuales no llegan a 3:1
        // sobre el fondo claro—, y aquí es texto.
        className={`team-ink inline-flex items-center font-display font-bold uppercase tracking-tight ${box[size]} ${
          size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-lg'
        }`}
        style={teamInk(constructorId)}
        title={name}
      >
        <span className="truncate">{nombreDeMarca(name)}</span>
      </span>
    );
  }

  const height = size === 'sm' ? 24 : size === 'md' ? 36 : 48;

  /**
   * La excepción: una marca figurativa no puede ser una silueta.
   *
   * La regla general tiñe el logo de una sola tinta para que se lea en los dos
   * temas. Con los diez logotipos tipográficos funciona —un nombre escrito
   * sobrevive a ser silueta— pero el escudo de Ferrari no: su caballo está
   * pintado sobre el campo, no recortado, así que teñirlo lo convierte en un
   * bloque macizo. Ver `logoVaEnColor` para el porqué y para el criterio de
   * cuándo añadir otra.
   */
  const enColor = logoVaEnColor(constructorId);

  const imagen = (
    // `next/image` obliga a declarar ancho y alto, y eso fija una proporción
    // igual para todos: con logos que van de 4,8:1 (alfa) a 1:2,1 (sauber), la
    // proporción declarada sería falsa en casi todos. Un `<img>` deja que cada
    // SVG traiga la suya. Además no se pierde nada: el optimizador de imágenes
    // no procesa SVG, los sirve tal cual.
    //
    // `alt=""`: el nombre del equipo va escrito al lado en las tres pantallas
    // que usan esto, así que un texto alternativo lo haría sonar dos y hasta
    // tres veces seguidas en un lector de pantalla. Es decoración y se anuncia
    // como tal.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      height={height}
      loading="lazy"
      decoding="async"
      className={`w-auto object-contain object-left ${box[size]} ${
        enColor ? '' : 'brightness-0 dark:brightness-0 dark:invert'
      }`}
    />
  );

  if (!enColor) return imagen;

  // El respaldo oscuro va SOLO en tema claro, y está medido: el escudo se lee
  // bien sobre el fondo oscuro —23 % de su tinta por debajo de 3:1— y mal sobre
  // el claro, donde el amarillo se pierde. Es además la versión que las guías
  // de marca publican para fondos claros.
  return (
    <span className="inline-flex items-center rounded-md bg-foreground px-1.5 py-1 dark:bg-transparent dark:p-0">
      {imagen}
    </span>
  );
}
