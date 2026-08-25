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

    // Se espera al contenido de destino antes de medir. Sin esto, el elemento
    // se resolvía mientras React aún estaba sustituyendo el DOM y la medida
    // caía sobre un nodo ya desprendido: `getComputedStyle` de un nodo fuera
    // del documento devuelve cadenas vacías, y eso hizo fallar el CI con un
    // valor «» que en local no se reproducía.
    await expect(page.getByRole('heading', { name: 'Circuitos', level: 1 })).toBeVisible();

    // Con movimiento reducido, framer-motion no aplica desplazamiento: el
    // contenedor animado no puede quedar con una traslación pendiente.
    await expect
      .poll(
        async () =>
          await page
            .locator('main > div')
            .first()
            .evaluate((el) => getComputedStyle(el).transform),
        { timeout: 5000 }
      )
      .toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
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

test.describe('sesiones enlazadas', () => {
  test('cada sesión de la portada lleva a su pestaña de la ficha', async ({ page }) => {
    await page.goto('/');

    const tira = page.locator('ul[class*="grid-cols-2"] a');
    if ((await tira.count()) === 0) test.skip(true, 'No hay carrera próxima en el calendario');

    // El nombre sale del primer nodo de texto y no del `textContent` entero:
    // la sesión en curso mete además un «En curso» dentro del mismo div, y con
    // la primera palabra sola no se distinguía «Práctica 1» de «Práctica 2».
    const enlaces = await tira.evaluateAll((as) =>
      as.map((a) => ({
        nombre: a.querySelector('div')?.firstChild?.textContent?.trim() ?? '',
        href: a.getAttribute('href') ?? '',
      }))
    );

    // Todas van a la ficha del fin de semana, cada una a su pestaña. Las
    // prácticas y la clasificación al sprint iban a Análisis mientras la ficha
    // solo sabía enseñar un cartel; ahora esas pestañas traen sus tiempos de la
    // cronometría, así que el desvío sobraba.
    const PESTAÑA: Record<string, string> = {
      Carrera: 'race',
      Clasificación: 'qualifying',
      Sprint: 'sprint',
      'Clasif. sprint': 'sprint-qualifying',
      'Práctica 1': 'practice1',
      'Práctica 2': 'practice2',
      'Práctica 3': 'practice3',
    };

    for (const { nombre, href } of enlaces) {
      expect(PESTAÑA[nombre], `«${nombre}» no es una sesión conocida`).toBeDefined();
      expect(href, `${nombre} debería abrir su pestaña`).toMatch(
        new RegExp(`^/results/\\d+/\\d+\\?sesion=${PESTAÑA[nombre]}$`)
      );
    }
  });

  test('el enlace directo llega elegido a Análisis', async ({ page }) => {
    // La portada ya no enlaza aquí, pero la dirección con sesión sigue siendo
    // una entrada válida —y la que usa cualquiera que guarde el enlace—, así
    // que se comprueba por sí misma en vez de a través de la portada.
    await page.goto('/analysis');

    const gp = await page.locator('select').first().inputValue();
    const [anio, ronda] = gp.split('-');

    await page.goto(`/analysis?anio=${anio}&ronda=${ronda}&sesion=SQ`);

    // Que la dirección lleve los datos no sirve de nada si los selectores no
    // los recogen: es justo lo que fallaba antes.
    const selectores = page.locator('select');
    await expect(selectores.first()).toHaveValue(gp);
    await expect(selectores.nth(1)).toHaveValue('SQ');
  });

  test('una sesión inventada en la dirección abre la carrera', async ({ page }) => {
    await page.goto('/results/2024/1?sesion=inventada');

    await expect(page.getByRole('tab', { selected: true })).toHaveText(/CARRERA/i);
  });
});

test.describe('tiempos de FastF1 en la ficha de la carrera', () => {
  /**
   * Las respuestas del servicio, simuladas.
   *
   * Como en las pruebas de telemetría: el CI no tiene `FASTF1_SERVICE_URL`, así
   * que pedirlas de verdad sería esperar a algo que no va a llegar. Lo que se
   * vigila aquí es que la pestaña **cablee** esos datos —el orden, el tramo, el
   * compuesto, los avisos—, no que el servicio responda.
   *
   * Los dos fines de semana elegidos son de 2024, que no guarda las horas de
   * sus sesiones: sin fecha pero con la carrera corrida hace dos años, la ficha
   * pide los tiempos igualmente. Así la prueba no depende de qué día se corra.
   */
  const CLASIFICACION_AL_SPRINT = {
    year: 2024,
    event: 'Chinese Grand Prix',
    session: 'Sprint Qualifying',
    session_type: 'SQ',
    segments: 3,
    provisional: true,
    classification: [
      {
        position: 1,
        driver: 'NOR',
        driverName: 'Lando Norris',
        team: 'McLaren',
        number: 4,
        segment: 3,
        time: '1:57.940',
      },
      {
        position: 2,
        driver: 'HAM',
        driverName: 'Lewis Hamilton',
        team: 'Mercedes',
        number: 44,
        segment: 3,
        time: '1:58.020',
      },
      // Caído en el primer tramo: va detrás pese a nada, y el chip lo explica.
      {
        position: 20,
        driver: 'BOT',
        driverName: 'Valtteri Bottas',
        team: 'Kick Sauber',
        number: 77,
        segment: 1,
        time: '1:59.900',
      },
    ],
  };

  /*
   * Con un piloto repetido a propósito.
   *
   * El endpoint no agrupa: devuelve las N vueltas más rápidas de la sesión, así
   * que quien está en forma ocupa varios puestos y otros pilotos no salen. Es lo
   * que el usuario vio en PL1. La pestaña se queda con una por piloto, y esta
   * respuesta lo comprueba: llegan tres vueltas de dos pilotos.
   */
  const VUELTAS_DE_PRACTICA = {
    session: { year: 2024, event: 'Bahrain Grand Prix', type: 'FP1', name: 'Practice 1' },
    fastest_laps: [
      {
        Driver: 'VER',
        DriverNumber: '1',
        LapNumber: 14,
        LapTime: '1:32.267',
        Compound: 'SOFT',
        Team: 'Red Bull Racing',
      },
      // Sin equipo: `LapData.Team` es opcional y FastF1 lo deja vacío en alguna
      // vuelta suelta. La fila tiene que salir igual, con su barra en gris.
      {
        Driver: 'ALO',
        DriverNumber: '14',
        LapNumber: 11,
        LapTime: '1:32.891',
        Compound: 'MEDIUM',
      },
      {
        Driver: 'VER',
        DriverNumber: '1',
        LapNumber: 6,
        LapTime: '1:33.400',
        Compound: 'MEDIUM',
        Team: 'Red Bull Racing',
      },
    ],
  };

  test('la clasificación al sprint enseña el orden, con el tramo de cada piloto', async ({
    page,
  }) => {
    await page.route('**/api/clasificacion/**', (route) =>
      route.fulfill({ json: CLASIFICACION_AL_SPRINT })
    );

    await page.goto('/results/2024/5?sesion=sprint-qualifying');

    // Antes, aquí había un cartel diciendo que Jolpica no publica esta sesión.
    // Era cierto y lo sigue siendo; lo que había cambiado es que FastF1 sí, y
    // el cartel había pasado de explicar una ausencia a esconder un dato.
    await expect(page.getByText('Lando Norris')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Valtteri Bottas')).toBeVisible();

    // El orden no es por tiempo: quien cae en SQ1 va detrás de quien llegó a
    // SQ3. Sin el tramo escrito, el último parece un error de ordenación.
    const puestos = page.locator('[role="tabpanel"] ol li');
    await expect(puestos.first()).toContainText('SQ3');
    await expect(puestos.last()).toContainText('SQ1');

    // Y que es provisional, porque las sanciones se aplican después.
    await expect(page.getByText(/provisional/i).first()).toBeVisible();

    // La diferencia con el de delante: 1:58.020 menos 1:57.940 son 80 ms.
    await expect(puestos.nth(1)).toContainText('+0.080');

    // Al primero no se le pone ninguna —no tiene delante a nadie—, y al de SQ1
    // tampoco: su tiempo y el del anterior salen de tramos distintos, así que
    // restarlos daría un número que no significa nada.
    await expect(puestos.first()).not.toContainText('+');
    await expect(puestos.last()).not.toContainText('+');
  });

  test('una práctica enseña la vuelta rápida de cada piloto, y avisa de que no es un resultado', async ({
    page,
  }) => {
    await page.route('**/api/laps/**/fastest**', (route) =>
      route.fulfill({ json: VUELTAS_DE_PRACTICA })
    );

    await page.goto('/results/2024/1?sesion=practice1');

    // `exact`, porque «VER» sin más también cae dentro de «Volver a Resultados»
    // y la búsqueda por texto no distingue mayúsculas.
    await expect(page.getByText('VER', { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('1:32.267')).toBeVisible();
    await expect(page.getByText('SOFT', { exact: true })).toBeVisible();

    // El piloto sin equipo sale igual: si esto se rompe, la pestaña se queda a
    // medias por una vuelta a la que FastF1 no le puso equipo.
    await expect(page.getByText('ALO', { exact: true })).toBeVisible();

    // La advertencia no es un formalismo: cada equipo rueda su programa con la
    // gasolina que le conviene, y sin decirlo este orden se lee como una
    // clasificación.
    await expect(page.getByText(/no es un resultado/i)).toBeVisible();

    // Cada piloto, una sola vez. Llegaron tres vueltas de dos pilotos; se
    // pintan dos filas, y la de VER es su mejor tiempo, no el otro.
    const filas = page.locator('[role="tabpanel"] ol li');
    await expect(filas).toHaveCount(2);
    await expect(filas.first()).toContainText('1:32.267');
    await expect(page.getByText('1:33.400')).toHaveCount(0);
  });

  test('si la cronometría falla, lo dice y ofrece análisis', async ({ page }) => {
    // Un 500 a propósito, que es el fallo que la pestaña no puede interpretar:
    // el servicio sí distingue una sesión sin correr con un 404, pero aquí solo
    // se llega cuando la sesión ya rodó, así que cualquier error se trata igual.
    // Si algún día se separan los mensajes, esta prueba sigue valiendo.
    await page.route('**/api/laps/**/fastest**', (route) =>
      route.fulfill({ status: 500, json: { error: 'Session not available' } })
    );

    await page.goto('/results/2024/1?sesion=practice1');

    await expect(page.getByText(/No se han podido traer/i)).toBeVisible({ timeout: 30_000 });
    // Dentro del panel: la barra de navegación tiene su propio enlace a
    // Análisis y sin acotar habría dos coincidencias.
    await expect(
      page.locator('[role="tabpanel"]').getByRole('link', { name: 'análisis' })
    ).toBeVisible();
  });
});

test.describe('retroceder', () => {
  test('hacia delante se funde; hacia atrás no, que el navegador ya anima eso', async ({ page }) => {
    // El síntoma que reportó el usuario: con el gesto de deslizar desde el
    // borde, la pantalla anterior «se refresca o parpadea», y con los botones
    // de la app no. La causa que quedaba: iOS arrastra la pantalla anterior con
    // su animación nativa y, encima, `PageTransition` hacía su fundido — el
    // contenido ya puesto se iba a opacidad cero y volvía.
    //
    // El gesto no se puede emular, pero dispara `popstate` igual que el
    // retroceso del navegador, que es lo que aquí se mide.
    //
    // Y hay que llegar **por un enlace**, no con un segundo `goto`: dos `goto`
    // son dos cargas de documento, así que volver atrás recarga la página
    // entera y no hay `popstate` que valga. Dentro de la app instalada la
    // navegación es siempre de este tipo, que es el caso que se quiere medir.
    // Este matiz costó un falso negativo al construir la prueba.
    await page.goto('/');

    // Se vigila la opacidad **durante** cada navegación, no en un instante
    // suelto: un fundido de 300 ms se escapa de un muestreo único.
    //
    // Se miden las dos direcciones con la misma sonda a propósito, y no se
    // compara contra un número elegido a dedo: la navegación hacia delante es
    // la referencia de «esto sí se funde», así que la prueba se calibra sola y
    // sigue valiendo si mañana cambia la duración.
    await page.evaluate(() => {
      const w = window as unknown as { __minima: number };
      w.__minima = 1;
      const mirar = () => {
        const capa = document.querySelector('[data-pagina]');
        if (capa) {
          const o = parseFloat(getComputedStyle(capa).opacity);
          if (!Number.isNaN(o)) w.__minima = Math.min(w.__minima, o);
        }
        requestAnimationFrame(mirar);
      };
      requestAnimationFrame(mirar);
    });

    const reiniciar = () =>
      page.evaluate(() => {
        (window as unknown as { __minima: number }).__minima = 1;
      });
    const leer = () => page.evaluate(() => (window as unknown as { __minima: number }).__minima);

    // Hacia delante: el fundido de siempre, que es el que se diseñó y con el
    // que el usuario dice que todo va bien.
    await reiniciar();
    await page.getByRole('link', { name: 'Calendario', exact: true }).first().click();
    await page.waitForURL('**/calendar');
    await expect(page.locator('[data-pagina]')).toHaveAttribute('data-pagina', 'con-transicion');
    await page.waitForTimeout(700);
    const haciaDelante = await leer();

    // Hacia atrás: nada. Y aquí sí es un `popstate` de verdad, dentro del mismo
    // documento, que es lo que hace el gesto de iOS.
    await reiniciar();
    await page.goBack();
    await page.waitForURL((url) => url.pathname === '/');
    await expect(page.locator('[data-pagina]')).toHaveAttribute('data-pagina', 'sin-transicion');
    await page.waitForTimeout(700);
    const haciaAtras = await leer();

    expect(haciaDelante, 'la transición de siempre debería seguir viéndose').toBeLessThan(0.5);
    expect(haciaAtras, 'al retroceder la página no debería atenuarse').toBeGreaterThan(0.9);
  });
});

test.describe('la tira de sesiones del fin de semana', () => {
  test('la carrera ocupa el hueco que quedaba vacío al final', async ({ page }) => {
    // En móvil, que es donde se vio: la rejilla va a dos columnas y el hueco
    // suelto quedaba justo al lado de CARRERA. En escritorio son seis columnas
    // y esos dos huecos son un tercio del ancho, no todo — medirlo allí daba un
    // falso fallo.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const celdas = page.locator('ul[class*="grid-cols-2"] > li');
    const cuantas = await celdas.count();
    if (cuantas === 0) test.skip(true, 'No hay carrera próxima en el calendario');

    // Cinco sesiones en una rejilla de dos columnas dejaban un recuadro vacío
    // justo al lado de CARRERA. Ahora la última ocupa los dos huecos.
    test.skip(cuantas !== 5, 'Este fin de semana no trae las cinco sesiones de siempre');

    const ultima = celdas.nth(cuantas - 1);
    await expect(ultima).toContainText(/Carrera/i);
    await expect(ultima).toHaveClass(/col-span-2/);

    // Y se comprueba de verdad que no queda hueco: con dos columnas, la última
    // ocupa todo el ancho de la lista en vez de la mitad.
    const lista = await page.locator('ul[class*="grid-cols-2"]').boundingBox();
    const caja = await ultima.boundingBox();
    expect(caja!.width).toBeGreaterThan(lista!.width * 0.9);

    // La fila de la carrera empieza donde empieza la lista: si hubiera quedado
    // un hueco a su izquierda, esto lo cazaría.
    expect(Math.abs(caja!.x - lista!.x)).toBeLessThan(2);
  });
});

test.describe('calendario', () => {
  test('abre por el gran premio que viene, no por el de marzo', async ({ page }) => {
    await page.goto('/calendar');

    const tarjetas = page.locator('[data-fecha]');
    await expect(tarjetas.first()).toBeVisible();

    // La marcada es la primera cuyo día no ha terminado todavía. Se calcula
    // aquí igual que en la app, a partir de las fechas que la propia página
    // trae, para no depender de en qué punto de la temporada se corra esto.
    const fechas = await tarjetas.evaluateAll((nodos) =>
      nodos.map((n) => (n as HTMLElement).dataset.fecha ?? '')
    );
    const UN_DIA = 24 * 60 * 60 * 1000;
    const esperada = fechas.findIndex((f) => Date.now() < Date.parse(f) + UN_DIA);
    test.skip(esperada === -1, 'La temporada que se enseña ya terminó entera');

    const objetivo = tarjetas.nth(esperada);

    // Por `classList`, que compara clases enteras, y no con un regex sobre el
    // atributo: toda tarjeta futura lleva ya `hover:border-primary`, así que
    // /border-primary/ casaba con ella y la prueba pasaba aunque no se marcara
    // nada. Se comprobó borrando el marcado: seguía en verde.
    const marcada = await objetivo.evaluate((n) => ({
      borde: n.classList.contains('border-primary'),
      fondo: n.classList.contains('bg-primary/5'),
    }));
    expect(marcada).toEqual({ borde: true, fondo: true });

    // Y está a la vista sin arrastrar, que es lo que se pedía.
    await expect(objetivo).toBeInViewport();
  });

  test('al cambiar de temporada vuelve a señalar la que toca', async ({ page }) => {
    // Se cambia **con el selector**, no con `goto`. Ese es el punto entero: el
    // selector navega a `?season=…`, la misma ruta, y la página se reconcilia
    // sin volver a montarse. Con `goto` el documento se recarga, el componente
    // monta de nuevo y el fallo no aparece — la primera versión de esta prueba
    // hacía eso y pasaba en verde contra el código roto.
    await page.goto('/calendar');

    // La marca de «la que toca» la pinta el navegador después de hidratar,
    // porque depende de qué hora es AHORA y eso el servidor no lo sabe. Así que
    // primero se espera a que la rejilla esté, y a la marca se le da margen: con
    // la máquina cargada, hidratar pasa de los cinco segundos por defecto y
    // esta prueba fallaba por eso y no por lo que vigila.
    await expect(page.locator('[data-fecha]').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[data-fecha].border-primary')).toHaveCount(1, {
      timeout: 30_000,
    });

    const selector = page.getByLabel('Temporada', { exact: true });
    await selector.selectOption('2024');
    await page.waitForURL('**/calendar?season=2024');
    await expect(page.locator('[data-fecha]').first()).toBeVisible();

    // Y de vuelta a la temporada con carreras por delante: tiene que volver a
    // señalarla, y solo a una.
    await selector.selectOption(String(new Date().getFullYear()));
    await expect(page.locator('[data-fecha].border-primary')).toHaveCount(1, {
      timeout: 30_000,
    });
  });

  test('una temporada terminada abre por el principio, sin saltos', async ({ page }) => {
    // Sin ninguna por venir no hay a dónde ir, y moverse sería peor que no
    // hacer nada: la página tiene que abrir por su título.
    await page.goto('/calendar?season=2024');
    await expect(page.locator('[data-fecha]').first()).toBeVisible();
    await page.waitForTimeout(600);

    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(10);
  });
});

test.describe('pestañas de una carrera', () => {
  test('la carrera va primero y no hay que arrastrar para encontrarla', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/results/2024/1');

    // El defecto: iban en orden cronológico, así que la carrera —lo que se
    // viene a ver— quedaba la última, detrás de tres prácticas sin datos, y en
    // un teléfono había que arrastrar la fila para llegar a ella.
    const pestanas = page.getByRole('tab');
    // Se espera a que haya pestañas antes de leerlas. Sin esto la lista podía
    // venir vacía y el fallo era `undefined no es una cadena`, que no dice nada
    // del defecto que esta prueba vigila.
    await expect(pestanas.first()).toBeVisible({ timeout: 30_000 });
    expect((await pestanas.allInnerTexts())[0]).toMatch(/CARRERA/i);
    await expect(page.getByRole('tab', { selected: true })).toHaveText(/CARRERA/i);

    const fila = page.getByRole('tablist');
    const medidas = await fila.evaluate((e) => ({ caja: e.clientWidth, contenido: e.scrollWidth }));
    expect(medidas.contenido).toBeLessThanOrEqual(medidas.caja + 1);
  });

  test('un fin de semana al sprint enseña su resultado, que ya estaba guardado', async ({
    page,
  }) => {
    await page.goto('/results/2026/2');

    // `isSprintWeekend` estaba fijado a false a mano, así que esta pestaña no
    // aparecía nunca — y detrás había 528 resultados guardados sin usar.
    const pestana = page.getByRole('tab', { name: /^Sprint$/i });
    await expect(pestana).toBeVisible();
    await pestana.click();

    await expect(page.getByText('GANADOR DEL SPRINT')).toBeVisible();
    expect(await page.locator('table tbody tr').count()).toBeGreaterThan(15);
  });
});

test.describe('delta entre dos vueltas', () => {
  /**
   * Dos vueltas hechas a mano para que la respuesta sea comprobable.
   *
   * NOR tarda 60 s y VER 61: el delta final tiene que ser exactamente −1,000 s.
   * Y NOR pierde medio segundo en el primer tercio antes de recuperarlo, así
   * que la curva cruza el cero y el gráfico tiene que pintar las dos áreas.
   */
  const COMPARACION = {
    driver1: {
      code: 'NOR',
      lap_number: 10,
      lap_time: '1:00.000',
      compound: 'SOFT',
      telemetry: [
        { Distance: 0, Time: '0.000', Speed: 300 },
        { Distance: 1000, Time: '20.500', Speed: 280 },
        { Distance: 2000, Time: '39.000', Speed: 290 },
        { Distance: 3000, Time: '1:00.000', Speed: 300 },
      ],
    },
    driver2: {
      code: 'VER',
      lap_number: 11,
      lap_time: '1:01.000',
      compound: 'SOFT',
      telemetry: [
        { Distance: 0, Time: '0.000', Speed: 300 },
        { Distance: 1000, Time: '20.000', Speed: 285 },
        { Distance: 2000, Time: '40.000', Speed: 288 },
        { Distance: 3000, Time: '1:01.000', Speed: 300 },
      ],
    },
    delta_time: '-1.000',
  };

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/telemetry-compare/**', (route) => route.fulfill({ json: COMPARACION }));
  });

  test('el delta final coincide con la diferencia entre los dos cronos', async ({ page }) => {
    await page.goto('/analysis');
    await page.getByRole('button', { name: /Comparar/ }).click();

    // La comprobación que de verdad importa: un gráfico que no cuadra con el
    // crono no se cree. NOR 1:00.000 contra VER 1:01.000 son −1,000 s.
    const resumen = page.locator('figure', { hasText: 'Al final de la vuelta' }).last();
    await expect(resumen).toContainText('−1.000 s', { timeout: 30_000 });
  });

  test('el dedo señala el mismo metro aquí y en las trazas de arriba', async ({ page }) => {
    await page.goto('/analysis');
    await page.getByRole('button', { name: /Comparar/ }).click();

    const delta = page.locator('canvas[aria-label*="Delta acumulado"]');
    await delta.scrollIntoViewIfNeeded();
    await expect(delta).toBeVisible({ timeout: 30_000 });

    // Fuera de la ventana, `boundingBox` da coordenadas a las que el ratón no
    // puede ir y el señalado no se dispara: de ahí el desplazamiento de arriba.
    const caja = (await delta.boundingBox())!;
    await page.mouse.move(caja.x + caja.width * 0.6, caja.y + caja.height / 2);

    // El delta cuenta el metro señalado...
    const pie = page.locator('figure', { hasText: 'En el metro' }).last();
    await expect(pie).toContainText(/En el metro [\d.]+/);

    // ...y las trazas de velocidad tienen que estar señalando ese mismo punto,
    // que es lo que convierte dos gráficos en una sola lectura.
    const metros = (await pie.innerText()).match(/En el metro ([\d.]+)/)![1].replace('.', '');
    const enLasTrazas = await page.getByText(/^\d+ m$/).first().innerText();

    expect(Math.abs(Number(enLasTrazas.replace(' m', '')) - Number(metros))).toBeLessThan(60);
  });

  test('la curva tiene alternativa en texto', async ({ page }) => {
    await page.goto('/analysis');
    await page.getByRole('button', { name: /Comparar/ }).click();

    // Un lienzo no tiene nada que leer: sin la tabla, el gráfico no existe para
    // quien usa un lector de pantalla.
    const tabla = page.getByRole('table', { name: /Delta acumulado de NOR respecto a VER/i });
    await expect(tabla).toBeAttached({ timeout: 30_000 });
    expect(await tabla.locator('tbody tr').count()).toBeGreaterThan(3);
  });
});

test.describe('mapa de minisectores', () => {
  /**
   * Un circuito cuadrado, con puntos suficientes para poder señalarlo.
   *
   * Cuarenta puntos y no cinco: el mapa busca el punto del trazado más cercano
   * al dedo y solo responde dentro de cuarenta píxeles —a propósito, para que
   * mover el ratón por una esquina vacía no haga saltar el señalado—. Con cinco
   * puntos solo las esquinas serían señalables, que es un artefacto del dato de
   * prueba y no del componente: con telemetría de verdad hay quinientos.
   *
   * NOR vuela en la primera mitad de la vuelta y se hunde en la segunda; VER al
   * revés. Los dos hacen el mismo tiempo, así que el reparto sale mitad y mitad.
   */
  function vuelta(rapidoPrimero: boolean) {
    const lado = 10;
    const puntos = [];

    for (let i = 0; i <= lado * 4; i++) {
      const parte = i / (lado * 4);
      const paso = i % lado;
      const cara = Math.min(3, Math.floor(i / lado));

      // Recorrido del cuadrado, cara a cara.
      const esquinas = [
        [paso * 100, 0],
        [1000, paso * 100],
        [1000 - paso * 100, 1000],
        [0, 1000 - paso * 100],
      ][cara];

      // El tiempo avanza más despacio en la mitad donde uno es fuerte.
      const primera = parte < 0.5;
      const rapido = rapidoPrimero ? primera : !primera;
      const segundos = primera
        ? parte * (rapido ? 30 : 42)
        : 20 * (rapidoPrimero ? 1.5 : 2.1) + (parte - 0.5) * (rapido ? 30 : 42);

      puntos.push({
        X: esquinas[0],
        Y: esquinas[1],
        Distance: parte * 4000,
        Time: segundos.toFixed(3),
        Speed: 300,
      });
    }

    return puntos;
  }

  const COMPARACION = {
    driver1: {
      code: 'NOR',
      lap_number: 10,
      lap_time: '40.000',
      compound: 'SOFT',
      telemetry: vuelta(true),
    },
    driver2: {
      code: 'VER',
      lap_number: 11,
      lap_time: '40.000',
      compound: 'SOFT',
      telemetry: vuelta(false),
    },
    delta_time: '0.000',
    rotation: 0,
  };

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/telemetry-compare/**', (route) => route.fulfill({ json: COMPARACION }));
  });

  test('reparte el circuito y dice cuántos tramos gana cada uno', async ({ page }) => {
    await page.goto('/analysis');
    await page.getByRole('button', { name: /Comparar/ }).click();

    const mapa = page.locator('canvas[aria-label*="Circuito repartido"]');
    await expect(mapa).toBeVisible({ timeout: 30_000 });

    // La etiqueta del lienzo lleva el reparto, porque un lienzo no tiene nada
    // que leer: es lo único que oye quien usa un lector de pantalla antes de
    // llegar a la tabla.
    const etiqueta = (await mapa.getAttribute('aria-label')) ?? '';
    expect(etiqueta).toMatch(/NOR es más rápido en \d+/);
    expect(etiqueta).toMatch(/VER en \d+/);
  });

  test('el dedo sobre el asfalto señala el mismo punto en el delta', async ({ page }) => {
    await page.goto('/analysis');
    await page.getByRole('button', { name: /Comparar/ }).click();

    const mapa = page.locator('canvas[aria-label*="Circuito repartido"]');
    await mapa.scrollIntoViewIfNeeded();
    await expect(mapa).toBeVisible({ timeout: 30_000 });

    // Se barre hasta dar con el asfalto en vez de adivinar dónde cae.
    //
    // El mapa solo responde si el dedo está a menos de cuarenta píxeles de la
    // pista, a propósito: sin ese margen, mover el ratón por una esquina vacía
    // haría saltar el señalado al azar. Y dónde cae el trazado dentro del
    // lienzo depende de la forma del circuito, así que fijar un punto a mano
    // hace que la prueba dependa de la geometría y no del comportamiento.
    const caja = (await mapa.boundingBox())!;
    const tramo = page.locator('figcaption', { hasText: /Tramo \d+ de/ });

    for (let fila = 1; fila <= 8 && !(await tramo.count()); fila++) {
      for (let columna = 1; columna <= 8 && !(await tramo.count()); columna++) {
        await page.mouse.move(
          caja.x + (caja.width * columna) / 9,
          caja.y + (caja.height * fila) / 9
        );
      }
    }

    // El mapa cuenta el tramo...
    await expect(page.locator('figcaption', { hasText: /Tramo \d+ de/ })).toBeVisible();

    // ...y el delta, que está arriba, tiene que haberse movido a ese metro. Es
    // lo que convierte tres gráficos en una sola lectura.
    await expect(page.locator('figcaption', { hasText: /En el metro/ })).toBeVisible();
  });

  test('el reparto tiene alternativa en texto', async ({ page }) => {
    await page.goto('/analysis');
    await page.getByRole('button', { name: /Comparar/ }).click();

    const tabla = page.getByRole('table', { name: /Reparto del circuito entre NOR y VER/i });
    await expect(tabla).toBeAttached({ timeout: 30_000 });
    // Una fila por tramo: aquí sí se vuelcan todos, porque son veinticinco.
    expect(await tabla.locator('tbody tr').count()).toBeGreaterThan(20);
  });
});

test.describe('política de contenido', () => {
  test('un script metido por el marcado no llega a ejecutarse', async ({ page }) => {
    await page.goto('/');

    // El vector real de un XSS: un dato que acaba dentro del marcado y trae un
    // manejador en línea. Sin `unsafe-inline` en `script-src`, el navegador se
    // niega a ejecutarlo.
    //
    // Ojo con probarlo de otra forma: `page.evaluate` inyecta por el depurador,
    // que NO pasa por la política, así que crear un `<script>` a mano ahí sí
    // «funciona» y no demuestra nada. Por eso se prueba a través del marcado.
    const ejecuto = await page.evaluate(async () => {
      (window as unknown as { __colado?: boolean }).__colado = false;

      const caja = document.createElement('div');
      caja.innerHTML = '<img src="x" onerror="window.__colado = true">';
      document.body.appendChild(caja);

      await new Promise((listo) => setTimeout(listo, 400));
      return (window as unknown as { __colado?: boolean }).__colado;
    });

    expect(ejecuto, 'un manejador en línea no debería ejecutarse').toBe(false);
  });

  test('no se puede desviar la página a otro servidor', async ({ page }) => {
    await page.goto('/');

    // Dos mitades del mismo daño: un `<base>` desvía TODAS las rutas relativas
    // —incluidas las de los scripts— y `connect-src` es lo que impide que algo
    // se lleve datos fuera.
    const base = await page.evaluate(() => {
      const etiqueta = document.createElement('base');
      etiqueta.href = 'https://atacante.example/';
      document.head.appendChild(etiqueta);
      return document.baseURI;
    });

    expect(base).not.toContain('atacante');

    const salio = await page.evaluate(async () => {
      try {
        await fetch('https://example.com/robado', { mode: 'no-cors' });
        return true;
      } catch {
        return false;
      }
    });

    expect(salio, 'no debería poder conectar con un host ajeno').toBe(false);
  });

  test('el nonce cambia en cada visita', async ({ page }) => {
    // Un nonce repetido es un nonce adivinable, y entonces la política es
    // decoración.
    const de = async () => {
      const respuesta = await page.goto('/');
      return respuesta?.headers()['content-security-policy']?.match(/nonce-[^']+/)?.[0];
    };

    const primero = await de();
    const segundo = await de();

    expect(primero).toBeTruthy();
    expect(segundo).not.toBe(primero);
  });
});

test.describe('márgenes en móvil', () => {
  test('la portada no se sale de la pantalla a lo ancho', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    // El defecto que esto fija: las dos tarjetas de la rejilla exigían 372 y
    // 380 px dentro de una columna de 358 —los hijos de una rejilla no encogen
    // por debajo de su contenido salvo que se les diga— y empujaban el
    // documento a 396. Se veía como un «Ver todo» pegado al borde derecho.
    // Se espera a que la portada esté entera antes de medirla: medir un
    // documento a medio pintar es medir otro documento. Con una sola conexión
    // a la base —lo que hay en CI— las tarjetas tardan, y esta prueba fallaba
    // por eso y no por el margen que vigila.
    const enlace = page.getByRole('link', { name: 'Ver todo' }).first();
    await expect(enlace).toBeVisible();

    const ancho = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(ancho).toBeLessThanOrEqual(390);

    // Y el enlace vuelve a respetar el margen del contenedor.
    const caja = (await enlace.boundingBox())!;
    expect(390 - caja.x - caja.width).toBeGreaterThanOrEqual(12);
  });

  /**
   * Las catorce pantallas, medidas a lo ancho de un teléfono.
   *
   * La de la portada existía porque el defecto se vio ahí, pero el defecto no
   * era de la portada: era de una rejilla cuyos hijos no encogían por debajo de
   * su contenido, y ese patrón está en media app. Una prueba por pantalla es lo
   * que convierte «lo arreglamos donde se vio» en «no puede volver a pasar».
   *
   * Se mide con margen de un píxel: un `scrollWidth` de 391 en una pantalla de
   * 390 es redondeo del navegador, no un desbordamiento que nadie vea.
   */
  const PANTALLAS: [string, string][] = [
    ['portada', '/'],
    ['resultados', '/results'],
    ['ficha de carrera', '/results/2024/1'],
    ['clasificación', '/standings'],
    ['pilotos', '/drivers'],
    ['ficha de piloto', '/drivers/max_verstappen'],
    ['equipos', '/constructors'],
    ['ficha de equipo', '/constructors/ferrari'],
    ['circuitos', '/circuits'],
    ['ficha de circuito', '/circuits/monza'],
    ['calendario', '/calendar'],
    ['telemetría', '/analysis'],
    ['favoritos', '/favorites'],
    ['sin conexión', '/offline'],
  ];

  for (const [nombre, ruta] of PANTALLAS) {
    test(`${nombre} no se sale de la pantalla a lo ancho`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(ruta);

      await expect(page.locator('main, [role="main"], #contenido').first()).toBeVisible({
        timeout: 30_000,
      });

      /**
       * Se mide hasta que el ancho ASIENTA, no una sola vez.
       *
       * Un documento a medio pintar es otro documento: `/drivers` dio 400 px
       * una vez y 390 las tres siguientes —una imagen aún sin dimensionar ocupa
       * lo que quiera durante un instante—. Lo que esta prueba vigila es el
       * ancho final, no el de un fotograma intermedio.
       *
       * Y se sondea en vez de esperar a `networkidle`: esa espera **no se
       * cumple nunca** en esta página dentro del CI —lo intentó y agotó los
       * cuarenta y cinco segundos—, porque con las fotos de los pilotos la red
       * no llega a quedarse quieta. Sondear mide justo lo que importa y termina
       * en cuanto el número se estabiliza.
       */
      await expect
        .poll(
          async () => {
            const { documento, ventana } = await page.evaluate(() => ({
              documento: document.documentElement.scrollWidth,
              ventana: document.documentElement.clientWidth,
            }));

            return documento - ventana;
          },
          {
            timeout: 20_000,
            message: `${nombre} (${ruta}) sigue empujando el documento a lo ancho`,
          }
        )
        .toBeLessThanOrEqual(1);
    });
  }

  test('el icono de la pestaña activa cabe dentro de su fondo', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const barra = page.locator('nav[aria-label="Navegación principal"]');
    const pildora = (await barra.locator('li[aria-hidden]').boundingBox())!;
    const icono = (await barra.locator('a[aria-current="page"] svg').first().boundingBox())!;

    // Antes el borde de la píldora caía justo en el icono y parecía que se
    // salía. Tiene que quedar aire por arriba y por abajo.
    expect(icono.y - pildora.y).toBeGreaterThanOrEqual(3);
    expect(pildora.y + pildora.height - icono.y - icono.height).toBeGreaterThan(0);
  });
});

test.describe('temporada por defecto', () => {
  test('todas las páginas abren en la misma, y es la última con datos', async ({ page }) => {
    // El defecto que esto fija: pilotos, equipos y resultados tenían el año
    // 2024 escrito a mano —de cuando era el año en curso— mientras la
    // clasificación usaba el del reloj. Tres páginas ancladas al pasado y dos
    // criterios distintos conviviendo sin que nada lo dijera.
    const elegida = async (ruta: string) => {
      await page.goto(ruta);
      return page
        .locator('select')
        .first()
        .evaluate((el: HTMLSelectElement) => el.options[el.selectedIndex]?.textContent?.trim());
    };

    const referencia = await elegida('/standings');
    expect(referencia).toMatch(/^Temporada \d{4}$/);

    for (const ruta of ['/drivers', '/constructors', '/results']) {
      expect(await elegida(ruta), `${ruta} debería abrir en la misma temporada`).toBe(referencia);
    }
  });

  test('una temporada pedida a mano manda sobre la de por defecto', async ({ page }) => {
    await page.goto('/drivers?season=2021');

    const elegida = await page
      .locator('select')
      .first()
      .evaluate((el: HTMLSelectElement) => el.options[el.selectedIndex]?.textContent?.trim());

    expect(elegida).toBe('Temporada 2021');
  });
});

test.describe('dispersión de tiempos por vuelta', () => {
  /**
   * Dos pilotos, diez vueltas y una parada que se sale de la escala.
   *
   * Están hechos para que los dos criterios NO coincidan: VER marca la vuelta
   * más rápida de todas (1:30.000) pero rueda en 1:34; NOR no baja de 1:32.100
   * y jamás hace la vuelta rápida. Por mejor vuelta manda VER, por mediana
   * manda NOR — que es justo lo que el gráfico de ritmo tiene que enseñar.
   */
  const CARRERA = {
    session: { year: 2024, event: 'Bahrain', type: 'R', name: 'Bahrain Grand Prix', date: '2024-03-02' },
    total_laps: 10,
    laps: [
      ...Array.from({ length: 10 }, (_, i) => ({
        Driver: 'VER',
        DriverNumber: '1',
        Team: 'Red Bull Racing',
        Stint: 1,
        Compound: 'SOFT',
        TyreLife: i + 1,
        LapNumber: i + 1,
        // Vuelta 1: la más rápida de la sesión. Vuelta 5: parada en boxes, que
        // se sale del 110 % y tiene que quedar fuera de la escala.
        LapTime: i === 0 ? '1:30.000' : i === 4 ? '1:52.000' : `1:34.${(i % 3) + 1}00`,
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        Driver: 'NOR',
        DriverNumber: '4',
        Team: 'McLaren',
        Stint: 1,
        Compound: 'HARD',
        TyreLife: i + 1,
        LapNumber: i + 1,
        LapTime: `1:32.${(i % 3) + 1}00`,
      })),
    ],
  };

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/laps/**', (route) =>
      route.fulfill({ json: CARRERA })
    );
  });

  test('cada vuelta es un punto, y el resumen dice ritmo y constancia', async ({ page }) => {
    await page.goto('/analysis');

    // Los pilotos del resumen se eligen a mano, no se heredan: la tabla
    // enseña los dos pilotos de los selectores, y los selectores abren con
    // los dos primeros de la última carrera con datos — que cambian cada
    // domingo. Esta prueba estuvo verde hasta que el GP de Países Bajos
    // sembró un podio distinto y el segundo por defecto dejó de estar en el
    // fixture: dependía de producción sin saberlo.
    await page.getByLabel('Piloto 1').selectOption('VER');
    await page.getByLabel('Piloto 2').selectOption('NOR');

    await page.getByRole('button', { name: /Carrera vuelta a vuelta/ }).click();

    const grafico = page.locator('canvas[aria-label*="Dispersión"]');
    await expect(grafico).toBeVisible({ timeout: 20_000 });

    // El lienzo no tiene texto que leer, así que su descripción tiene que
    // llevar el resumen y remitir a la tabla.
    await expect(grafico).toHaveAttribute('aria-label', /vueltas de \d+ pilotos/);

    // La tabla es la alternativa accesible al gráfico, y además el dato que
    // más se mira: mediana y horquilla.
    const tabla = page.locator('table').filter({ hasText: 'Horquilla' });
    await expect(tabla.locator('tbody tr')).toHaveCount(2);
    await expect(tabla).toContainText('VER');
    await expect(tabla).toContainText('NOR');
  });

  test('el ritmo de la parrilla se ordena por mediana, no por vuelta rápida', async ({
    page,
  }) => {
    await page.goto('/analysis');
    await page.getByRole('button', { name: /Carrera vuelta a vuelta/ }).click();

    const cajas = page.locator('svg[aria-label*="Ritmo de"]');
    await expect(cajas).toBeVisible({ timeout: 20_000 });

    // En el juego de prueba NOR sostiene 1:31–1:33 y VER marca la vuelta más
    // rápida pero rueda más lento: por mediana manda NOR. Ordenar por mejor
    // vuelta pondría a VER primero y el gráfico mentiría sobre el ritmo.
    await expect(cajas).toHaveAttribute('aria-label', /Manda NOR/);

    // `textContent` y no `innerText`: en un `<text>` de SVG el segundo vuelve
    // vacío, y la comparación pasaría a comparar dos listas de nada.
    const codigos = await cajas
      .locator('text')
      .evaluateAll((nodos) =>
        nodos.map((n) => n.textContent?.trim() ?? '').filter((t) => t === 'VER' || t === 'NOR')
      );
    expect(codigos).toEqual(['NOR', 'VER']);
  });

  test('la degradación nombra cada compuesto, no solo lo colorea', async ({ page }) => {
    await page.goto('/analysis');
    await page.getByRole('button', { name: /Carrera vuelta a vuelta/ }).click();

    const grafico = page.locator('canvas[aria-label*="Caída de cada compuesto"]');
    await expect(grafico).toBeVisible({ timeout: 20_000 });

    // Los colores de compuesto no se distinguen solos en tema claro —el duro da
    // 1,07:1 crudo, y ya derivado se separa del medio ΔE 12,1—, así que el
    // nombre y los números tienen que estar escritos.
    const tabla = page.locator('table').filter({ hasText: 'Caída' });
    await expect(tabla).toContainText('Blando');
    await expect(tabla).toContainText('Duro');
    await expect(tabla.locator('tbody tr')).toHaveCount(2);

    // Y la descripción del lienzo lleva las cifras, porque un canvas no tiene
    // texto que un lector de pantalla pueda recorrer.
    await expect(grafico).toHaveAttribute('aria-label', /s\/vuelta/);
  });

  test('las vueltas de boxes quedan fuera de escala y se dicen', async ({ page }) => {
    await page.goto('/analysis');
    await page.getByRole('button', { name: /Carrera vuelta a vuelta/ }).click();
    await expect(page.locator('canvas[aria-label*="Dispersión"]')).toBeVisible({ timeout: 20_000 });

    // Esconder una vuelta sin decirlo sería mentir sobre los datos.
    await expect(page.getByText(/queda[n]? fuera de la escala/)).toBeVisible();
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

  test('la app recargándose a sí misma no la vuelve a enseñar', async ({ page }) => {
    // El caso real: llega una versión nueva, la app abre con la vieja y se
    // recarga sola segundos después para estrenarla. Esa recarga volvía a
    // disparar la animación de apertura encima de la portada ya pintada, como
    // si la app se hubiera vuelto a abrir.
    // `commit`, como en la prueba de arriba: la capa se retira sola a los
    // 2,2 s y esperar `load` puede llegar tarde para verla.
    await page.goto('/?splash', { waitUntil: 'commit' });
    await expect(page.locator('[data-splash]')).toBeVisible();

    // La marca de vida que el guion del head lee en la carga siguiente. En la
    // app instalada la escribe el propio componente cada quince segundos; aquí
    // se escribe a mano porque `?splash` no arranca el latido.
    await page.evaluate(() => localStorage.setItem('apexdata-viva', String(Date.now())));
    await page.reload({ waitUntil: 'commit' });

    // El guion corre antes del primer pintado: el documento queda marcado y la
    // capa ni se pinta. `auto` y no `forzada`, porque la regla CSS solo
    // esconde el valor de verdad — así que se comprueba el atributo.
    await expect(page.locator('html')).toHaveAttribute('data-reapertura', '');

    // Y una apertura de verdad —la marca de vida ya vieja— vuelve a sonar.
    await page.evaluate(() =>
      localStorage.setItem('apexdata-viva', String(Date.now() - 5 * 60_000))
    );
    await page.reload({ waitUntil: 'commit' });
    await expect(page.locator('html')).not.toHaveAttribute('data-reapertura', '');
    await expect(page.locator('[data-splash]')).toBeVisible();
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
    // Tres navegaciones, y una es la clasificación general —la página que más
    // consulta—. En CI, con dos procesos compartiendo una sola conexión a la
    // base, no cabe en el minuto por defecto: abortaba la última navegación.
    test.slow();

    await page.goto('/favorites');
    await page.getByRole('button', { name: 'Mercedes' }).click();

    await page.goto('/standings');
    const fondoDe = (equipo: string) =>
      page.locator(`[data-equipo="${equipo}"]`).first().evaluate((e) => getComputedStyle(e).backgroundColor);

    const mio = await fondoDe('mercedes');
    expect(mio).not.toBe(await fondoDe('mclaren'));

    // Al quitar el equipo, el acento vuelve al verde de la marca y las filas
    // dejan de distinguirse.
    await page.goto('/favorites', { waitUntil: 'domcontentloaded' });
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
    // `commit` y no `load`: la lista dispara treinta optimizaciones de imagen a
    // la vez y en CI —dos núcleos— esa cola tapona el servidor; si el click cae
    // antes de hidratar, la navegación es completa y su `load` espera a TODAS
    // las imágenes: se clavaba el minuto entero dos veces seguidas. Lo que esta
    // prueba vigila es que se llega y hay contenido, y el contenido lo
    // comprueba la aserción de abajo — no le hace falta el evento `load`.
    await page.waitForURL('**/circuits/monza', { waitUntil: 'commit' });

    // Con margen: `waitForURL` vuelve en cuanto cambia la dirección, pero el
    // contenido llega después, y en la tanda completa —con el servidor
    // atendiendo a todas las demás— los cinco segundos por defecto se quedan
    // cortos. Aislada pasaba siempre; en tanda fallaba una de cada dos.
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Monza', {
      timeout: 30_000,
    });

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

    // `domcontentloaded` y no el `load` por defecto: esta ficha lleva banderas,
    // fotos y el trazado, y esperar a que carguen TODAS las imágenes agotaba el
    // minuto de la prueba en CI. Lo que se comprueba aquí es el marcado, que
    // está desde el primer momento.
    await page.goto('/circuits/red_bull_ring', { waitUntil: 'domcontentloaded' });

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