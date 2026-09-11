import { expect, test, type Page } from '@playwright/test';

/**
 * El replay de una carrera, en los tres sitios donde se ve.
 *
 * Los datos de posición se simulan: lo que se comprueba es la pantalla —que
 * la torre mida lo que debe en cada ancho, que reproducir mueva el reloj, que
 * elegir un piloto lo marque— y no que FastF1 responda. El CI no tiene el
 * servicio configurado, y eso también se prueba: la página tiene que decirlo
 * en vez de romperse.
 */

const RADIO = 1000;
const PUNTOS = 60;
const COUNT = 120; // 30 s a 4 Hz
const PASO = 0.25;

/**
 * Veintidós, como una parrilla de verdad. Con cuatro, la torre cabía en la
 * pantalla y la prueba no podía ver que una fila desplazada quedara tapada
 * bajo el mapa o los mandos — que es justo lo que pasó con la carrera real.
 */
const EQUIPOS = ['McLaren', 'Ferrari', 'Mercedes', 'Red Bull Racing', 'Williams', 'Alpine', 'Aston Martin', 'Haas F1 Team', 'Racing Bulls', 'Audi', 'Cadillac'];
const PILOTOS = Array.from({ length: 22 }, (_, i) => ({
  number: String(i + 1),
  code: `P${String(i + 1).padStart(2, '0')}`,
  name: `Piloto ${i + 1}`,
  team: EQUIPOS[Math.floor(i / 2)],
  color: '#888888',
}));

function meta() {
  return {
    session: { year: 2026, event: 'British Grand Prix', type: 'R', name: 'Race' },
    timeline: { start: 0, step: PASO, count: COUNT },
    sinDato: -32768,
    totalLaps: 52,
    rotation: 0,
    drivers: PILOTOS.map((p) => ({ ...p, laps: [15, 28] })),
    trackStatus: [
      { status: '1', start: 0, end: 10 },
      { status: '2', start: 10, end: 20 },
      { status: '1', start: 20, end: 30 },
    ],
    track: Array.from({ length: PUNTOS }, (_, i) => {
      const a = (i / PUNTOS) * Math.PI * 2;
      return { x: Math.cos(a) * RADIO, y: Math.sin(a) * RADIO, speed: 200, distance: (i / PUNTOS) * 2 * Math.PI * RADIO };
    }),
  };
}

/** Cuatro coches dando vueltas al círculo, cada uno un poco más atrás. */
function bloque(): Buffer {
  const datos = new Int16Array(PILOTOS.length * 2 * COUNT);
  PILOTOS.forEach((_, i) => {
    for (let k = 0; k < COUNT; k++) {
      const d = k * 40 - i * 150;
      const a = d / RADIO;
      datos[i * 2 * COUNT + k] = Math.round(Math.cos(a) * RADIO);
      datos[i * 2 * COUNT + COUNT + k] = Math.round(Math.sin(a) * RADIO);
    }
  });
  return Buffer.from(datos.buffer);
}

/**
 * Mueve el scrubber como lo haría el dedo, con el evento que React escucha.
 *
 * `fill` no vale para un `<input type="range">`, y asignar `.value` a secas
 * no dispara nada porque React envuelve el setter. Se usa el setter nativo y
 * después el evento `input`, que es lo que hace el navegador al arrastrar.
 */
async function moverScrubber(page: Page, valor: number) {
  const scrubber = page.getByLabel('Minuto de la carrera').filter({ visible: true });
  await scrubber.evaluate((el, v) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(el, String(v));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, valor);
  return scrubber;
}

/** Los mandos existen dos veces —móvil y escritorio—; solo uno se ve. */
const visible = (page: Page, nombre: string | RegExp) =>
  page.getByRole('button', { name: nombre }).filter({ visible: true });

async function simularCarrera(page: Page) {
  await page.route('**/api/positions/**/meta', (route) => route.fulfill({ json: meta() }));
  await page.route(
    (url) => /\/api\/positions\/[^/]+\/[^/]+\/[RS]$/.test(url.pathname),
    (route) => route.fulfill({ body: bloque(), contentType: 'application/octet-stream' })
  );
}

const REPLAY = '/results/2026/12/replay';

for (const [nombre, viewport] of [
  ['iPhone', { width: 390, height: 844 }],
  ['Android estrecho', { width: 360, height: 800 }],
] as const) {
  test.describe(`la torre en ${nombre}`, () => {
    test.use({ viewport });

    test('mapa arriba, filas de 44 px y mandos fijos sobre la barra de pestañas', async ({ page }) => {
      await simularCarrera(page);
      await page.goto(REPLAY);

      const mapa = page.locator('canvas[aria-label*="Mapa de la carrera"]').first();
      await expect(mapa).toBeVisible({ timeout: 20_000 });

      // El mapa es proporcional al ancho: nunca más ancho que la pantalla.
      const cajaMapa = (await mapa.boundingBox())!;
      expect(cajaMapa.width).toBeLessThanOrEqual(viewport.width);
      expect(cajaMapa.width).toBeGreaterThan(viewport.width - 2);

      const filas = page.getByRole('list', { name: 'Clasificación en este instante' }).getByRole('button');
      await expect(filas).toHaveCount(PILOTOS.length);
      for (const fila of await filas.all()) {
        expect((await fila.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      }

      // Los mandos, fijos: el botón grande está dentro de la pantalla sin
      // desplazar, por encima de la barra de pestañas de la app.
      const reproducir = visible(page, 'REPRODUCIR');
      const cajaPlay = (await reproducir.boundingBox())!;
      expect(cajaPlay.height).toBeGreaterThanOrEqual(44);
      expect(cajaPlay.y + cajaPlay.height).toBeLessThan(viewport.height - 60);

      // Y el documento no se sale a lo ancho.
      const ancho = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(ancho).toBeLessThanOrEqual(viewport.width);

      // El mapa se queda pegado mientras la torre se desplaza: con la última
      // fila a la vista, el mapa sigue en pantalla y bajo la cabecera de la
      // app. Falló en el navegador con datos reales antes de que existiera
      // esta prueba: el mapa se iba por arriba con la fila 18.
      await filas.last().scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      const pegado = (await mapa.boundingBox())!;
      expect(pegado.y).toBeGreaterThanOrEqual(0);
      expect(pegado.y + pegado.height).toBeLessThanOrEqual(viewport.height);
      expect((await filas.last().boundingBox())!.y).toBeGreaterThan(pegado.y + pegado.height - 1);

      // Y una fila desplazada se puede TOCAR: no queda bajo el mapa ni bajo
      // los mandos. Con la carrera real, la 18ª estaba tapada y el toque no
      // llegaba nunca.
      await filas.nth(17).click();
      await expect(filas.nth(17)).toHaveAttribute('aria-pressed', 'true');
      const tocada = (await filas.nth(17).boundingBox())!;
      expect(tocada.y).toBeGreaterThanOrEqual(pegado.y + pegado.height - 1);
      expect(tocada.y + tocada.height).toBeLessThanOrEqual(cajaPlay.y + 1);
    });

    test('sin pie de página, y los mandos a ras de la barra de pestañas', async ({ page }) => {
      await simularCarrera(page);
      await page.goto(REPLAY);
      await expect(page.locator('canvas[aria-label*="Mapa de la carrera"]').first()).toBeVisible({
        timeout: 20_000,
      });

      // Hasta el final del todo, que es donde se veía el problema.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);

      // El pie no se pinta en una pantalla que ocupa la ventana entera. Medía
      // 553 px y salía entre el mapa pegado y los mandos fijos: el logo de
      // ApexData y la navegación repetida, debajo del circuito.
      await expect(page.locator('footer')).toHaveCount(0);

      // Y los mandos quedan a ras de la barra, sin rendija por la que ver la
      // página de detrás. Iban a `4rem`, cuatro píxeles más que la barra.
      //
      // Ojo al leer esto: aquí el borde seguro del teléfono vale cero, así que
      // aquellos cuatro píxeles salían como un solapamiento inofensivo y no
      // como el hueco que se veía en el iPhone. Lo que se comprueba es que los
      // dos bordes COINCIDEN, que es lo único cierto con y sin borde seguro.
      const barra = page.getByRole('navigation', { name: 'Navegación principal' });
      const mandos = page.locator('div.fixed.inset-x-0.z-40').first();
      const cajaBarra = (await barra.boundingBox())!;
      const cajaMandos = (await mandos.boundingBox())!;
      expect(Math.abs(cajaMandos.y + cajaMandos.height - cajaBarra.y)).toBeLessThanOrEqual(1);
    });
  });
}

/**
 * El replay sigue el tema de la app.
 *
 * Durante un tiempo fue siempre carbón, con la app clara alrededor, y en el
 * teléfono eso era un rectángulo negro emparedado entre dos barras blancas
 * translúcidas. Lo que se comprueba aquí son las dos mitades del arreglo: que
 * en claro el replay es de verdad claro —una sola superficie con el resto de
 * la app— y que en oscuro no se ha movido NADA, porque los valores oscuros son
 * exactamente los que estaban escritos a fuego antes.
 */
test.describe('el replay sigue el tema', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  const medir = (page: Page) =>
    page.evaluate(() => {
      const fila = document.querySelector('ol[aria-label="Clasificación en este instante"] button')!;
      const celdas = fila.querySelectorAll('span');
      const play = [...document.querySelectorAll('button')].find((b) => /REPRODUCIR|PAUSA/.test(b.textContent || ''))!;
      return {
        body: getComputedStyle(document.body).backgroundColor,
        replay: getComputedStyle(document.querySelector('main > div > div')!).backgroundColor,
        puesto: getComputedStyle(celdas[0]).color,
        barraEquipo: getComputedStyle(celdas[1]).backgroundColor,
        hueco: getComputedStyle(celdas[celdas.length - 1]).color,
        playFondo: getComputedStyle(play).backgroundColor,
        playTinta: getComputedStyle(play).color,
      };
    });

  const abrir = async (page: Page, tema: 'light' | 'dark') => {
    await page.addInitScript((t) => localStorage.setItem('theme', t), tema);
    await simularCarrera(page);
    await page.goto(REPLAY);
    await expect(page.locator('canvas[aria-label*="Mapa de la carrera"]').first()).toBeVisible({
      timeout: 20_000,
    });
    return medir(page);
  };

  test('en claro es claro, y una sola superficie con el resto de la app', async ({ page }) => {
    const m = await abrir(page, 'light');

    // Lo que arregla el fallo: el replay y la página tienen el MISMO fondo. No
    // basta con que sea claro; si fuera otro claro seguiría siendo un parche
    // pegado encima.
    expect(m.replay).toBe(m.body);
    expect(m.replay).toBe('rgb(247, 247, 248)');

    // El botón grande va en el primario del tema claro, no en la lima, que
    // sobre blanco no se lee.
    expect(m.playFondo).toBe('rgb(82, 102, 0)');
    expect(m.playTinta).toBe('rgb(255, 255, 255)');

    // Y el color de equipo usa la variante derivada para el fondo claro: la
    // identidad de McLaren (#FF8000) queda en 2,9:1 contra este fondo.
    expect(m.barraEquipo).toBe('rgb(217, 109, 0)');
  });

  test('en oscuro no se ha movido ni un tono', async ({ page }) => {
    const m = await abrir(page, 'dark');

    // Cada uno de estos era un hex escrito a mano en el componente antes de
    // que el replay tuviera tema. Si alguno cambia, el tema oscuro ha
    // cambiado de aspecto sin que nadie lo pidiera.
    expect(m.replay).toBe('rgb(11, 11, 15)'); // #0B0B0F
    expect(m.puesto).toBe('rgb(162, 162, 172)'); // #A2A2AC
    expect(m.hueco).toBe('rgb(191, 191, 198)'); // #BFBFC6
    expect(m.playFondo).toBe('rgb(204, 255, 0)'); // #CCFF00
    expect(m.playTinta).toBe('rgb(0, 0, 0)');
    expect(m.barraEquipo).toBe('rgb(255, 128, 0)'); // McLaren, la identidad
  });
});

test.describe('el cursor del scrubber', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('se pinta por delante del riel, no por detrás', async ({ page }) => {
    await simularCarrera(page);
    await page.goto(REPLAY);
    await expect(page.locator('canvas[aria-label*="Mapa de la carrera"]').first()).toBeVisible({
      timeout: 20_000,
    });

    // El riel de banderas y las marcas de vuelta son `absolute`. Lo posicionado
    // pinta por delante de lo que no lo está, así que con el `input` estático
    // el riel cruzaba el cursor por la mitad y salía partido en dos —en los dos
    // temas; con el riel claro se nota más—. Basta con que el `input` también
    // esté posicionado: al ir después en el DOM, pasa delante.
    //
    // Se comprueba el mecanismo y no el píxel porque lo que se rompe es esto:
    // el día que alguien quite `relative`, el cursor vuelve a partirse.
    const posiciones = await page.evaluate(() => {
      const scrubber = [...document.querySelectorAll<HTMLElement>('input.replay-scrubber')].find(
        (el) => el.offsetParent !== null
      )!;
      const riel = scrubber.parentElement!.querySelector<HTMLElement>('div[aria-hidden]')!;
      return {
        scrubber: getComputedStyle(scrubber).position,
        riel: getComputedStyle(riel).position,
      };
    });

    expect(posiciones.riel).toBe('absolute');
    expect(posiciones.scrubber).not.toBe('static');
  });
});

test.describe('la torre en escritorio', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('mapa y torre lado a lado, filas de 30 px y mandos bajo el mapa', async ({ page }) => {
    await simularCarrera(page);
    await page.goto(REPLAY);

    const mapa = page.locator('canvas[aria-label*="Mapa de la carrera"]').last();
    await expect(mapa).toBeVisible({ timeout: 20_000 });

    const torre = page.getByRole('list', { name: 'Clasificación en este instante' });
    const cajaMapa = (await mapa.boundingBox())!;
    const cajaTorre = (await torre.boundingBox())!;
    expect(cajaTorre.x).toBeGreaterThanOrEqual(cajaMapa.x + cajaMapa.width - 1);

    for (const fila of await torre.getByRole('button').all()) {
      const alto = (await fila.boundingBox())!.height;
      expect(alto).toBeGreaterThanOrEqual(30);
      expect(alto).toBeLessThan(44);
    }

    const reproducir = visible(page, 'REPRODUCIR');
    const cajaPlay = (await reproducir.boundingBox())!;
    expect(cajaPlay.y).toBeGreaterThan(cajaMapa.y + cajaMapa.height - 1);
  });
});

test.describe('reproducir y elegir', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('reproducir mueve el reloj; pausa lo para; el scrubber salta', async ({ page }) => {
    await simularCarrera(page);
    await page.goto(REPLAY);
    await expect(page.locator('canvas[aria-label*="Mapa de la carrera"]').first()).toBeVisible({ timeout: 20_000 });

    const reloj = page.getByLabel('Minuto de carrera');
    await expect(reloj).toHaveText('0:00');

    await visible(page, 'REPRODUCIR').click();
    await expect(visible(page, 'PAUSA')).toBeVisible();
    await expect(reloj).not.toHaveText('0:00', { timeout: 5_000 });

    await visible(page, 'PAUSA').click();
    const parado = await reloj.textContent();
    await page.waitForTimeout(600);
    expect(await reloj.textContent()).toBe(parado);

    // El scrubber anuncia el minuto y salta.
    const scrubber = await moverScrubber(page, COUNT - 1);
    await expect(reloj).toHaveText('0:29');
    await expect(scrubber).toHaveAttribute('aria-valuetext', '0:29');
  });

  test('buscar mientras se reproduce no vuelve atrás solo', async ({ page }) => {
    // El bucle calculaba el instante desde el momento de arrancar, así que
    // arrastrar el scrubber o saltar diez segundos se deshacía en el
    // fotograma siguiente. Solo se ve reproduciendo.
    await simularCarrera(page);
    await page.goto(REPLAY);
    await expect(page.locator('canvas[aria-label*="Mapa de la carrera"]').first()).toBeVisible({ timeout: 20_000 });

    await visible(page, 'REPRODUCIR').click();
    await moverScrubber(page, 80); // 0:20
    await page.waitForTimeout(500);

    // Sigue corriendo desde donde se le dejó, no desde donde estaba.
    const reloj = page.getByLabel('Minuto de carrera');
    const texto = (await reloj.textContent()) ?? '';
    const segundos = Number(texto.split(':')[1]);
    expect(segundos).toBeGreaterThanOrEqual(20);
    expect(segundos).toBeLessThan(24);

    await visible(page, 'PAUSA').click();
  });

  test('elegir una fila la marca, y el estado de pista se lee con palabras', async ({ page }) => {
    await simularCarrera(page);
    await page.goto(REPLAY);
    await expect(page.locator('canvas[aria-label*="Mapa de la carrera"]').first()).toBeVisible({ timeout: 20_000 });

    const filas = page.getByRole('list', { name: 'Clasificación en este instante' }).getByRole('button');
    await filas.nth(2).click();
    await expect(filas.nth(2)).toHaveAttribute('aria-pressed', 'true');
    await filas.nth(2).click();
    await expect(filas.nth(2)).toHaveAttribute('aria-pressed', 'false');

    // En el segundo 15 hay bandera amarilla simulada.
    await moverScrubber(page, 60);
    await expect(page.getByRole('status').filter({ hasText: 'Bandera amarilla' })).toBeVisible();
  });
});

test.describe('los estados honestos', () => {
  test('sin servicio, la página lo dice y no se rompe', async ({ page }) => {
    await page.route('**/api/positions/**', (route) =>
      route.fulfill({ status: 503, json: { error: 'La telemetría necesita el microservicio FastF1.' } })
    );
    await page.goto(REPLAY);

    await expect(page.getByRole('status').filter({ hasText: 'no responde' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Carrera');
  });

  test('una sesión sin correr dice que aún no hay posiciones', async ({ page }) => {
    await page.route('**/api/positions/**', (route) =>
      route.fulfill({ status: 404, json: { error: 'La sesión R de 2026 ronda 12 todavía no tiene datos.' } })
    );
    await page.goto(REPLAY);

    await expect(page.getByRole('status').filter({ hasText: 'todavía no tiene datos' })).toBeVisible();
  });

  test('antes de 2018 no hay replay, y se explica', async ({ page }) => {
    await page.goto('/results/2015/1/replay');

    await expect(page.getByRole('status').filter({ hasText: 'Sin replay antes de 2018' })).toBeVisible();
  });

  test('una carrera que no existe enseña la página de no encontrado', async ({ page }) => {
    // El código de estado no sirve de prueba: con `loading.tsx` la página se
    // transmite, las cabeceras ya salieron como 200 y el 404 va dentro del
    // cuerpo con `noindex` — igual que en la ficha de la carrera.
    await page.goto('/results/2026/99/replay');
    await expect(page.getByRole('heading', { level: 1, name: 'Página no encontrada' })).toBeVisible();
  });
});

test.describe('la puerta desde la ficha', () => {
  test('la carrera con resultados enlaza a su replay', async ({ page }) => {
    await page.goto('/results/2026/12');

    const enlace = page.getByRole('link', { name: 'Ver la carrera' });
    await expect(enlace).toBeVisible({ timeout: 20_000 });
    await expect(enlace).toHaveAttribute('href', REPLAY);
    expect((await enlace.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
});
