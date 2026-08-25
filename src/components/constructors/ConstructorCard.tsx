'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FavoriteButton } from '@/components/favorites/FavoriteButton';
import { TeamLogo } from '@/components/ui/OptimizedImage';
import { teamColor } from '@/lib/team-colors';

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
      className="group relative overflow-hidden rounded-lg border border-border bg-card p-6 transition-all duration-100 ease-out focus-within:border-primary hover:border-primary hover:shadow-lg active:scale-[0.98] motion-reduce:active:scale-100"
    >
      {/* La barra de color del equipo.
          El sistema dice que la identidad vive en el color y por eso el logo se
          pinta a una tinta — pero esa premisa era falsa aqui: hasta hoy, esta
          pantalla no tenia ni un pixel de color de equipo. Es el mismo patron
          que ya usa la clasificacion general. */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: teamColor(team.constructorId).color }}
      />

      {/* Fuera del enlace y por encima de él: un botón dentro de un <a> es
          HTML inválido y da dos paradas de teclado por tarjeta. */}
      <div className="absolute right-2 top-2 z-20">
        <FavoriteButton id={team.constructorId} type="constructor" />
      </div>

      {/* Misma capa que en la tarjeta de piloto, para que las dos se comporten
          igual: el enlace cubre la tarjeta y el favorito queda por encima. */}
      <Link
        href={`/constructors/${team.constructorId}`}
        className="absolute inset-0 z-10 rounded-lg ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <span className="sr-only">Ver la ficha de {team.name}</span>
      </Link>

        {/* Logo */}
        <div className="mb-4">
          <TeamLogo
            src={team.logoUrl}
            name={team.name}
            constructorId={team.constructorId}
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
  );
}
