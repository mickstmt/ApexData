import { expect, test, type Page } from '@playwright/test';

/**
 * El pie es de la web; la app instalada no lo lleva.
 *
 * Su navegación ya está en la barra inferior y en «Más», así que en la PWA era
 * pantalla gastada en repetirse. Lo único que no vivía en ningún otro sitio
 * —el crédito a Jolpica y a OpenF1— tiene ahora su propia página, y no es
 * opcional: las dos publican bajo CC BY-NC-SA 4.0 y la «BY» es Atribución.
 */
test.use({ viewport: { width: 390, height: 844 } });

/**
 * Finge que la página corre dentro de la app instalada.
 *
 * Se sustituye `matchMedia` y no se emula el modo de verdad porque Playwright
 * no sabe hacerlo: `display-mode` no está entre los medios que emula. Con esto
 * se comprueba lo que de verdad se puede romper —la marca, la regla de CSS y
 * el hueco— aunque la señal venga de mentira.
 */
async function comoInstalada(page: Page) {
  await page.addInitScript(() => {
    const real = window.matchMedia.bind(window);
    window.matchMedia = (q: string) =>
      q.includes('display-mode: standalone')
        ? ({
            matches: true, media: q, onchange: null,
            addListener() {}, removeListener() {},
            addEventListener() {}, removeEventListener() {},
            dispatchEvent: () => false,
          } as MediaQueryList)
        : real(q);
  });
}

const medir = (page: Page) =>
  page.evaluate(() => {
    const caja = document.querySelector<HTMLElement>('[data-pie-de-la-app]')!;
    const pie = document.querySelector<HTMLElement>('footer');
    const nav = document.querySelector<HTMLElement>('nav[aria-label="Navegación principal"]')!;
    const cb = nav.getBoundingClientRect();
    return {
      marcada: document.documentElement.hasAttribute('data-instalada'),
      altoCaja: Math.round(caja.getBoundingClientRect().height),
      pieVisible: !!pie && getComputedStyle(pie).display !== 'none',
      // Lo que TAPA, no lo que mide: desde que la barra flota queda un margen
      // entre su borde inferior y el de la pantalla que también estorba.
      tapaBarra: Math.round(window.innerHeight - cb.top),
    };
  });

test('en la web se pinta el pie', async ({ page }) => {
  await page.goto('/calendar');
  const m = await medir(page);
  expect(m.marcada).toBe(false);
  expect(m.pieVisible).toBe(true);
  expect(m.altoCaja).toBeGreaterThan(m.tapaBarra);
});

test('en la app instalada no se pinta, pero el hueco de la barra sigue', async ({ page }) => {
  await comoInstalada(page);
  await page.goto('/calendar');
  const m = await medir(page);

  expect(m.marcada).toBe(true);
  expect(m.pieVisible).toBe(false);

  // Lo que de verdad se puede romper aquí: si al quitar el pie se quitara
  // también su contenedor, lo último de cada página quedaría debajo de la
  // barra. El contenedor tiene que seguir midiendo justo lo que la barra tapa.
  expect(m.altoCaja).toBe(m.tapaBarra);
});

test('«Acerca de» acredita a las tres fuentes y se llega desde el menú', async ({ page }) => {
  await page.goto('/acerca');
  await expect(page.getByRole('heading', { name: 'Acerca de ApexData' })).toBeVisible();

  const texto = await page.locator('body').innerText();
  // Las dos que lo exigen por licencia, la tercera por honradez, y el aviso de
  // marcas que ApexData tiene que dar igual que se lo da FastF1.
  for (const debe of ['Jolpica F1', 'OpenF1', 'FastF1', 'CC BY-NC-SA 4.0', 'Formula One Licensing']) {
    expect(texto).toContain(debe);
  }

  await page.goto('/calendar');
  await page.getByRole('button', { name: 'Más' }).click();
  await expect(page.getByRole('link', { name: 'Acerca de' })).toBeVisible();
});
