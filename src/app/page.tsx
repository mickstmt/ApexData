import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Trophy, Calendar, TrendingUp } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-background to-muted/20 px-4 py-20 md:py-32">
        {/* Animated background pattern */}
        <div className="absolute inset-0 -z-10 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        </div>
        <div className="container relative mx-auto">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-7xl">
              <span className="text-foreground">Apex</span>
              <span className="text-primary">Data</span>
            </h1>
            <p className="mb-8 text-xl text-muted-foreground md:text-2xl">
              Plataforma moderna de datos de Fórmula 1
            </p>
            <p className="mb-10 text-lg text-muted-foreground">
              Información histórica desde 1950 y telemetría en tiempo real. Todo lo que necesitas para
              seguir el mundo de la F1.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link href="/drivers">
                <Button size="lg" className="w-full sm:w-auto">
                  Explorar Pilotos
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/standings">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Ver Standings
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-b border-border px-4 py-16 md:py-24">
        <div className="container mx-auto">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Todo sobre <span className="text-primary">Fórmula 1</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Acceso completo a datos históricos y en tiempo real
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Pilotos & Equipos</h3>
              <p className="text-muted-foreground">
                Información completa de todos los pilotos y constructores desde 1950 hasta la actualidad.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Calendario & Resultados</h3>
              <p className="text-muted-foreground">
                Calendario completo de la temporada con resultados de carreras, clasificación y sprints.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Estadísticas & Análisis</h3>
              <p className="text-muted-foreground">
                Análisis detallado de rendimiento, standings y telemetría en tiempo real.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-16 md:py-24">
        <div className="container mx-auto">
          <div className="mx-auto max-w-3xl rounded-lg border border-border bg-muted/50 p-8 text-center md:p-12">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              ¿Listo para explorar?
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Descubre toda la información de Fórmula 1 en un solo lugar
            </p>
            <Link href="/drivers">
              <Button size="lg">
                Comenzar ahora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
