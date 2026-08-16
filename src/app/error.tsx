'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-card">
        <AlertTriangle className="h-10 w-10 text-muted-foreground" />
      </div>

      <h1 className="mb-3 text-3xl font-bold">Algo salió mal</h1>
      <p className="mb-8 max-w-md text-muted-foreground">
        No pudimos cargar esta página. Puede ser un problema temporal de conexión con la base de datos.
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reintentar
        </Button>
        <Link href="/">
          <Button variant="outline">Ir al inicio</Button>
        </Link>
      </div>
    </div>
  );
}
