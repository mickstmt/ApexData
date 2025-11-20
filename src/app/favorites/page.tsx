import { Star } from 'lucide-react';
import { FavoritesGrid } from '@/components/favorites/FavoritesGrid';

export const metadata = {
  title: 'Favoritos | ApexData',
  description: 'Tus pilotos y equipos favoritos de Fórmula 1',
};

export default function FavoritesPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-12">
        <div className="mb-4 flex items-center gap-3">
          <Star className="h-8 w-8 fill-primary stroke-primary" />
          <h1 className="text-4xl font-bold md:text-5xl">
            Mis <span className="text-primary">Favoritos</span>
          </h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Acceso rápido a tus pilotos y equipos favoritos
        </p>
      </div>

      {/* Favorites Grid */}
      <FavoritesGrid />
    </div>
  );
}
