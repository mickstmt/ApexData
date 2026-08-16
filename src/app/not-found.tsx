import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center">
      <p className="mb-4 text-7xl font-bold tabular-nums text-primary">404</p>

      <h1 className="mb-3 text-3xl font-bold">Página no encontrada</h1>
      <p className="mb-8 max-w-md text-muted-foreground">
        Esta página no existe o el contenido que buscas ya no está disponible.
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/">
          <Button>Ir al inicio</Button>
        </Link>
        <Link href="/calendar">
          <Button variant="outline">Ver calendario</Button>
        </Link>
      </div>
    </div>
  );
}
