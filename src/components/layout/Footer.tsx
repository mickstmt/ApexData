import Link from 'next/link';
import { Github } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Branding */}
          <div className="space-y-3">
            <div className="text-xl font-bold">
              <span className="text-foreground">Apex</span>
              <span className="text-primary">Data</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Plataforma moderna de datos de Fórmula 1. Información histórica y telemetría en tiempo real.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Navegación</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/drivers"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  Pilotos
                </Link>
              </li>
              <li>
                <Link
                  href="/constructors"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  Equipos
                </Link>
              </li>
              <li>
                <Link
                  href="/calendar"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  Calendario
                </Link>
              </li>
              <li>
                <Link
                  href="/standings"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  Standings
                </Link>
              </li>
            </ul>
          </div>

          {/* About */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Proyecto</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://github.com/mickstmt/ApexData"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://jolpi.ca/ergast/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  Jolpica F1 API
                </a>
              </li>
              <li>
                <a
                  href="https://openf1.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  OpenF1 API
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 border-t border-border pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            © {currentYear} ApexData. Desarrollado con{' '}
            <span className="text-primary">Next.js</span> y{' '}
            <span className="text-primary">TypeScript</span>.
          </p>
        </div>
      </div>
    </footer>
  );
}
