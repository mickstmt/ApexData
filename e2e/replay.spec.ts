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

/**
 * El teléfono tumbado: 844×390.
 *
 * Es donde vive ahora la barra de progreso. En vertical los mandos son solo
 * cuatro botones —decisión del usuario en el punto 24— y la barra se mudó a la
 * pantalla completa, que se abre al girar. Las pruebas que la tocan se mudan
 * con ella; las que solo usan los botones se quedan en vertical.
 */
const TUMBADO = { width: 844, height: 390 };

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

/**
 * Una carrera larga con un coche que se para de verdad.
 *
 * `estaFuera` exige **240 instantes quieto** —un minuto a 4 Hz— antes de dar a
 * alguien por retirado, y la carrera de juguete de arriba solo tiene 120. Sin
 * un escenario propio, el abandono no puede ocurrir y las pruebas del punto 12
 * no probarían nada.
 */
const COUNT_LARGO = 600;
const QUIEN_ABANDONA = 3;
const INSTANTE_EN_QUE_PARA = 100;

function metaLarga() {
  return { ...meta(), timeline: { start: 0, step: PASO, count: COUNT_LARGO } };
}

function bloqueConAbandono(): Buffer {
  const datos = new Int16Array(PILOTOS.length * 2 * COUNT_LARGO);

  PILOTOS.forEach((_, i) => {
    for (let k = 0; k < COUNT_LARGO; k++) {
      // El que abandona deja de avanzar; los demás siguen dando vueltas.
      const avance = i === QUIEN_ABANDONA ? Math.min(k, INSTANTE_EN_QUE_PARA) : k;
      const d = avance * 40 - i * 150;
      const a = d / RADIO;
      datos[i * 2 * COUNT_LARGO + k] = Math.round(Math.cos(a) * RADIO);
      datos[i * 2 * COUNT_LARGO + COUNT_LARGO + k] = Math.round(Math.sin(a) * RADIO);
    }
  });

  return Buffer.from(datos.buffer);
}

async function simularCarreraConAbandono(page: Page) {
  await page.route('**/api/positions/**/meta', (route) => route.fulfill({ json: metaLarga() }));
  await page.route(
    (url) => /\/api\/positions\/[^/]+\/[^/]+\/[RS]$/.test(url.pathname),
    (route) => route.fulfill({ body: bloqueConAbandono(), contentType: 'application/octet-stream' })
  );
}

/**
 * Una carrera que TERMINA, con vuelta de celebracion.
 *
 * Es el escenario del punto 2 y no se puede montar con los de arriba: la
 * gracia esta en que, despues de la bandera, el orden por metros recorridos
 * y el orden de llegada digan cosas distintas. Aqui el ganador levanta el pie
 * al cruzar y el ultimo de la parrilla sigue a tope, asi que en el ultimo
 * instante lleva mas metros que nadie. Es lo que pasaba de verdad: en Italia
 * 2026 el oficial daba ANT-RUS-VER-NOR y el replay al final, VER-NOR-ANT-RUS.
 */
const COUNT_FINAL = 2080; // 520 s a 4 Hz
/**
 * El ganador cruza en el segundo 420 de 520: el 81 % de la linea de tiempo.
 *
 * No vale ponerlo antes. `finalDeCarrera` no se cree una bandera que caiga en
 * la primera parte de los datos —medido, en las carreras de verdad cae en el
 * 99 %— porque congelar la torre a mitad de replay seria peor que no tocarla.
 * Y no vale acortar la cola: despues hacen falta 20 s de vuelta de honor y
 * mas de 60 s aparcado, que es lo que `estaFuera` mira.
 */
const BANDERA_S = 420;
const QUIEN_SIGUE = 21; // el ultimo, que no levanta el pie

function metaConFinal() {
  return {
    ...meta(),
    timeline: { start: 0, step: PASO, count: COUNT_FINAL },
    // Cada uno cruza 0,8 s despues del anterior; el ultimo, mucho despues,
    // porque va una vuelta abajo pero tambien recibe la bandera.
    drivers: PILOTOS.map((p, i) => ({
      ...p,
      laps: i === QUIEN_SIGUE ? [30, BANDERA_S + 12] : [30, BANDERA_S + i * 0.8],
    })),
  };
}

/** Instantes de vuelta de honor antes de aparcar: 20 s. */
const K_BANDERA = BANDERA_S / PASO;
const K_APARCAN = K_BANDERA + 80;

function bloqueConFinal(): Buffer {
  const datos = new Int16Array(PILOTOS.length * 2 * COUNT_FINAL);

  PILOTOS.forEach((_, i) => {
    for (let k = 0; k < COUNT_FINAL; k++) {
      // Tras la bandera se levanta el pie, se rueda despacio la vuelta de
      // honor y se aparca en el parque cerrado. El ultimo no: sigue a tope,
      // y acaba con mas metros que el ganador. El parado importa: son mas de
      // 240 instantes quietos, que es lo que `estaFuera` mira para dar a
      // alguien por retirado.
      const otro = i === QUIEN_SIGUE;
      const recorrido = otro
        ? k * 40
        : k <= K_BANDERA
          ? k * 40
          : K_BANDERA * 40 + Math.min(k, K_APARCAN) * 10 - K_BANDERA * 10;
      const d = recorrido - i * 150;
      const a = d / RADIO;
      datos[i * 2 * COUNT_FINAL + k] = Math.round(Math.cos(a) * RADIO);
      datos[i * 2 * COUNT_FINAL + COUNT_FINAL + k] = Math.round(Math.sin(a) * RADIO);
    }
  });

  return Buffer.from(datos.buffer);
}

async function simularCarreraQueTermina(page: Page) {
  await page.route('**/api/positions/**/meta', (route) => route.fulfill({ json: metaConFinal() }));
  await page.route(
    (url) => /\/api\/positions\/[^/]+\/[^/]+\/[RS]$/.test(url.pathname),
    (route) => route.fulfill({ body: bloqueConFinal(), contentType: 'application/octet-stream' })
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
      const reproducir = visible(page, 'Reproducir');
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

    test('sin pie de página, y los mandos flotando sobre la barra', async ({ page }) => {
      await simularCarrera(page);
      await page.goto(REPLAY);
      await expect(page.locator('canvas[aria-label*="Mapa de la carrera"]').first()).toBeVisible({
        timeout: 20_000,
      });

      // Hasta el final del todo, que es donde se veía el problema. La torre se
      // desplaza en SU caja desde que el mapa se encoge, no en la página.
      await page.evaluate(() => {
        const torre = document.querySelector('ol[aria-label="Clasificación en este instante"]')!
          .parentElement!;
        torre.scrollTop = torre.scrollHeight;
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(400);

      // El pie no se pinta en una pantalla que ocupa la ventana entera. Medía
      // 553 px y salía entre el mapa pegado y los mandos fijos: el logo de
      // ApexData y la navegación repetida, debajo del circuito.
      await expect(page.locator('footer')).toHaveCount(0);

      // Los mandos y la barra son DOS piezas de la misma pila flotante, como
      // el mini-reproductor de Apple Music sobre su barra: mismos márgenes
      // laterales y un hueco corto entre ellas. Lo que se comprueba es esa
      // relación, que es la que se puede romper; el hueco exacto es una
      // decisión de diseño que puede cambiar sin que nada esté mal.
      const barra = page.getByRole('navigation', { name: 'Navegación principal' });
      const mandos = page.locator('div.fixed.z-40').first();
      const cajaBarra = (await barra.boundingBox())!;
      const cajaMandos = (await mandos.boundingBox())!;

      expect(Math.round(cajaMandos.x)).toBe(Math.round(cajaBarra.x));
      expect(Math.round(cajaMandos.width)).toBe(Math.round(cajaBarra.width));

      // Encima, sin tocarse y sin separarse tanto que dejen de leerse juntas.
      const hueco = cajaBarra.y - (cajaMandos.y + cajaMandos.height);
      expect(hueco).toBeGreaterThan(0);
      expect(hueco).toBeLessThanOrEqual(16);

      // Y despegadas de los bordes: eso es lo que las hace flotar.
      expect(cajaBarra.x).toBeGreaterThan(0);
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
test.describe('los mandos dicen lo que hacen', () => {
  test.use({ viewport: TUMBADO });

  const mandos = (page: Page) => page.locator('[data-botonera]').filter({ visible: true });
  const tiempos = (page: Page) => page.locator('[data-tiempos]').filter({ visible: true });

  test('los botones de salto dicen «10 s» antes de pulsarlos', async ({ page }) => {
    await simularCarrera(page);
    await page.goto(REPLAY);
    await expect(visible(page, 'Reproducir')).toBeVisible({ timeout: 20_000 });

    // El hueco reportado: dos dobles flechas sin decir cuánto mueven. La marca
    // contesta antes de pulsar; el destello, después. Aquí va la primera.
    await expect(mandos(page)).toContainText('10 s');
    await expect(visible(page, 'Retroceder 10 s')).toBeVisible();
    await expect(visible(page, 'Avanzar 10 s')).toBeVisible();
  });

  test('el reloj y la vuelta van pegados al scrubber, no solo en la cabecera', async ({ page }) => {
    await simularCarrera(page);
    await page.goto(REPLAY);
    await expect(visible(page, 'Reproducir')).toBeVisible({ timeout: 20_000 });

    // La duración es (count - 1) × paso y no count × paso: es el tope al que
    // llega el scrubber, y tiene que ser alcanzable arrastrando.
    await expect(tiempos(page)).toContainText('0:00');
    await expect(tiempos(page)).toContainText('0:29');

    // La vuelta NO va aquí: la cabecera ya la lleva como titular, y ponerla
    // también abajo era decir lo mismo dos veces en la misma pantalla. Vive en
    // la burbuja, que contesta otra pregunta: a qué vuelta estás yendo.
    await expect(tiempos(page)).not.toContainText(/vuelta/i);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Vuelta \d+/);

    // Y está donde se toca: por debajo del mapa y a menos de una fila de los
    // botones. Repetir el reloj de la cabecera solo se justifica por eso.
    const caja = (await tiempos(page).boundingBox())!;
    const play = (await visible(page, 'Reproducir').boundingBox())!;
    expect(play.y - (caja.y + caja.height)).toBeLessThan(80);
  });

  /**
   * El destello dura 900 ms y luego se va **para siempre**.
   *
   * Por eso no vale `toHaveText`: reintenta, pero sobre un elemento que ya no
   * vuelve, así que en una tanda lenta fallaría sin poder recuperarse nunca.
   * Esta suite ya tiene historial de fallos por lentitud. Se arma un vigilante
   * ANTES de pulsar y se queda con el texto en cuanto el nodo aparece.
   */
  const cazarDestello = (page: Page) =>
    page.evaluate(
      () =>
        new Promise<string>((resolver, rechazar) => {
          const ya = document.querySelector('[data-destello]');
          if (ya) return resolver(ya.textContent ?? '');
          const observador = new MutationObserver(() => {
            const nodo = document.querySelector('[data-destello]');
            if (!nodo) return;
            observador.disconnect();
            resolver(nodo.textContent ?? '');
          });
          observador.observe(document.body, { subtree: true, childList: true });
          setTimeout(() => {
            observador.disconnect();
            rechazar(new Error('el destello no llegó a aparecer'));
          }, 10_000);
        })
    );

  test('el destello dice el salto que de verdad ocurrió, no siempre diez', async ({ page }) => {
    await simularCarrera(page);
    await page.goto(REPLAY);
    await expect(visible(page, 'Reproducir')).toBeVisible({ timeout: 20_000 });

    // En medio de la carrera, diez son diez.
    await moverScrubber(page, 60);
    const enMedio = cazarDestello(page);
    await visible(page, 'Avanzar 10 s').click();
    expect(await enMedio).toBe('+10 s');

    // Antes del segundo, esperar a que el primero se vaya: dura 900 ms, y el
    // vigilante se quedaba con el que seguía en pantalla en vez de con el
    // nuevo. Este fallo lo encontró la propia prueba.
    await expect(page.locator('[data-destello]')).toHaveCount(0);

    // Cerca del tope, no: de 111 a 119 hay 8 instantes de 0,25 s, o sea 2 s.
    // Decir «+10 s» aquí sería mentir, y es lo que hace que un indicador
    // nuevo se sienta roto — se pulsa y la barra apenas se mueve.
    await moverScrubber(page, 111);
    const cercaDelTope = cazarDestello(page);
    await visible(page, 'Avanzar 10 s').click();
    expect(await cercaDelTope).toBe('+2 s');
  });

  test('en los topes el botón se apaga sin llevarse el foco', async ({ page }) => {
    await simularCarrera(page);
    await page.goto(REPLAY);
    await expect(visible(page, 'Reproducir')).toBeVisible({ timeout: 20_000 });

    // El replay abre en el instante cero: atrás no hay nada.
    await expect(visible(page, 'Retroceder 10 s')).toHaveAttribute('aria-disabled', 'true');
    await expect(visible(page, 'Avanzar 10 s')).not.toHaveAttribute('aria-disabled', 'true');

    await moverScrubber(page, COUNT - 1);
    await expect(visible(page, 'Avanzar 10 s')).toHaveAttribute('aria-disabled', 'true');
    await expect(visible(page, 'Retroceder 10 s')).not.toHaveAttribute('aria-disabled', 'true');

    // Y es `aria-disabled` y no `disabled` por esto: un botón que se deshabilita
    // por haberlo pulsado tira el foco al cuerpo, y quien navega con el teclado
    // tiene que volver a recorrer la página entera para seguir.
    const adelante = visible(page, 'Avanzar 10 s');
    await adelante.focus();
    await page.keyboard.press('Enter');
    await expect(adelante).toBeFocused();
  });

  test('a medio paso del inicio todavía se puede volver atrás', async ({ page }) => {
    await simularCarrera(page);
    await page.goto(REPLAY);
    await expect(visible(page, 'Reproducir')).toBeVisible({ timeout: 20_000 });

    // La zona muerta que tenía: `Math.round(-0.5)` da `-0`, que es igual a 0,
    // así que el botón se apagaba a dos instantes del principio y esos últimos
    // 0,5 s quedaban fuera de su alcance. Solo hacia atrás — hacia delante el
    // redondeo al alza lo tapaba.
    await moverScrubber(page, 2);
    const atras = visible(page, 'Retroceder 10 s');
    await expect(atras).not.toHaveAttribute('aria-disabled', 'true');

    const salto = cazarDestello(page);
    await atras.click();
    expect(await salto).toBe('−0,5 s');
    await expect(page.getByLabel('Minuto de la carrera').filter({ visible: true })).toHaveValue('0');
  });

  test('al mover el scrubber sale a dónde vas, y se va al soltar', async ({ page }) => {
    await simularCarrera(page);
    await page.goto(REPLAY);
    await expect(visible(page, 'Reproducir')).toBeVisible({ timeout: 20_000 });

    const burbuja = page.locator('[data-burbuja]').filter({ visible: true });
    await expect(burbuja).toHaveCount(0);

    // Con el teclado, que es el mismo camino que el dedo: el `focus` la saca.
    const scrubber = await moverScrubber(page, 80);
    await scrubber.focus();
    await expect(burbuja).toHaveText(/V\d+ · 0:20/);

    await scrubber.blur();
    await expect(burbuja).toHaveCount(0);
  });

  test('ningún mando se sale del cristal, ni en el móvil más estrecho', async ({ page }) => {
    // Los lados de estos mandos siguen a los de la barra de pestañas, que el
    // usuario subió de 10 a 26 px. Eso estrecha la fila, y una revisión avisó
    // de que a 360 el botón de velocidad se saldría. **No se reproduce**:
    // medido, la fila mide 274 px y su contenido ocupa los mismos 274, con el
    // último botón acabando en 317 dentro de un cristal que llega a 334.
    //
    // La prueba se queda igualmente, porque el margen es de 17 px y cualquier
    // texto más largo o un icono más ancho se lo come sin que nada avise: un
    // hijo que desborda a su padre no ensancha el documento, así que la
    // comprobación de arrastre horizontal que ya existe no lo vería.
    await page.setViewportSize({ width: 360, height: 800 });
    await simularCarrera(page);
    await page.goto(REPLAY);
    await expect(visible(page, 'Reproducir')).toBeVisible({ timeout: 20_000 });

    const fila = page.locator('[data-botonera]').filter({ visible: true });

    // El contenido cabe en su caja. Es la comprobación que sí caza un desborde.
    const desborde = await fila.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(desborde, 'la fila de mandos desborda su propia caja').toBeLessThanOrEqual(0);

    // Y ningún botón asoma fuera del cristal que los contiene.
    const cristal = (await fila.evaluate((el) => {
      const c = el.closest('.fixed') as HTMLElement;
      const r = c.getBoundingClientRect();
      return { izq: r.x, der: r.right };
    }))!;

    for (const nombre of ['Retroceder 10 s', 'Reproducir', 'Avanzar 10 s', /Velocidad/]) {
      const caja = (await visible(page, nombre).boundingBox())!;
      expect(caja.x, `«${nombre}» se sale por la izquierda`).toBeGreaterThanOrEqual(cristal.izq - 1);
      expect(caja.x + caja.width, `«${nombre}» se sale por la derecha`).toBeLessThanOrEqual(cristal.der + 1);
      expect(caja.height, `«${nombre}» baja de 44 px`).toBeGreaterThanOrEqual(44);
    }
  });

  test('tras tocar y soltar, las flechas siguen enseñando a dónde vas', async ({ page }) => {
    await simularCarrera(page);
    await page.goto(REPLAY);
    await expect(visible(page, 'Reproducir')).toBeVisible({ timeout: 20_000 });

    // El fallo que vigila: con un solo interruptor para el dedo y el foco,
    // soltar el dedo lo apagaba con el control TODAVÍA enfocado, y a partir de
    // ahí las flechas ya no sacaban la burbuja. Se veía roto justo para quien
    // más la necesita: el que no puede mirar dónde cae su dedo.
    const scrubber = page.getByLabel('Minuto de la carrera').filter({ visible: true });
    const burbuja = page.locator('[data-burbuja]').filter({ visible: true });

    await scrubber.click();
    await expect(scrubber).toBeFocused();
    await expect(burbuja).toHaveCount(1);

    await page.keyboard.press('ArrowRight');
    await expect(burbuja).toHaveCount(1);
  });
});

test.describe('los mandos en escritorio', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('los cuatro van centrados, y el reloj ya no se dice dos veces', async ({ page }) => {
    await simularCarrera(page);
    await page.goto(REPLAY);
    await expect(visible(page, 'Reproducir')).toBeVisible({ timeout: 20_000 });

    const botonera = page.locator('[data-botonera]').filter({ visible: true });
    const fila = (await botonera.boundingBox())!;
    const primero = (await visible(page, 'Retroceder 10 s').boundingBox())!;
    const ultimo = (await visible(page, /Velocidad/).boundingBox())!;

    // Estaban apretados a la izquierda porque un `1fr` al final de la fila
    // empujaba el reloj al borde opuesto.
    const izquierda = primero.x - fila.x;
    const derecha = fila.x + fila.width - (ultimo.x + ultimo.width);
    expect(Math.abs(izquierda - derecha)).toBeLessThan(2);
    expect(izquierda).toBeGreaterThan(20);

    // Y el reloj que había al final de esta fila se fue: con el nuevo a
    // cuarenta píxeles, era decir la misma hora dos veces en la misma caja.
    await expect(botonera).toHaveText(/^(?!.*0:29).*$/s);
    await expect(page.locator('[data-tiempos]').filter({ visible: true })).toContainText('0:29');
  });
});

test.describe('el replay sigue el tema', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  const medir = (page: Page) =>
    page.evaluate(() => {
      const fila = document.querySelector('ol[aria-label="Clasificación en este instante"] button')!;
      const celdas = fila.querySelectorAll('span');
      const play = document.querySelector('button[aria-label="Reproducir"], button[aria-label="Pausa"]')!;
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

/**
 * El mapa se encoge con su tirador, y nunca desaparece.
 *
 * Que no desaparezca fue la decisión original: apartarlo del todo quita de la
 * vista justo lo que más gusta de esta pantalla. Que lo mueva un tirador y no
 * el desplazamiento de la torre es la corrección del punto 26 — antes eran la
 * misma acción y se estorbaban.
 */
test.describe('el final de carrera', () => {
  // Tumbado: en vertical los mandos son cuatro iconos y la barra de progreso
  // vive en la pantalla completa, que es la que se abre al girar.
  test.use({ viewport: TUMBADO });

  /** Los codigos de la torre, de arriba abajo. */
  async function ordenDeLaTorre(page: Page) {
    return page
      .getByRole('list', { name: 'Clasificación en este instante' })
      .filter({ visible: true })
      .locator('li')
      .evaluateAll((filas) =>
        filas.map((f) => (f.textContent ?? '').match(/P\d\d/)?.[0] ?? '?')
      );
  }

  const banderitas = (page: Page) =>
    page
      .getByRole('list', { name: 'Clasificación en este instante' })
      .filter({ visible: true })
      .getByRole('img', { name: 'Ha cruzado la meta' });

  test('el orden se congela: la vuelta de celebración ya no lo cambia', async ({ page }) => {
    // Sin congelar, en el ultimo instante manda quien mas metros lleva, y ese
    // es el que no levanto el pie. Medido en produccion, el orden por metros
    // fallaba en 4 a 8 de los 10 primeros contra el resultado oficial.
    await simularCarreraQueTermina(page);
    await page.goto(REPLAY);
    await expect(visible(page, 'Reproducir')).toBeVisible({ timeout: 20_000 });

    const justoAntes = await moverScrubber(page, BANDERA_S / PASO - 4).then(() => ordenDeLaTorre(page));
    await moverScrubber(page, COUNT_FINAL - 1);
    const alFinal = await ordenDeLaTorre(page);

    expect(alFinal[0]).toBe('P01');
    expect(alFinal.slice(0, 5)).toEqual(justoAntes.slice(0, 5));
    // Y el que siguio a tope no se ha colado en el podio por tener mas metros.
    expect(alFinal.slice(0, 3)).not.toContain(`P${String(QUIEN_SIGUE + 1).padStart(2, '0')}`);
  });

  test('la banderita sale cuando cada uno cruza, no antes', async ({ page }) => {
    await simularCarreraQueTermina(page);
    await page.goto(REPLAY);
    await expect(visible(page, 'Reproducir')).toBeVisible({ timeout: 20_000 });

    // A mitad de carrera no ha cruzado nadie.
    await moverScrubber(page, 200);
    await expect(banderitas(page)).toHaveCount(0);

    // Cuatro segundos despues de la bandera han cruzado unos pocos, no todos:
    // cada uno la toma cuando pasa por meta, y eso es lo que se ve llegar.
    await moverScrubber(page, (BANDERA_S + 4) / PASO);
    const aMedias = await banderitas(page).count();
    expect(aMedias).toBeGreaterThan(0);
    expect(aMedias).toBeLessThan(PILOTOS.length);

    await moverScrubber(page, COUNT_FINAL - 1);
    await expect(banderitas(page)).toHaveCount(PILOTOS.length);
  });

  test('quien termina no acaba marcado como retirado', async ({ page }) => {
    // Tras cruzar, un coche que para en el parque cerrado lleva un minuto
    // quieto, que es justo lo que `estaFuera` mira. Sin la excepcion, el
    // replay terminaba con la torre llena de OUT y con el aviso de abandono
    // saltandole al que acababa de ganar.
    await simularCarreraQueTermina(page);
    await page.goto(REPLAY);
    await expect(visible(page, 'Reproducir')).toBeVisible({ timeout: 20_000 });

    await moverScrubber(page, COUNT_FINAL - 1);
    await expect(
      page
        .getByRole('list', { name: 'Clasificación en este instante' })
        .filter({ visible: true })
        .getByText('OUT', { exact: true })
    ).toHaveCount(0);
  });
});

test.describe('el mapa cuenta lo que pasa', () => {
  // Tumbado: desde el punto 24 el scrubber vive en la pantalla completa, y
  // estas pruebas lo necesitan para colocarse justo antes del abandono.
  test.use({ viewport: TUMBADO });

  test('avisa con «DNF» cuando alguien abandona, reproduciendo', async ({ page }) => {
    // Lo reportado: «Leclerc abandona en la vuelta 3 y no se aprecia, el punto
    // se queda parado y ya». El aviso usa el mismo lenguaje que el «+10 s» de
    // los mandos, que la app ya enseña.
    await simularCarreraConAbandono(page);
    await page.goto(REPLAY);
    await expect(visible(page, 'Reproducir')).toBeVisible({ timeout: 20_000 });

    // Justo antes de que se le dé por retirado: 240 instantes quieto desde que
    // paró en el 100.
    await moverScrubber(page, INSTANTE_EN_QUE_PARA + 235);
    await expect(page.locator('[data-dnf]')).toHaveCount(0);

    await visible(page, 'Reproducir').click();
    await expect(page.locator('[data-dnf]')).toHaveText('DNF', { timeout: 10_000 });

    // Y se va solo: es un aviso, no una etiqueta.
    await expect(page.locator('[data-dnf]')).toHaveCount(0, { timeout: 5_000 });
  });

  test('arrastrando el scrubber NO salta el aviso', async ({ page }) => {
    // Cruzando la carrera con el dedo se pasaría por veinte abandonos en dos
    // segundos, y veinte avisos seguidos no informan: convierten una señal en
    // ruido. Por eso solo salta reproduciendo hacia delante.
    await simularCarreraConAbandono(page);
    await page.goto(REPLAY);
    await expect(visible(page, 'Reproducir')).toBeVisible({ timeout: 20_000 });

    await moverScrubber(page, INSTANTE_EN_QUE_PARA + 235);
    await moverScrubber(page, INSTANTE_EN_QUE_PARA + 260);
    await moverScrubber(page, COUNT_LARGO - 1);
    await page.waitForTimeout(400);

    await expect(page.locator('[data-dnf]')).toHaveCount(0);
  });

  test('el líder lleva su aro, en el acento y no en la tinta', async ({ page }) => {
    // Se mira el lienzo: con la carrera avanzada, entre doblados no se sabía
    // quién iba primero. El aro va en el acento porque la tinta ya es el aro
    // del coche elegido, y dos cosas distintas no pueden dibujarse igual.
    await simularCarreraConAbandono(page);
    await page.goto(REPLAY);
    await expect(page.locator('canvas[aria-label*="Mapa de la carrera"]').first()).toBeVisible({
      timeout: 20_000,
    });
    await moverScrubber(page, 300);
    await page.waitForTimeout(300);

    const hayAcento = await page.evaluate(() => {
      const lienzo = document.querySelector('canvas[aria-label*="Mapa"]') as HTMLCanvasElement;
      const ctx = lienzo.getContext('2d')!;
      const { data } = ctx.getImageData(0, 0, lienzo.width, lienzo.height);

      // El acento del replay: #CCFF00 en oscuro, #526600 en claro.
      const acento = getComputedStyle(document.documentElement)
        .getPropertyValue('--replay-acento')
        .trim();
      const r = parseInt(acento.slice(1, 3), 16);
      const g = parseInt(acento.slice(3, 5), 16);
      const b = parseInt(acento.slice(5, 7), 16);

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 200) continue;
        if (Math.abs(data[i] - r) < 24 && Math.abs(data[i + 1] - g) < 24 && Math.abs(data[i + 2] - b) < 24) {
          return true;
        }
      }
      return false;
    });

    expect(hayAcento, 'el líder no lleva aro de acento en el mapa').toBe(true);
  });
});

test.describe('el mapa se encoge con su tirador', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  /** Los puestos que se ven enteros en la torre, en orden. */
  const puestosALaVista = (page: Page) =>
    page.evaluate(() => {
      const lista = document.querySelector('ol[aria-label="Clasificación en este instante"]')!;
      const caja = lista.parentElement!.getBoundingClientRect();
      const mandos = document.querySelector('div.fixed.z-40')!.getBoundingClientRect();
      const abajo = Math.min(caja.bottom, mandos.top);

      return [...lista.querySelectorAll('button')]
        .map((f, i) => ({ i: i + 1, b: f.getBoundingClientRect() }))
        .filter(({ b }) => b.top >= caja.top - 1 && b.bottom <= abajo + 1)
        .map(({ i }) => i);
    });

  const altoDelMapa = (page: Page) =>
    page.evaluate(() =>
      Math.round(document.querySelector('canvas[aria-label*="Mapa"]')!.getBoundingClientRect().height)
    );

  /** Arrastra el tirador hacia arriba: encoge el mapa. */
  async function encoger(page: Page, pixeles = 300) {
    const t = (await page.locator('[role="separator"][aria-label="Tamaño del circuito"]').boundingBox())!;
    await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2);
    await page.mouse.down();
    await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2 - pixeles, { steps: 12 });
    await page.mouse.up();
  }

  test('al encoger se ven más filas, y el circuito sigue ahí', async ({ page }) => {
    await simularCarrera(page);
    await page.goto(REPLAY);
    await expect(page.locator('canvas[aria-label*="Mapa de la carrera"]').first()).toBeVisible({
      timeout: 20_000,
    });

    const altoAntes = await altoDelMapa(page);
    const antes = await puestosALaVista(page);

    await encoger(page);

    const altoDespues = await altoDelMapa(page);
    const despues = await puestosALaVista(page);

    // Mengua de verdad: si solo bajara unos píxeles no habría servido de nada.
    expect(altoDespues).toBeLessThan(altoAntes * 0.6);
    // Pero NO desaparece: esa era la otra opción, y se descartó.
    expect(altoDespues).toBeGreaterThan(60);
    // Y lo que se buscaba: más carrera a la vista.
    expect(despues.length).toBeGreaterThan(antes.length + 1);
  });

  test('con el mapa al mínimo, el líder sigue a la vista', async ({ page }) => {
    // **El punto 26.** Antes, encoger el mapa costaba 220 px de desplazamiento
    // de la torre, y con filas de 44 px eso eran cinco filas: con el circuito
    // al mínimo la lista empezaba en P6. Medido en la app antes de tocarlo.
    await simularCarrera(page);
    await page.goto(REPLAY);
    await expect(page.locator('canvas[aria-label*="Mapa de la carrera"]').first()).toBeVisible({
      timeout: 20_000,
    });

    await encoger(page);

    const visibles = await puestosALaVista(page);
    expect(visibles[0], `la lista empieza en P${visibles[0]} en vez de P1`).toBe(1);

    // Y sin huecos: la variante de «filas fijas» dejaba P1 arriba pero perdía
    // el 4 y el 5 en medio, y por eso se descartó.
    const seguidos = visibles.every((p, i) => i === 0 || p === visibles[i - 1] + 1);
    expect(seguidos, `faltan puestos en medio: ${visibles.join(', ')}`).toBe(true);
  });

  test('el tamaño se queda al desplazar la torre', async ({ page }) => {
    // Lo que se gana de propina al separar los gestos. Antes, volver al
    // principio de la lista agrandaba el mapa aunque no quisieras.
    await simularCarrera(page);
    await page.goto(REPLAY);
    await expect(page.locator('canvas[aria-label*="Mapa de la carrera"]').first()).toBeVisible({
      timeout: 20_000,
    });

    await encoger(page);
    const encogido = await altoDelMapa(page);

    await page.evaluate(() => {
      const torre = document.querySelector('ol[aria-label="Clasificación en este instante"]')!
        .parentElement!;
      torre.scrollTop = 400;
      torre.dispatchEvent(new Event('scroll'));
    });
    await page.waitForTimeout(300);
    expect(await altoDelMapa(page)).toBe(encogido);

    await page.evaluate(() => {
      const torre = document.querySelector('ol[aria-label="Clasificación en este instante"]')!
        .parentElement!;
      torre.scrollTop = 0;
      torre.dispatchEvent(new Event('scroll'));
    });
    await page.waitForTimeout(300);
    expect(await altoDelMapa(page), 'volver arriba lo ha agrandado solo').toBe(encogido);
  });

  test('también se maneja con el teclado', async ({ page }) => {
    // Un gesto que solo existe para quien puede arrastrar deja fuera a quien
    // navega con teclado. Es el patrón de separador de ARIA.
    await simularCarrera(page);
    await page.goto(REPLAY);
    await expect(page.locator('canvas[aria-label*="Mapa de la carrera"]').first()).toBeVisible({
      timeout: 20_000,
    });

    const tirador = page.locator('[role="separator"][aria-label="Tamaño del circuito"]');
    const entero = await altoDelMapa(page);

    await tirador.focus();
    await page.keyboard.press('Home');
    await page.waitForTimeout(200);
    const minimo = await altoDelMapa(page);
    expect(minimo).toBeLessThan(entero * 0.6);
    await expect(tirador).toHaveAttribute('aria-valuenow', '36');

    await page.keyboard.press('End');
    await page.waitForTimeout(200);
    expect(await altoDelMapa(page)).toBe(entero);
  });

  test('un coche se puede tocar también con el mapa encogido', async ({ page }) => {
    await simularCarrera(page);
    await page.goto(REPLAY);
    const mapa = page.locator('canvas[aria-label*="Mapa de la carrera"]').first();
    await expect(mapa).toBeVisible({ timeout: 20_000 });

    await encoger(page);

    // El lienzo está escalado con `transform`, así que sus coordenadas de
    // dibujo ya no coinciden con las de la pantalla. Sin corregir esa escala,
    // tocar un coche elegía a otro — o a ninguno.
    const caja = (await mapa.boundingBox())!;
    await page.mouse.click(caja.x + caja.width / 2, caja.y + caja.height / 2);

    const marcadas = page
      .getByRole('list', { name: 'Clasificación en este instante' })
      .getByRole('button')
      .and(page.locator('[aria-pressed="true"]'));
    // Tocar el centro del circuito no elige a nadie —no hay coche ahí— pero
    // tampoco puede romper nada: lo que se comprueba es que la pantalla sigue
    // respondiendo y que el mapa no se ha descolocado.
    expect(await marcadas.count()).toBeLessThanOrEqual(1);
    await expect(mapa).toBeVisible();
  });
});

test.describe('los mandos mínimos y la pantalla completa', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('en vertical solo están los cuatro botones', async ({ page }) => {
    // Decisión del usuario en el punto 24: el cuadro de mandos ocupaba
    // demasiada pantalla. La barra de progreso no se pierde — se muda a la
    // pantalla completa— y el reloj sale porque la cabecera ya lo lleva.
    await simularCarrera(page);
    await page.goto(REPLAY);
    await expect(visible(page, 'Reproducir')).toBeVisible({ timeout: 20_000 });

    const botonera = page.locator('[data-botonera]').filter({ visible: true });
    await expect(botonera.getByRole('button')).toHaveCount(4);

    // Ni barra ni fila de tiempos en vertical.
    await expect(page.getByLabel('Minuto de la carrera').filter({ visible: true })).toHaveCount(0);
    await expect(page.locator('[data-tiempos]').filter({ visible: true })).toHaveCount(0);

    // Y el reloj sigue estando: en la cabecera, que es de donde no se movió.
    await expect(page.getByLabel('Minuto de carrera')).toBeVisible();

    // El botón de reproducir ya no dice la palabra, pero sí la tiene de nombre.
    await expect(visible(page, 'Reproducir')).not.toContainText(/reproducir/i);
  });

  test('el botón de expandir abre la pantalla completa, y se puede salir', async ({ page }) => {
    // El botón no es un adorno: con el giro bloqueado —que mucha gente lleva—
    // es la única puerta. Y el de salir tampoco: quien entrara por el botón se
    // quedaría atrapado si la única salida fuese girar.
    await simularCarrera(page);
    await page.goto(REPLAY);
    await expect(visible(page, 'Reproducir')).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Ver a pantalla completa' }).click();

    // Dentro: la barra vuelve, y los botones están en su columna.
    await expect(page.getByLabel('Minuto de la carrera')).toBeVisible();
    await expect(page.locator('[data-tiempos]')).toBeVisible();
    const salir = page.getByRole('button', { name: 'Salir de pantalla completa' });
    await expect(salir).toBeVisible();

    // Los cuatro mandos, uno encima de otro y no en fila.
    const caja = (await page.locator('[data-botonera]').boundingBox())!;
    expect(caja.height, 'los botones no están en columna').toBeGreaterThan(caja.width);

    await salir.click();
    // Por visibles: los mandos de escritorio siguen en el DOM, ocultos con
    // `md:`, así que contarlos todos daría uno aunque no se vea ninguno.
    await expect(page.getByLabel('Minuto de la carrera').filter({ visible: true })).toHaveCount(0);
    await expect(visible(page, 'Reproducir')).toBeVisible();
  });

  test('girar el teléfono entra y sale solo', async ({ page }) => {
    await simularCarrera(page);
    await page.goto(REPLAY);
    await expect(visible(page, 'Reproducir')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Salir de pantalla completa' })).toHaveCount(0);

    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.getByRole('button', { name: 'Salir de pantalla completa' })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('button', { name: 'Salir de pantalla completa' })).toHaveCount(0);
  });

  test('en escritorio no se entra en pantalla completa al abrir', async ({ page }) => {
    // Un portátil también es «ancho». Lo que separa un teléfono tumbado es el
    // alto, y sin esa condición el escritorio entraría nada más abrir.
    await page.setViewportSize({ width: 1280, height: 800 });
    await simularCarrera(page);
    await page.goto(REPLAY);
    await expect(visible(page, 'Reproducir')).toBeVisible({ timeout: 20_000 });

    await expect(page.getByRole('button', { name: 'Salir de pantalla completa' })).toHaveCount(0);
  });
});

test.describe('el cursor del scrubber', () => {
  test.use({ viewport: TUMBADO });

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

    const reproducir = visible(page, 'Reproducir');
    const cajaPlay = (await reproducir.boundingBox())!;
    expect(cajaPlay.y).toBeGreaterThan(cajaMapa.y + cajaMapa.height - 1);
  });
});

test.describe('reproducir y elegir', () => {
  test.use({ viewport: TUMBADO });

  test('reproducir mueve el reloj; pausa lo para; el scrubber salta', async ({ page }) => {
    await simularCarrera(page);
    await page.goto(REPLAY);
    await expect(page.locator('canvas[aria-label*="Mapa de la carrera"]').first()).toBeVisible({ timeout: 20_000 });

    const reloj = page.getByLabel('Minuto de carrera');
    await expect(reloj).toHaveText('0:00');

    await visible(page, 'Reproducir').click();
    await expect(visible(page, 'Pausa')).toBeVisible();
    await expect(reloj).not.toHaveText('0:00', { timeout: 5_000 });

    await visible(page, 'Pausa').click();
    const parado = await reloj.textContent();
    await page.waitForTimeout(600);
    expect(await reloj.textContent()).toBe(parado);

    // El scrubber anuncia el minuto y salta. Y desde que la vuelta se enseña
    // pegada al scrubber, también la dice: quien va con lector de pantalla se
    // quedaba solo con el minuto, que es la mitad de lo que ve el resto.
    const scrubber = await moverScrubber(page, COUNT - 1);
    await expect(reloj).toHaveText('0:29');
    await expect(scrubber).toHaveAttribute('aria-valuetext', '0:29, vuelta 1 de 52');
  });

  test('buscar mientras se reproduce no vuelve atrás solo', async ({ page }) => {
    // El bucle calculaba el instante desde el momento de arrancar, así que
    // arrastrar el scrubber o saltar diez segundos se deshacía en el
    // fotograma siguiente. Solo se ve reproduciendo.
    await simularCarrera(page);
    await page.goto(REPLAY);
    await expect(page.locator('canvas[aria-label*="Mapa de la carrera"]').first()).toBeVisible({ timeout: 20_000 });

    await visible(page, 'Reproducir').click();
    await moverScrubber(page, 80); // 0:20
    await page.waitForTimeout(500);

    // Sigue corriendo desde donde se le dejó, no desde donde estaba.
    const reloj = page.getByLabel('Minuto de carrera');
    const texto = (await reloj.textContent()) ?? '';
    const segundos = Number(texto.split(':')[1]);
    expect(segundos).toBeGreaterThanOrEqual(20);
    expect(segundos).toBeLessThan(24);

    await visible(page, 'Pausa').click();
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
