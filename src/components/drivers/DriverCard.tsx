'use client';

import Link from 'next/link';
import { User } from 'lucide-react';
import { motion } from 'framer-motion';
import { FavoriteButton } from '@/components/favorites/FavoriteButton';
import { DriverAvatar } from '@/components/ui/OptimizedImage';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { driverAge, formatBirthDate } from '@/lib/driver-age';

interface DriverCardProps {
  driver: {
    id: string;
    driverId: string;
    givenName: string;
    familyName: string;
    permanentNumber: number | null;
    code: string | null;
    nationality: string;
    dateOfBirth: Date | null;
    imageUrl: string | null;
  };
  index?: number;
}

export function DriverCard({ driver, index = 0 }: DriverCardProps) {
  const age = driverAge(driver.dateOfBirth);
  const bornOn = formatBirthDate(driver.dateOfBirth);

  return (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        whileHover={{ scale: 1.02, y: -5 }}
        whileTap={{ scale: 0.98 }}
      className="group relative overflow-hidden rounded-lg border border-border bg-card p-6 transition-all focus-within:border-primary hover:border-primary hover:shadow-lg"
    >
      {/* El favorito, por encima del enlace y fuera de él: antes vivía dentro
          del <a> que envolvía la tarjeta, lo que es HTML inválido y daba dos
          paradas de teclado por piloto. */}
      <div className="absolute right-2 top-2 z-20">
        <FavoriteButton id={driver.driverId} type="driver" />
      </div>

      {/* La tarjeta entera es el enlace, como capa y no como envoltorio: así el
          botón de favorito queda fuera de él —un control dentro de un <a> es
          HTML inválido— y la zona pulsable no depende del apilamiento interno. */}
      <Link
        href={`/drivers/${driver.driverId}`}
        className="absolute inset-0 z-10 rounded-lg ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <span className="sr-only">
          Ver la ficha de {driver.givenName} {driver.familyName}
        </span>
      </Link>

        {/* Número permanente en background */}
        {driver.permanentNumber && (
          <div className="absolute right-4 top-16 text-6xl font-bold text-muted/10 transition-colors group-hover:text-primary/20">
            {driver.permanentNumber}
          </div>
        )}

        {/* Contenido */}
        <div className="relative">
          {/* Avatar */}
          <div className="mb-4">
            <DriverAvatar
              src={driver.imageUrl}
              name={`${driver.givenName} ${driver.familyName}`}
              size="md"
            />
          </div>

          {/* Nombre */}
          <h3 className="mb-1 text-xl font-bold text-foreground">
            {driver.givenName} {driver.familyName}
          </h3>

          {/* Código del piloto */}
          {driver.code && (
            <div className="mb-3 inline-block rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
              {driver.code}
            </div>
          )}

          {/* Información */}
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CountryFlag nationality={driver.nationality} size={16} />
              <span>{driver.nationality}</span>
            </div>
            {age !== null && (
              <div className="flex items-center gap-2">
                <span className="text-xs">🎂</span>
                <span>
                  {age} años
                  {bornOn && <span className="text-muted-foreground/80"> · {bornOn}</span>}
                </span>
              </div>
            )}
            {driver.permanentNumber && (
              <div className="flex items-center gap-2">
                <span className="text-xs">#</span>
                <span>Número {driver.permanentNumber}</span>
              </div>
            )}
          </div>
        </div>

      {/* Hover indicator */}
      <div className="absolute bottom-0 left-0 h-1 w-full origin-left scale-x-0 bg-primary transition-transform group-hover:scale-x-100" />
    </motion.div>
  );
}
