import { Github } from 'lucide-react';

export const metadata = {
  title: 'Acerca de | ApexData',
  description: 'De dónde salen los datos de ApexData, con qué licencia y hasta dónde llegan.',
};

/**
 * De dónde salen los datos, dicho donde se puede leer desde la app instalada.
 *
 * No es una página de cortesía. Jolpica y OpenF1 publican sus datos bajo
 * CC BY-NC-SA 4.0, y la «BY» es Atribución: acreditarlas es una condición de
 * la licencia. Hasta ahora el único sitio donde se las nombraba era el pie, y
 * el pie no se enseña en la app instalada —es navegación repetida— así que sin
 * esta página la PWA no acreditaba a nadie. Y la PWA es justo la versión que
 * usa quien no programa.
 *
 * El aviso de marcas no es relleno: FastF1 lleva el suyo, y ApexData está en
 * la misma posición exacta respecto a la Fórmula 1.
 */

interface Fuente {
  nombre: string;
  url: string;
  que: string;
  licencia: string;
}

const FUENTES: Fuente[] = [
  {
    nombre: 'Jolpica F1',
    url: 'https://jolpi.ca/ergast/',
    que: 'El histórico: carreras, resultados, clasificaciones y parrillas desde 1950. Es la continuación de Ergast, que cerró.',
    licencia: 'CC BY-NC-SA 4.0',
  },
  {
    nombre: 'OpenF1',
    url: 'https://openf1.org',
    que: 'Cronometría y datos de sesión en directo, de 2023 en adelante.',
    licencia: 'CC BY-NC-SA 4.0',
  },
  {
    nombre: 'FastF1',
    url: 'https://github.com/theOehrly/Fast-F1',
    que: 'La biblioteca que lee la cronometría oficial: vueltas, telemetría y la posición de los coches que mueve el replay.',
    licencia: 'MIT',
  },
];

export default function AcercaPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-3 text-3xl font-bold md:text-4xl">Acerca de ApexData</h1>
      <p className="mb-10 text-muted-foreground">
        Un sitio para mirar Fórmula 1 con calma: el calendario, los resultados, la clasificación y
        la telemetría de cada sesión. Está hecho por gusto, no se cobra y no lleva publicidad.
      </p>

      <h2 className="mb-1 text-xl font-semibold">De dónde salen los datos</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        ApexData no mide nada por su cuenta. Todo lo que se ve aquí viene de estos tres proyectos,
        que lo publican abiertamente.
      </p>

      <ul className="mb-10 grid list-none gap-4 p-0">
        {FUENTES.map((fuente) => (
          <li key={fuente.nombre} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <a
                href={fuente.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline"
              >
                {fuente.nombre}
              </a>
              <span className="font-mono text-xs text-muted-foreground">{fuente.licencia}</span>
            </div>
            <p className="text-sm text-muted-foreground">{fuente.que}</p>
          </li>
        ))}
      </ul>

      <h2 className="mb-1 text-xl font-semibold">Qué permiten esas licencias</h2>
      <p className="mb-10 text-sm text-muted-foreground">
        Jolpica y OpenF1 publican sus datos bajo{' '}
        <a
          href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.es"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-primary"
        >
          CC BY-NC-SA 4.0
        </a>
        : hay que acreditarlas —esta página lo hace— y el uso no puede ser comercial. Por eso
        ApexData es gratis y seguirá sin publicidad. FastF1 es MIT.
      </p>

      <h2 className="mb-1 text-xl font-semibold">Esto no es la Fórmula 1</h2>
      <p className="mb-10 text-sm text-muted-foreground">
        ApexData no es oficial ni está asociado de ninguna forma con las empresas de la Fórmula 1.
        F1, FORMULA ONE, FORMULA 1, FIA FORMULA ONE WORLD CHAMPIONSHIP, GRAND PRIX y las marcas
        relacionadas son marcas registradas de Formula One Licensing B.V.
      </p>

      <h2 className="mb-3 text-xl font-semibold">El código</h2>
      <a
        href="https://github.com/mickstmt/ApexData"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium hover:text-primary"
      >
        <Github className="h-4 w-4" aria-hidden />
        Ver ApexData en GitHub
      </a>
    </div>
  );
}
