'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FavoriteButton } from '@/components/favorites/FavoriteButton';
import { TeamLogo } from '@/components/ui/OptimizedImage';

interface ConstructorCardProps {
  team: {
    id: string;
    constructorId: string;
    name: string;
    nationality: string;
    url: string | null;
    logoUrl: string | null;
  };
  index?: number;
}

export function ConstructorCard({ team, index = 0 }: ConstructorCardProps) {
  return (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        whileHover={{ scale: 1.02, y: -5 }}
        whileTap={{ scale: 0.98 }}
      className="group relative overflow-hidden rounded-lg border border-border bg-card p-6 transition-all focus-within:border-primary hover:border-primary hover:shadow-lg"
    >
      {/* Fuera del enlace y por encima de él: un botón dentro de un <a> es
          HTML inválido y da dos paradas de teclado por tarjeta. */}
      <div className="absolute right-2 top-2 z-20">
        <FavoriteButton id={team.constructorId} type="constructor" />
      </div>

        {/* Logo */}
        <div className="mb-4">
          <TeamLogo
            src={team.logoUrl}
            name={team.name}
            size="md"
          />
        </div>

        {/* Nombre del equipo */}
        <h3 className="mb-3 text-xl font-bold text-foreground group-hover:text-primary transition-colors">
          <Link
            href={`/constructors/${team.constructorId}`}
            className="rounded-sm after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {team.name}
          </Link>
        </h3>

        {/* Información */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="text-xs">🌍</span>
            <span>{team.nationality}</span>
          </div>
        </div>

        {/* Hover indicator */}
        <div className="absolute bottom-0 left-0 h-1 w-full origin-left scale-x-0 bg-primary transition-transform group-hover:scale-x-100" />
    </motion.div>
  );
}
