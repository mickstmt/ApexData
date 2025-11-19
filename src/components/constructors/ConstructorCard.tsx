import Link from 'next/link';
import { Building2 } from 'lucide-react';

interface ConstructorCardProps {
  constructor: {
    id: string;
    constructorId: string;
    name: string;
    nationality: string;
    url: string | null;
  };
}

export function ConstructorCard({ constructor }: ConstructorCardProps) {
  return (
    <Link href={`/constructors/${constructor.constructorId}`}>
      <div className="group relative overflow-hidden rounded-lg border border-border bg-card p-6 transition-all hover:border-primary hover:shadow-lg">
        {/* Icon */}
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Building2 className="h-8 w-8 text-primary" />
        </div>

        {/* Nombre del equipo */}
        <h3 className="mb-3 text-xl font-bold text-foreground group-hover:text-primary transition-colors">
          {constructor.name}
        </h3>

        {/* Información */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="text-xs">🌍</span>
            <span>{constructor.nationality}</span>
          </div>
        </div>

        {/* Hover indicator */}
        <div className="absolute bottom-0 left-0 h-1 w-full origin-left scale-x-0 bg-primary transition-transform group-hover:scale-x-100" />
      </div>
    </Link>
  );
}
