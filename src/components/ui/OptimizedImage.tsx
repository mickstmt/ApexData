'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Skeleton } from './Skeleton';

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

  const iconSizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-24 w-24',
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
      className={`rounded-full ${sizeClasses[size]}`}
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
export function TeamLogo({
  src,
  name,
  size = 'md',
}: {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const box = {
    sm: 'h-6 max-w-[72px]',
    md: 'h-9 max-w-[112px]',
    lg: 'h-12 max-w-[160px]',
  };

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 ${
          size === 'sm' ? 'h-8 w-8' : size === 'md' ? 'h-9 w-9' : 'h-12 w-12'
        }`}
      >
        <span className={`font-bold text-primary ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          {name.slice(0, 2).toUpperCase()}
        </span>
      </div>
    );
  }

  const height = size === 'sm' ? 24 : size === 'md' ? 36 : 48;

  // `next/image` obliga a declarar ancho y alto, y eso fija una proporción
  // igual para todos: con logos que van de 4,8:1 (alfa) a 1:2,1 (sauber), la
  // proporción declarada sería falsa en casi todos. Un `<img>` deja que cada
  // SVG traiga la suya. Además no se pierde nada: el optimizador de imágenes
  // no procesa SVG, los sirve tal cual.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`Logo de ${name}`}
      height={height}
      loading="lazy"
      decoding="async"
      className={`w-auto object-contain object-left brightness-0 dark:brightness-0 dark:invert ${box[size]}`}
    />
  );
}
