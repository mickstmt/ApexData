import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';

export const metadata = {
  title: 'No se pudo entrar | ApexData',
  robots: { index: false },
};

/**
 * Cuando el acceso falla, en español y diciendo qué hacer.
 *
 * Sin esta página, `next-auth` lleva a una suya que dice «Unable to sign in» en
 * inglés, sin explicar cuál de los tres motivos posibles es ni qué hacer con
 * él. Un enlace de acceso caducado es lo más normal del mundo —llega al correo
 * y se abre al día siguiente— y merece una frase, no un cartel genérico.
 *
 * Los códigos son los que `next-auth` pone en `?error=`. Los que no están aquí
 * caen en el mensaje de abajo, que también dice qué hacer.
 */
const MOTIVOS: Record<string, { titulo: string; explicacion: string }> = {
  Verification: {
    titulo: 'Ese enlace ya no vale',
    explicacion:
      'Los enlaces de acceso caducan a las 24 horas y solo se pueden usar una vez. Pide uno nuevo y ábrelo cuanto antes.',
  },
  AccessDenied: {
    titulo: 'No se completó el acceso',
    explicacion:
      'Se canceló el permiso en la pantalla de Google, o se cerró antes de terminar. No ha pasado nada: puedes volver a intentarlo.',
  },
  Configuration: {
    titulo: 'El acceso no está disponible ahora mismo',
    explicacion:
      'Es un problema del servidor, no de tu cuenta. La app funciona igual sin entrar; vuelve a probar más tarde.',
  },
  OAuthAccountNotLinked: {
    titulo: 'Ese correo ya entró de otra forma',
    explicacion:
      'Esta dirección ya tiene cuenta, creada con la otra vía de acceso. Entra como lo hiciste la primera vez y las dos quedarán unidas.',
  },
};

export default async function ErrorDeAcceso({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const motivo = (error && MOTIVOS[error]) || {
    titulo: 'No se pudo entrar',
    explicacion:
      'Algo se cortó por el camino. Vuelve a intentarlo desde el engranaje de arriba; si sigue pasando, la app funciona igual sin cuenta.',
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-prose rounded-2xl border border-border bg-card p-8">
        <TriangleAlert className="mb-4 h-8 w-8 text-primary" aria-hidden />
        <h1 className="mb-2 font-display text-2xl font-bold">{motivo.titulo}</h1>
        <p className="mb-6 text-muted-foreground">{motivo.explicacion}</p>

        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground ring-offset-background hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Volver al inicio
        </Link>

        {/* El código, en pequeño: no significa nada para quien lo lee, pero es
            lo primero que hace falta si alguien lo reporta. */}
        {error && (
          <p className="mt-6 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Código: {error}
          </p>
        )}
      </div>
    </div>
  );
}
