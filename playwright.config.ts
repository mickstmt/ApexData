import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas de comportamiento en un navegador real.
 *
 * Existen por una razón concreta: lint, tipos y build no pueden ver un hueco
 * de comportamiento — la app compila igual de bien sin estados de carga, sin
 * foco visible y sin respetar "reducir movimiento". Todo el Sprint 6 nace de
 * eso, así que lo que se arregla aquí se comprueba aquí.
 *
 * Se ejecutan contra el servidor de producción local, no el de desarrollo,
 * porque es el que se parece a lo que se despliega.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,

  // En CI, UN solo proceso.
  //
  // El servidor de pruebas comparte UNA conexión a la base de datos —así viene
  // la URL, con `connection_limit=1`— y cada consulta cuesta ~500 ms contra
  // Virginia. Con dos navegadores pidiendo a la vez, la conexión se agota:
  // Prisma espera diez segundos, se rinde, y la página se pinta VACÍA — el
  // registro dice «Timed out fetching a new connection from the connection
  // pool». La prueba falla sin que lo que vigila esté roto.
  //
  // Medido con la restricción del CI reproducida en local: con dos procesos,
  // dos o tres pruebas inestables por tanda; con uno, treinta y nueve de
  // treinta y nueve a la primera. Y no cuesta tiempo: los dos procesos
  // tampoco avanzaban en paralelo de verdad —se encolaban en la misma
  // conexión— así que la tanda tarda lo mismo (~5 min).
  workers: process.env.CI ? 1 : undefined,
  // Un reintento en CI, y solo en CI.
  //
  // `trace: 'on-first-retry'` estaba puesto desde el principio pero no había
  // reintentos configurados, así que esa traza no se generó nunca. Un fallo
  // que se repite sigue siendo un fallo; uno que pasa al segundo intento sale
  // marcado como inestable y con su traza, que es lo que hace falta para
  // arreglarlo en vez de adivinar. No se pone en local: aquí la máquina no
  // compite consigo misma y un fallo debe verse a la primera.
  retries: process.env.CI ? 1 : 0,
  // En CI, además de la lista, el reporter de GitHub: publica cada fallo como
  // anotación del check, que se puede leer por API sin autenticación. Sin esto,
  // un fallo del job solo dice «exit code 1» y el log pide credenciales — dos
  // veces hoy hubo que reproducirlo a ciegas para averiguar qué se rompía.
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  timeout: 60_000,
  // En CI, una aserción espera hasta quince segundos en vez de cinco.
  //
  // No es paciencia gratuita: allí la app comparte UNA conexión a la base y
  // cada consulta cuesta ~500 ms contra Virginia, así que una página que
  // consulta puede tardar tranquilamente más de cinco segundos en tener su
  // contenido. Medido con esa misma restricción en local, la tanda pasa de 1,1
  // a 4,9 minutos y dos pruebas fallaban a la primera por eso y no por lo que
  // vigilan. Subir el límite ataca la clase entera de fallo; ponerle un
  // `timeout` a cada aserción sería ir apagando fuegos de uno en uno.
  expect: { timeout: process.env.CI ? 15_000 : 5_000 },
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'on-first-retry',
    /**
     * Navegar tiene su propio límite, más largo que el de una aserción.
     *
     * `page.goto` espera por defecto al evento `load`, que no llega hasta que
     * han cargado **todas las imágenes**. Una ficha de circuito lleva banderas,
     * fotos y el trazado, y en CI —con dos procesos compartiendo una sola
     * conexión a la base— eso se pasaba de los sesenta segundos del límite de
     * la prueba entera: el fallo salía como «test timeout» y no como lo que
     * era, una navegación lenta.
     */
    navigationTimeout: process.env.CI ? 45_000 : 20_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx next start -p 3100',
    url: 'http://localhost:3100/api/health',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});