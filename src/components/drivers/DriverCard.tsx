import Link from 'next/link';
import { User } from 'lucide-react';

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
  };
}

export function DriverCard({ driver }: DriverCardProps) {
  const age = driver.dateOfBirth
    ? new Date().getFullYear() - new Date(driver.dateOfBirth).getFullYear()
    : null;

  return (
    <Link href={`/drivers/${driver.driverId}`}>
      <div className="group relative overflow-hidden rounded-lg border border-border bg-card p-6 transition-all hover:border-primary hover:shadow-lg">
        {/* Número permanente en background */}
        {driver.permanentNumber && (
          <div className="absolute right-4 top-4 text-6xl font-bold text-muted/10 transition-colors group-hover:text-primary/20">
            {driver.permanentNumber}
          </div>
        )}

        {/* Contenido */}
        <div className="relative">
          {/* Avatar placeholder */}
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <User className="h-8 w-8 text-primary" />
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
              <span className="text-xs">🏁</span>
              <span>{driver.nationality}</span>
            </div>
            {age && (
              <div className="flex items-center gap-2">
                <span className="text-xs">🎂</span>
                <span>{age} años</span>
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
      </div>
    </Link>
  );
}
