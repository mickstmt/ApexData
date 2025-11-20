'use client';

import { useEffect, useState } from 'react';
import { useFavorites } from '@/contexts/FavoritesContext';
import { DriverCard } from '@/components/drivers/DriverCard';
import { ConstructorCard } from '@/components/constructors/ConstructorCard';
import { Star, Users, Building2 } from 'lucide-react';
import type { Driver, Constructor } from '@prisma/client';

export function FavoritesGrid() {
  const { favoriteDrivers, favoriteConstructors } = useFavorites();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [constructors, setConstructors] = useState<Constructor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFavorites() {
      setLoading(true);
      try {
        // Fetch favorite drivers
        if (favoriteDrivers.length > 0) {
          const driversRes = await fetch('/api/drivers');
          const driversData = await driversRes.json();
          const filteredDrivers = driversData.drivers.filter((d: Driver) =>
            favoriteDrivers.includes(d.driverId)
          );
          setDrivers(filteredDrivers);
        } else {
          setDrivers([]);
        }

        // Fetch favorite constructors
        if (favoriteConstructors.length > 0) {
          const constructorsRes = await fetch('/api/constructors');
          const constructorsData = await constructorsRes.json();
          const filteredConstructors = constructorsData.constructors.filter(
            (c: Constructor) => favoriteConstructors.includes(c.constructorId)
          );
          setConstructors(filteredConstructors);
        } else {
          setConstructors([]);
        }
      } catch (error) {
        console.error('Error loading favorites:', error);
      } finally {
        setLoading(false);
      }
    }

    loadFavorites();
  }, [favoriteDrivers, favoriteConstructors]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Cargando favoritos...</div>
      </div>
    );
  }

  const hasAnyFavorites = drivers.length > 0 || constructors.length > 0;

  if (!hasAnyFavorites) {
    return (
      <div className="rounded-lg border border-border bg-muted/50 p-12 text-center">
        <Star className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="mb-2 text-xl font-bold">No hay favoritos</h2>
        <p className="text-muted-foreground">
          Explora pilotos y equipos, y marca tus favoritos haciendo clic en la estrella
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Favorite Drivers */}
      {drivers.length > 0 && (
        <div>
          <div className="mb-6 flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">
              Pilotos Favoritos ({drivers.length})
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {drivers.map((driver, index) => (
              <DriverCard key={driver.id} driver={driver} index={index} />
            ))}
          </div>
        </div>
      )}

      {/* Favorite Constructors */}
      {constructors.length > 0 && (
        <div>
          <div className="mb-6 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">
              Equipos Favoritos ({constructors.length})
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {constructors.map((constructor, index) => (
              <ConstructorCard key={constructor.id} constructor={constructor} index={index} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
