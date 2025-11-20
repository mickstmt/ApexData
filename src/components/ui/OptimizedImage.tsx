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
        <span className="text-xs text-muted-foreground">Image not available</span>
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
      alt={`${name} avatar`}
      width={dimension}
      height={dimension}
      className={`rounded-full ${sizeClasses[size]}`}
      objectFit="cover"
    />
  );
}

// Utility component for team logos with placeholder
export function TeamLogo({
  src,
  name,
  size = 'md',
}: {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 ${sizeClasses[size]}`}
      >
        <span className={`font-bold text-primary ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          {name.slice(0, 2).toUpperCase()}
        </span>
      </div>
    );
  }

  const dimension = size === 'sm' ? 32 : size === 'md' ? 48 : 64;

  return (
    <OptimizedImage
      src={src}
      alt={`${name} logo`}
      width={dimension}
      height={dimension}
      className={sizeClasses[size]}
      objectFit="contain"
    />
  );
}
