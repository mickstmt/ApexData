'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useFavorites } from '@/contexts/FavoritesContext';

interface FavoriteButtonProps {
  id: string;
  type: 'driver' | 'constructor';
  className?: string;
}

export function FavoriteButton({ id, type, className = '' }: FavoriteButtonProps) {
  const { isDriverFavorite, isConstructorFavorite, toggleDriverFavorite, toggleConstructorFavorite } = useFavorites();

  const isFavorite = type === 'driver' ? isDriverFavorite(id) : isConstructorFavorite(id);
  const toggle = type === 'driver' ? toggleDriverFavorite : toggleConstructorFavorite;

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(id);
      }}
      className={`rounded-full p-2 transition-colors hover:bg-primary/10 ${className}`}
      aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
    >
      <Star
        className={`h-5 w-5 transition-all ${
          isFavorite
            ? 'fill-primary stroke-primary'
            : 'stroke-muted-foreground hover:stroke-primary'
        }`}
      />
    </motion.button>
  );
}
