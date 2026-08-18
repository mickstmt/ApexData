'use client';

import { useEffect, useState } from 'react';
import { useFavorites } from '@/contexts/FavoritesContext';
import { DriverCard } from '@/components/drivers/DriverCard';
import { ConstructorCard } from '@/components/constructors/ConstructorCard';
import { DriverCardSkeleton, ConstructorCardSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/button';
import { Star, Users, Building2, AlertTriangle, RefreshCw } from 'lucide-react';
import type { Driver, Team } from '@prisma/client';

/** Pide solo los favoritos guardados; devuelve null si la petición falla. */
async function fetchFavorites<T>(endpoint: string, ids: string[]): Promise<T[] | null> {
  if (ids.length === 0) return [];

  try {
    const response = await fetch(`${endpoint}?ids=${encodeURIComponent(ids.join(','))}`);
    const payload = await response.json();

    if (!response.ok || !payload.success || !Array.isArray(payload.data)) return null;

    return payload.data as T[];
  } catch {
    return null;
  }
}

export function FavoritesGrid() {
  const { favoriteDrivers, favoriteConstructors } = useFavorites();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [constructors, setConstructors] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // La carga vive dentro del efecto y todo `setState` ocurre después del
    // `await`: hacerlo de forma síncrona encadena renders innecesarios. El
    // testigo `ignore` descarta una respuesta que llegue tarde si mientras
    // tanto han cambiado los favoritos.
    let ignore = false;

    async function load() {
      const [loadedDrivers, loadedConstructors] = await Promise.all([
        fetchFavorites<Driver>('/api/drivers', favoriteDrivers),
        fetchFavorites<Team>('/api/constructors', favoriteConstructors),
      ]);

      if (ignore) return;

      // Un fallo de red no puede acabar en "no hay favoritos": el usuario tiene
      // que poder distinguir "no has marcado nada" de "no he podido cargarlo".
      if (loadedDrivers === null || loadedConstructors === null) {
        setFailed(true);
      } else {
        setDrivers(loadedDrivers);
        setConstructors(loadedConstructors);
        setFailed(false);
      }

      setLoading(false);
    }

    load();

    return () => {
      ignore = true;
    };
  }, [favoriteDrivers, favoriteConstructors, reloadKey]);

  const retry = () => {
    setLoading(true);
    setFailed(false);
    setReloadKey((key) => key + 1);
  };

  const expectedDrivers = favoriteDrivers.length;
  const expectedConstructors = favoriteConstructors.length;

  if (loading) {
    return (
      <div className="space-y-12">
        <span role="status" className="sr-only">
          Cargando tus favoritos…
        </span>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: Math.max(expectedDrivers, 1) }).map((_, i) => (
            <DriverCardSkeleton key={i} />
          ))}
          {Array.from({ length: expectedConstructors }).map((_, i) => (
            <ConstructorCardSkeleton key={`team-${i}`} />
          ))}
        </div>
      </div>
    );
  }

  if (failed) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-destructive/30 bg-destructive/5 p-12 text-center"
      >
        <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" aria-hidden />
        <h2 className="mb-2 text-xl font-bold">No se han podido cargar tus favoritos</h2>
        <p className="mb-6 text-muted-foreground">
          Tus favoritos siguen guardados en este dispositivo; lo que ha fallado es la
          consulta de sus datos.
        </p>
        <Button onClick={retry} variant="outline">
          <RefreshCw className="h-4 w-4" aria-hidden />
          Reintentar
        </Button>
      </div>
    );
  }

  const hasAnyFavorites = drivers.length > 0 || constructors.length > 0;

  if (!hasAnyFavorites) {
    return (
      <div className="rounded-lg border border-border bg-muted/50 p-12 text-center">
        <Star className="mx-auto mb-4 h-12 w-12 text-muted-foreground" aria-hidden />
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
            <Users className="h-6 w-6 text-primary" aria-hidden />
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
            <Building2 className="h-6 w-6 text-primary" aria-hidden />
            <h2 className="text-2xl font-bold">
              Equipos Favoritos ({constructors.length})
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {constructors.map((constructor, index) => (
              <ConstructorCard key={constructor.id} team={constructor} index={index} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}