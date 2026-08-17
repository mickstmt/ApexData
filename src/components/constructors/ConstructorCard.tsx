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
    <Link href={`/constructors/${team.constructorId}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        whileHover={{ scale: 1.02, y: -5 }}
        whileTap={{ scale: 0.98 }}
        className="group relative overflow-hidden rounded-lg border border-border bg-card p-6 transition-all hover:border-primary hover:shadow-lg"
      >
        {/* Favorite button */}
        <div className="absolute right-2 top-2 z-10">
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
          {team.name}
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
    </Link>
  );
}
