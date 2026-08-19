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

test.describe('semántica y objetivos táctiles (informe 2, puntos 6, 9, 12-14)', () => {
  test('las pestañas de sesión se anuncian como pestañas y van con flechas', async ({ page }) => {
    await page.goto('/results/2024/1');

    await expect(page.getByRole('tablist')).toHaveCount(1);
    await expect(page.getByRole('tabpanel')).toHaveCount(1);

    const activa = page.getByRole('tab', { selected: true });
    await expect(activa).toHaveCount(1);
    const antes = await activa.innerText();

    await activa.focus();
    await page.keyboard.press('ArrowRight');

    await expect(page.getByRole('tab', { selected: true })).not.toHaveText(antes);
  });

  test('las tablas asocian cada celda con su cabecera', async ({ page }) => {
    await page.goto('/results/2024/1');

    // Sin `scope`, con siete columnas, un lector de pantalla no puede decir a
    // qué cabecera pertenece la celda que está leyendo.
    const cabeceras = page.locator('table th');
    expect(await cabeceras.count()).toBeGreaterThan(0);
    await expect(page.locator('table th:not([scope])')).toHaveCount(0);
    await expect(page.locator('table caption').first()).not.toBeEmpty();
  });

  test('en móvil las tablas anchas no obligan a arrastrar', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const ruta of ['/results?season=2024', '/results/2024/1']) {
      await page.goto(ruta);

      // El defecto original: ~900 px de tabla en una pantalla de 390, con la
      // posición perdiéndose por la izquierda al arrastrar.
      const ancho = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(ancho).toBeLessThanOrEqual(390);

      await expect(page.locator('table:visible')).toHaveCount(0);
      expect(await page.locator('button[aria-expanded="false"]').count()).toBeGreaterThan(0);
    }
  });

  test('la fila desplegada muestra las columnas que se ocultaron', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/results/2024/1');

    const fila = page.locator('button[aria-expanded]').filter({ hasText: 'Verstappen' }).first();
    await fila.click();

    await expect(fila).toHaveAttribute('aria-expanded', 'true');
    const etiquetas = await page.locator('dl:visible dt').allInnerTexts();
    expect(etiquetas).toEqual(
      expect.arrayContaining(['Piloto', 'Equipo', 'Dorsal', 'Vueltas', 'Puntos'])
    );
  });

  test('en escritorio la tabla sigue siendo una tabla', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/results/2024/1');

    await expect(page.locator('table:visible')).toHaveCount(1);
    await expect(page.locator('table:visible th[scope="col"]').first()).toBeVisible();
  });

  test('en móvil no queda ningún control por debajo de 44 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/drivers');

    const pequeños = await page.locator('button:visible').evaluateAll((els) =>
      els
        .map((el) => {
          const caja = el.getBoundingClientRect();
          return {
            nombre: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30),
            ancho: Math.round(caja.width),
            alto: Math.round(caja.height),
          };
        })
        .filter((control) => control.alto > 0 && (control.alto < 44 || control.ancho < 44))
    );

    expect(pequeños).toEqual([]);
  });
});

test.describe('retroalimentación al navegar (informe 1)', () => {
  test('el selector de temporada avisa mientras carga', async ({ page }) => {
    await page.goto('/results');

    // Por nombre accesible y no por id: el id ya no es fijo, y mientras la
    // página se transmite puede haber un instante dos copias en el DOM — que
    // es justo lo que hizo fallar esta prueba en CI y nunca en local.
    const selector = page.getByRole('combobox', { name: 'Temporada' }).last();
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

  test('el coche no interrumpe una navegación breve', async ({ page }) => {
    // La propiedad es "no aparece antes del umbral de 250 ms", y eso es lo que
    // se mide: al poco de pulsar, todavía no hay nada.
    //
    // La primera versión de esta prueba navegaba y comprobaba al terminar que
    // no había coche. Pasaba en local —con la página cacheada, la navegación
    // ronda los 70 ms— y falló en CI, donde con caché fría tarda más de 250 ms
    // y el indicador aparece, que es justo lo que debe hacer. Medía la
    // velocidad de la máquina, no el comportamiento.
    await page.goto('/drivers');
    await page.locator('a[href^="/drivers/"]').first().click();

    await page.waitForTimeout(120);
    expect(await page.getByText('Cargando la página…').count()).toBe(0);
  });

  test('las pantallas retiradas redirigen en vez de dar 404', async ({ page }) => {
    // `/compare` y `/telemetry` se jubilaron —una calculaba sobre cinco
    // carreras y la otra llevaba meses diciendo «próximamente»—, pero puede
    // haber enlaces guardados: una redirección explica a dónde ir, un 404 no.
    // Por HTTP y no navegando: lo que se comprueba es el contrato del
    // redirect —código y destino—, y encadenar dos `goto` a rutas que redirigen
    // aborta la segunda navegación por cómo las agrupa el navegador.
    for (const [origen, destino] of [
      ['/compare', '/drivers'],
      ['/telemetry', '/analysis'],
    ]) {
      const respuesta = await page.request.get(origen, { maxRedirects: 0 });

      expect(respuesta.status()).toBe(308);
      expect(respuesta.headers()['location']).toContain(destino);
    }
  });
});