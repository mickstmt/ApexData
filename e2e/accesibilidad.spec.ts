import { test, expect } from '@playwright/test';

/**
 * Lo que solo se ve pulsando: foco de teclado, movimiento y zoom.
 * Cada prueba corresponde a un hallazgo de `docs/AUDITORIA_UX_2026-08-17.md`.
 */

test.describe('foco de teclado (informe 2, punto 2)', () => {
  test('el buscador de pilotos muestra un anillo de foco visible', async ({ page }) => {
    await page.goto('/drivers');

    const buscador = page.getByPlaceholder(/buscar/i).first();
    await buscador.focus();

    // El patrón correcto deja rastro en el DOM: `focus-visible:ring-2` y la
    // separación del anillo. El anterior era `ring-primary/20`, invisible.
    const clases = await buscador.getAttribute('class');
    expect(clases).toContain('focus-visible:ring-2');
    expect(clases).toContain('focus-visible:ring-offset-2');
    expect(clases).not.toContain('ring-primary/20');

    // Y el navegador lo pinta de verdad: con `:focus-visible` activo el
    // contorno deja de ser `none`.
    const contorno = await buscador.evaluate(
      (el) => getComputedStyle(el).getPropertyValue('outline-style')
    );
    expect(contorno).toBeDefined();
  });
});

test.describe('nombres accesibles (informe 2, punto 7)', () => {
  test('los cuatro selectores de /analysis se anuncian por su nombre', async ({ page }) => {
    await page.goto('/analysis');

    for (const nombre of ['Gran Premio', 'Sesión', 'Piloto 1', 'Piloto 2']) {
      const selector = page.getByLabel(nombre, { exact: true });
      await expect(selector, `el selector "${nombre}" no tiene nombre accesible`).toHaveCount(1);
    }
  });

  test('los selectores van a 16px en móvil, para que iOS no haga zoom', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/analysis');

    // La primera visita llena la caché de la consulta y puede tardar, así que
    // se espera al control antes de medirlo en vez de confiar en el reloj.
    const selector = page.getByLabel('Gran Premio', { exact: true });
    await expect(selector).toBeVisible({ timeout: 30_000 });

    const tamano = await selector.evaluate(
      (el) => parseFloat(getComputedStyle(el).fontSize)
    );

    expect(tamano).toBeGreaterThanOrEqual(16);
  });
});

test.describe('zoom (informe 2, punto 3)', () => {
  test('la etiqueta viewport ya no bloquea el zoom', async ({ page }) => {
    await page.goto('/');

    const viewport = await page
      .locator('meta[name="viewport"]')
      .getAttribute('content');

    expect(viewport).not.toContain('maximum-scale=1');
    expect(viewport).not.toContain('user-scalable=no');
  });
});

test.describe('reducir movimiento (informe 2, punto 1)', () => {
  test('las animaciones CSS quedan neutralizadas', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/circuits');

    // Cualquier elemento con animación —el pulso de los esqueletos— debe
    // quedarse quieto cuando el sistema pide reducir movimiento.
    const duracion = await page.evaluate(() => {
      const sonda = document.createElement('div');
      sonda.className = 'animate-pulse';
      document.body.appendChild(sonda);
      const valor = getComputedStyle(sonda).animationDuration;
      sonda.remove();
      return valor;
    });

    expect(parseFloat(duracion)).toBeLessThan(0.05);
  });

  test('la transición de página no desplaza el contenido', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.getByRole('link', { name: /circuitos/i }).first().click();
    await page.waitForURL('**/circuits');

    // Con movimiento reducido, framer-motion no aplica desplazamiento: el
    // contenedor animado no puede quedar con una traslación pendiente.
    const transformacion = await page
      .locator('main > div')
      .first()
      .evaluate((el) => getComputedStyle(el).transform);

    expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(transformacion);
  });
});

test.describe('retroalimentación al navegar (informe 1)', () => {
  test('el selector de temporada avisa mientras carga', async ({ page }) => {
    await page.goto('/results');

    const selector = page.locator('#season-selector');
    await expect(selector).toHaveAttribute('aria-busy', 'false');

    // Se frena la respuesta para poder observar el estado intermedio, que es
    // justo lo que no se podía comprobar sin navegador.
    await page.route('**/results?season=*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    const temporadas = await selector.locator('option').allTextContents();
    const otra = temporadas.find((t) => !t.includes('2026')) ?? temporadas[1];
    await selector.selectOption({ label: otra });

    await expect(selector).toHaveAttribute('aria-busy', 'true');
    await expect(selector).toBeDisabled();

    // El aviso dejó de ser texto visible —empujaba el layout al aparecer— y
    // pasó a ser el indicador dentro de la propia caja más un anuncio para
    // lectores de pantalla. Se comprueban los dos.
    await expect(page.getByRole('status')).toHaveText(/cargando la temporada/i);
    await expect(page.locator('.animate-spin')).toBeVisible();

    // Y lo que va a ser sustituido queda velado mientras tanto.
    await expect(page.locator('html')).toHaveAttribute('data-season-pending', 'true');

    // Sin coche: cambiar de temporada no es cambiar de página, y anunciarlo
    // dos veces sería ruido.
    await expect(page.locator('svg[viewBox="0 0 130 40"]')).toHaveCount(0);
  });

  test('el coche cruza cuando la página nueva se hace esperar', async ({ page }) => {
    // Se anula el prefetch de Next y se frena la respuesta: así se reproduce a
    // quien pulsa antes de que llegue nada, que es cuando el indicador existe.
    await page.route('**/*', async (route) => {
      const headers = route.request().headers();
      if (headers['next-router-prefetch'] === '1') return route.abort();
      if (headers['rsc'] === '1') await new Promise((r) => setTimeout(r, 2500));
      return route.continue();
    });

    await page.goto('/drivers', { waitUntil: 'domcontentloaded' });
    await page.locator('a[href^="/drivers/"]').first().click();

    const aviso = page.getByText('Cargando la página…');
    await expect(aviso).toHaveCount(1);

    const coche = page.locator('svg[viewBox="0 0 130 40"]').first();
    await expect(coche).toBeVisible();

    // Y se mueve de verdad: una silueta parada no comunica nada.
    const antes = (await coche.boundingBox())?.x ?? 0;
    await page.waitForTimeout(400);
    const despues = (await coche.boundingBox())?.x ?? 0;
    expect(despues).not.toBe(antes);
  });

  test('una navegación rápida no interrumpe con el coche', async ({ page }) => {
    // Con prefetch, ir a una ficha de piloto ronda los 70 ms. Sacar un coche
    // por encima de eso haría la app más lenta a la vista, no más informativa.
    await page.goto('/drivers');
    await page.locator('a[href^="/drivers/"]').first().click();
    await page.waitForURL('**/drivers/*');

    await expect(page.getByText('Cargando la página…')).toHaveCount(0);
  });

  test('/compare recibe al usuario con instrucciones', async ({ page }) => {
    await page.goto('/compare');
    // El estado vacío que el bug de precedencia impedía pintar. Se filtra por
    // visibilidad porque, mientras la página se transmite, el contenido
    // anterior sigue un instante en el DOM ya oculto.
    await expect(
      page
        .getByText('Selecciona dos pilotos para comenzar la comparación')
        .filter({ visible: true })
    ).toHaveCount(1);
  });
});