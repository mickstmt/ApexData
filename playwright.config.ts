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
  reporter: 'list',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'on-first-retry',
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