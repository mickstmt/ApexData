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

    // La ruta tiene `loading.tsx`, así que `goto` termina con el ESQUELETO en
    // pantalla y la tabla llega después. Contar sin esperar hacía dos cosas
    // malas: fallar cuando el CI iba lento —pasó el 2026-08-20— y, peor, pasar
    // por vacío cuando el resto de comprobaciones no encontraban ninguna tabla
    // que revisar. `toBeAttached` reintenta hasta que el contenido llega.
    const cabeceras = page.locator('table th');
    await expect(cabeceras.first()).toBeAttached({ timeout: 30_000 });
    await expect(page.locator('table th:not([scope])')).toHaveCount(0);
    await expect(page.locator('table caption').first()).not.toBeEmpty();
  });

  test('en móvil las tablas anchas no obligan a arrastrar', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const ruta of ['/results?season=2024', '/results/2024/1']) {
      await page.goto(ruta);

      // Primero se espera el contenido: con el esqueleto en pantalla no hay ni
      // tablas ni filas plegables, así que las tres comprobaciones de abajo
      // pasarían por vacío sin haber mirado nada.
      const plegables = page.locator('button[aria-expanded="false"]');
      await expect(plegables.first()).toBeAttached({ timeout: 30_000 });

      // El defecto original: ~900 px de tabla en una pantalla de 390, con la
      // posición perdiéndose por la izquierda al arrastrar.
      const ancho = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(ancho).toBeLessThanOrEqual(390);

      await expect(page.locator('table:visible')).toHaveCount(0);
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

test.describe('telemetría', () => {
  /**
   * Una vuelta inventada: un círculo de 60 puntos con su distancia y su
   * velocidad.
   *
   * Se simulan las respuestas en vez de pedirlas al microservicio porque lo que
   * esta prueba comprueba es la **sincronización entre los dos lienzos**, no
   * que FastF1 responda — y el CI no tiene el servicio configurado, así que la
   * primera versión de esta prueba se quedó esperando un canvas que no iba a
   * llegar nunca.
   */
  const VUELTA = Array.from({ length: 60 }, (_, i) => {
    const angulo = (i / 60) * Math.PI * 2;
    return {
      x: Math.cos(angulo) * 1000,
      y: Math.sin(angulo) * 1000,
      distance: i * 50,
      speed: 150 + Math.sin(angulo * 3) * 100,
    };
  });

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/telemetry/**/track**', (route) =>
      route.fulfill({
        json: {
          driver: 'VER',
          lap_number: 12,
          lap_time: '1:29.179',
          rotation: 0,
          min_speed: 50,
          max_speed: 250,
          points: VUELTA,
        },
      })
    );

    await page.route(
      (url) => /\/api\/telemetry\/[^/]+\/[^/]+\/[^/]+\/[^/]+$/.test(url.pathname),
      (route) =>
        route.fulfill({
          json: {
            driver: 'VER',
            lap_number: 12,
            lap_time: '1:29.179',
            is_personal_best: true,
            compound: 'SOFT',
            tyre_life: 3,
            telemetry: VUELTA.map((punto) => ({
              Distance: punto.distance,
              Speed: punto.speed,
              Throttle: 80,
              Brake: false,
            })),
          },
        })
    );
  });

  test('el mapa y las trazas señalan el mismo punto de la vuelta', async ({ page }) => {
    await page.goto('/analysis');

    await page.getByRole('button', { name: /Cargar Telemetría/ }).click();
    await page.waitForSelector('canvas[aria-label*="Telemetría"]', { timeout: 20_000 });
    await page.getByRole('button', { name: /Trazado de/ }).click();
    await page.waitForSelector('canvas[aria-label*="Trazado"]', { timeout: 20_000 });

    const lectura = () =>
      page.locator('figcaption').filter({ hasText: 'Distancia de vuelta' }).first().innerText();

    // El mapa queda fuera de la ventana con las trazas cargadas: sin traerlo a
    // la vista, el ratón se mueve a coordenadas que ya no caen sobre él — que
    // fue exactamente el falso negativo que costó media hora al construirlo.
    const mapa = page.locator('canvas[aria-label*="Trazado"]');
    await mapa.scrollIntoViewIfNeeded();
    const caja = (await mapa.boundingBox())!;

    await page.mouse.move(caja.x + caja.width * 0.25, caja.y + caja.height * 0.5);
    const primera = await lectura();

    await page.mouse.move(caja.x + caja.width * 0.75, caja.y + caja.height * 0.5);
    await expect.poll(async () => (await lectura()) !== primera, { timeout: 5000 }).toBe(true);

    // Y al revés: moverse por las trazas pinta el marcador en el mapa. Se
    // cuentan píxeles opacos de la capa de encima —el lienzo del marcador, que
    // es el único `aria-hidden`—, porque un canvas no tiene texto que leer.
    const trazas = page.locator('canvas[aria-label*="Telemetría"]').first();
    await trazas.scrollIntoViewIfNeeded();
    const cajaTrazas = (await trazas.boundingBox())!;
    await page.mouse.move(
      cajaTrazas.x + cajaTrazas.width * 0.3,
      cajaTrazas.y + cajaTrazas.height * 0.5
    );

    const marcador = page.locator('canvas[aria-hidden="true"]').first();
    await expect
      .poll(
        async () =>
          await marcador.evaluate((c: HTMLCanvasElement) => {
            const datos = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
            let opacos = 0;
            for (let i = 3; i < datos.length; i += 4) if (datos[i] > 0) opacos++;
            return opacos;
          }),
        { timeout: 5000 }
      )
      .toBeGreaterThan(0);
  });
});

test.describe('pantalla de apertura', () => {
  test('tapa el arranque y se retira sola', async ({ page }) => {
    // Con `?splash` porque el modo instalado no se puede emular desde un
    // navegador: ni `Emulation.setEmulatedMedia` por CDP ni abrir Chromium con
    // `--app` hacen que `(display-mode: standalone)` valga.
    await page.goto('/?splash', { waitUntil: 'commit' });

    const capa = page.locator('[data-splash]');
    await expect(capa).toBeVisible();

    // La marca se dibuja: el trazo empieza con el hueco entero y termina sin
    // hueco. Si alguien quita `pathLength` o el fotograma clave, esto lo caza.
    await expect
      .poll(
        async () =>
          await page
            .locator('.splash-linea')
            // `parseFloat` y no `Number`: el valor calculado llega como «1px»
            // y `Number('1px')` es NaN, que no es menor que nada.
            .evaluate((e) => parseFloat(getComputedStyle(e).strokeDashoffset)),
        { timeout: 3000 }
      )
      .toBeLessThan(0.05);

    // Y se va sola, que es lo que la diferencia de una pantalla colgada.
    await expect(capa).toHaveCount(0, { timeout: 6000 });
  });

  test('en una pestaña normal no se ve ni un fotograma', async ({ page }) => {
    // La esconde una regla CSS, no JavaScript: si dependiera de hidratarse,
    // habría un parpadeo en cada visita desde el navegador.
    await page.goto('/', { waitUntil: 'commit' });

    const oculta = await page
      .locator('[data-splash]')
      .evaluate((e) => getComputedStyle(e).display);
    expect(oculta).toBe('none');
  });
});

test.describe('menú de secciones (hoja inferior)', () => {
  test('atrapa el foco, cierra con Escape y lo devuelve al botón', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/standings');

    const abrir = page.getByRole('button', { name: 'Abrir menú' });
    await abrir.click();

    const hoja = page.locator('dialog[data-hoja]');
    await expect(hoja).toBeVisible();
    // `:modal` es lo que distingue una capa de verdad de un `div` flotante:
    // deja inerte lo de detrás y atrapa el foco sin escribirlo a mano.
    expect(await hoja.evaluate((d: HTMLDialogElement) => d.matches(':modal'))).toBe(true);

    // Doce tabulaciones sin que el foco caiga en la página de detrás, que es lo
    // que hacía el menú anterior: cerraba con Escape, pero no atrapaba.
    let escapados = 0;
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const fuera = await page.evaluate(() => {
        const activo = document.activeElement;
        // El navegador pasa por <body> al cerrar el ciclo; eso no es escaparse.
        if (!activo || activo === document.body) return false;
        return activo.closest('dialog[data-hoja]') === null;
      });
      if (fuera) escapados++;
    }
    expect(escapados).toBe(0);

    await page.keyboard.press('Escape');
    await expect(hoja).toBeHidden();
    await expect(abrir).toBeFocused();
  });

  test('la hoja respeta la zona segura de abajo', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/standings');
    await page.getByRole('button', { name: 'Abrir menú' }).click();

    // En el navegador el inset vale 0 y queda el mínimo de 1,25rem; en el
    // iPhone instalado crece solo. Sin esto, la última sección cae bajo la
    // barra de gestos.
    const relleno = await page
      .locator('dialog[data-hoja] > div')
      .evaluate((e) => parseFloat(getComputedStyle(e).paddingBottom));
    expect(relleno).toBeGreaterThanOrEqual(20);
  });
});

test.describe('acento por equipo favorito', () => {
  const tono = (page: import('@playwright/test').Page) =>
    page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim());

  test('el equipo elegido tiñe la app y sigue siendo legible', async ({ page }) => {
    await page.goto('/favorites');

    const verde = await tono(page);

    // Mercedes es el caso que obliga a derivar: su turquesa da 1,31:1 sobre el
    // fondo claro, así que usado tal cual dejaría los enlaces ilegibles.
    await page.getByRole('button', { name: 'Mercedes' }).click();
    await expect.poll(async () => (await tono(page)) !== verde, { timeout: 5000 }).toBe(true);

    // Se mide en la página, no en el cálculo: el contraste de la tinta del
    // acento contra el fondo real tiene que llegar a 4,5:1.
    const contraste = await page.evaluate(() => {
      const luz = (css: string) => {
        const [r, g, b] = css.match(/\d+/g)!.slice(0, 3).map((v) => {
          const s = Number(v) / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const marca = document.createElement('span');
      marca.className = 'text-primary';
      document.body.appendChild(marca);
      const tinta = luz(getComputedStyle(marca).color);
      const fondo = luz(getComputedStyle(document.body).backgroundColor);
      marca.remove();
      const [claro, oscuro] = [tinta, fondo].sort((a, b) => b - a);
      return (claro + 0.05) / (oscuro + 0.05);
    });
    expect(contraste).toBeGreaterThanOrEqual(4.4);
  });

  test('las filas de tu equipo se distinguen, y sin equipo no se tiñe nada', async ({ page }) => {
    await page.goto('/favorites');
    await page.getByRole('button', { name: 'Mercedes' }).click();

    await page.goto('/standings');
    const fondoDe = (equipo: string) =>
      page.locator(`[data-equipo="${equipo}"]`).first().evaluate((e) => getComputedStyle(e).backgroundColor);

    const mio = await fondoDe('mercedes');
    expect(mio).not.toBe(await fondoDe('mclaren'));

    // Al quitar el equipo, el acento vuelve al verde de la marca y las filas
    // dejan de distinguirse.
    await page.goto('/favorites');
    await page.getByRole('button', { name: 'Sin equipo' }).click();
    await expect.poll(() => tono(page), { timeout: 5000 }).toBe('72 100% 20%');
  });
});

test.describe('ficha de circuito', () => {
  test('se llega desde la lista y cuenta desde dónde se gana aquí', async ({ page }) => {
    await page.goto('/circuits');

    // El enlace del título se estira sobre la tarjeta entera: se pulsa el
    // nombre, pero el objetivo táctil es la tarjeta.
    await page.getByRole('link', { name: /Monza/ }).first().click();
    await page.waitForURL('**/circuits/monza');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Monza');

    // Las dos cifras que distinguen un circuito de otro. Con expresión regular
    // anclada porque «desde la pole» también sale en cada fila del historial.
    await expect(page.getByText(/^Desde la pole$/)).toBeVisible();
    await expect(page.getByText(/^Parrilla media$/)).toBeVisible();

    const filas = page.locator('table tbody tr');
    expect(await filas.count()).toBeGreaterThan(5);
    // La primera columna es cabecera de fila, no una celda más: es el año, y
    // es lo que identifica a las demás.
    await expect(filas.first().locator('th')).toHaveAttribute('scope', 'row');
  });

  test('un circuito con dos carreras el mismo año da dos filas independientes', async ({
    page,
  }) => {
    // Red Bull Ring 2021 acogió el GP de Estiria y el de Austria, y 2020 lo
    // mismo. Con el año como clave, las dos filas compartían identificador:
    // desplegar una abría las dos.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/circuits/red_bull_ring');

    const de2021 = page.locator('[aria-controls^="detalle-2021"]');
    await expect(de2021).toHaveCount(2);

    const ids = await de2021.evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-controls')));
    expect(new Set(ids).size).toBe(2);

    await de2021.first().click();
    await expect(de2021.first()).toHaveAttribute('aria-expanded', 'true');
    await expect(de2021.nth(1)).toHaveAttribute('aria-expanded', 'false');
  });

  test('en móvil el historial se pliega y el detalle lleva a la carrera', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/circuits/monza');

    await expect(page.locator('table').first()).toBeHidden();

    // Se agarra por `aria-controls` y no por el nombre accesible: al
    // desplegarse, la fila pasa de «Ver más de…» a «Ocultar…», así que un
    // localizador por nombre se resuelve luego a OTRA fila —la siguiente sin
    // desplegar— y lee un `aria-expanded` que no es el suyo.
    const fila = page.locator('[aria-controls^="detalle-"]').first();
    const detalleId = await fila.getAttribute('aria-controls');
    await fila.click();
    await expect(page.locator(`[aria-controls="${detalleId}"]`)).toHaveAttribute(
      'aria-expanded',
      'true'
    );

    const detalle = page.locator('dl').first();
    await expect(detalle).toContainText('Salió');
    await expect(detalle.getByRole('link').first()).toHaveAttribute('href', /\/results\/\d+\/\d+/);
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
    //
    // Por la cabecera `rsc` y no por la URL: con el patrón de dirección la
    // navegación de este selector se colaba sin frenar en CI, la ventana de
    // carga duraba un suspiro y se cerraba entre dos comprobaciones —el aviso
    // para lectores pasaba y el indicador ya no estaba—. Es la misma técnica
    // que usa la prueba del coche, que nunca ha fallado.
    await page.route('**/*', async (route) => {
      const cabeceras = route.request().headers();
      if (cabeceras['next-router-prefetch'] === '1') return route.abort();
      if (cabeceras['rsc'] === '1') await new Promise((r) => setTimeout(r, 2500));
      return route.continue();
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