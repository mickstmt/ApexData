import Link from 'next/link';
import { WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Sin conexión | ApexData',
};

export default function OfflinePage() {
  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-card">
        <WifiOff className="h-10 w-10 text-muted-foreground" aria-hidden />
      </div>

      <h1 className="mb-3 text-3xl font-bold">Sin conexión</h1>
      <p className="mb-8 max-w-sm text-muted-foreground">
        No hay internet ahora mismo. Las páginas que ya visitaste siguen disponibles; el resto
        volverá en cuanto recuperes la conexión.
      </p>

      <Link href="/">
        <Button>Reintentar</Button>
      </Link>
    </div>
  );
}
