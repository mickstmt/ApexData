import { expect, test, type Page } from '@playwright/test';

/**
 * La calculadora científica de `/calculadora`.
 *
 * ## Qué vigila esto que no vigilen las unitarias
 *
 * `tests/calculadora.test.ts` ya prueba la aritmética entera —37 casos sobre
 * el motor— y lo hace mejor de lo que podría hacerse aquí: es lógica pura y no
 * necesita un navegador. Repetirla sería pagar un navegador por nada.
 *
 * Lo que solo se ve aquí es lo otro: que las teclas estén de verdad conectadas
 * al motor, que la pantalla se lea en los DOS temas, que quepa en un teléfono
 * estrecho y que **siga escondida**. Ese último punto es el más fácil de
 * romper sin querer: basta con que alguien añada la ruta a `navItems` pensando
 * que faltaba.
 *
 * ## Por qué tanto contraste
 *
 * Porque la medición encontró dos fallos que a ojo no se veían, los dos en la
 * misma tecla: el rojo de `C` daba 4,32:1 en claro y 4,35:1 en oscuro. Se
 * arreglaron cambiando su fondo y subiendo `--calc-rojo` en oscuro. Sin una
 * prueba, el siguiente retoque de la paleta los devuelve y nadie se entera.
 *
 * El fondo se compone **desde el propio elemento** hacia arriba, no desde su
 * padre. Medirlo desde el padre fue un error real de la primera pasada: a la
 * tecla `=` —blanco sobre azul lleno— le daba 1,18:1 y parecía rota teniendo
 * 4,85.
 */

/** Umbral de WCAG 1.4.3 para texto normal. Aquí se le exige a todo. */
const LEGIBLE = 4.5;

/**
 * Deja en la página un medidor de contraste que compone los fondos de verdad.
 *
 * Un fondo `rgba(...)` comparado consigo mismo da 1,00:1 y parece un fallo que
 * no existe; por eso se acumula la cadena entera de ancestros sobre blanco.
 */
async function conMedidor(page: Page, tema: 'light' | 'dark') {
  await page.addInitScript(`try { localStorage.setItem('theme', '${tema}'); } catch {}`);
  await page.addInitScript(() => {
    const parse = (c: string) => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(',').map((x) => parseFloat(x.trim()));
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    };
    type Color = { r: number; g: number; b: number; a: number };
    const sobre = (f: Color, b: Color): Color => ({
      r: f.r * f.a + b.r * (1 - f.a),
      g: f.g * f.a + b.g * (1 - f.a),
      b: f.b * f.a + b.b * (1 - f.a),
      a: 1,
    });
    const lum = (c: Color) => {
      const f = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    };

    (window as unknown as { __contraste: (el: Element) => number }).__contraste = (el) => {
      const cadena: Color[] = [];
      for (let n: Element | null = el; n; n = n.parentElement) {
        const c = parse(getComputedStyle(n).backgroundColor);
        if (c && c.a > 0) cadena.push(c);
      }
      let fondo: Color = { r: 255, g: 255, b: 255, a: 1 };
      for (const c of cadena.reverse()) fondo = sobre(c, fondo);
      const tinta = sobre(parse(getComputedStyle(el).color)!, fondo);
      const a = lum(tinta);
      const b = lum(fondo);
      return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100;
    };
  });
}

const resultado = (page: Page) => page.locator('[data-visor="resultado"]');
const expresion = (page: Page) => page.locator('[data-visor="expresion"]');

/**
 * Pulsa una tecla por su nombre accesible.
 *
 * Que aquí se pueda escribir `pulsar(page, '7')` y no `pulsar(page, 'siete')`
 * NO es una comodidad de la prueba: es la comprobación de WCAG 2.5.3. El
 * nombre accesible de cada tecla es la etiqueta que se ve, así que quien
 * maneje el ordenador con la voz puede decir lo que lee. Si alguien volviera a
 * poner un `aria-label` descriptivo encima, estas llamadas dejarían de
 * encontrar las teclas.
 */
const pulsar = (page: Page, nombre: string) =>
  page.getByRole('button', { name: nombre, exact: true }).click();

// ---------------------------------------------------------------------------
// Que siga escondida
// ---------------------------------------------------------------------------

/**
 * Finge que la página corre dentro de la app instalada.
 *
 * Se sustituye `matchMedia` en vez de emular el modo de verdad porque
 * Playwright no sabe: `display-mode` no está entre los medios que emula. Con
 * esto se comprueba lo que de verdad puede romperse —el atributo, la regla de
 * CSS y el enlace— aunque la señal venga de mentira. Es el mismo truco que ya
 * usa `pie-de-la-app.spec.ts`.
 */
async function comoInstalada(page: Page) {
  await page.addInitScript(() => {
    const real = window.matchMedia.bind(window);
    window.matchMedia = (q: string) =>
      q.includes('display-mode: standalone')
        ? ({
            matches: true,
            media: q,
            onchange: null,
            addListener() {},
            removeListener() {},
            addEventListener() {},
            removeEventListener() {},
            dispatchEvent: () => false,
          } as MediaQueryList)
        : real(q);
  });
}

test.describe('la pantalla no se anuncia, salvo donde haría falta', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('los buscadores no la listan', async ({ page }) => {
    await page.goto('/calculadora');
    await expect(page.locator('[data-calculadora]')).toBeVisible();

    // Esto sigue valiendo con o sin enlace: la puerta de la app instalada la
    // hace alcanzable, no indexable.
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('en la web no se ve, ni siquiera abriendo el menú', async ({ page }) => {
    await page.goto('/');

    // El enlace está en el HTML —lo esconde una regla de CSS, no React— pero
    // no se ve, no se puede pulsar y no lo alcanza el tabulador. Contar los
    // VISIBLES, y no los nodos, es justo la diferencia que se quiere vigilar.
    //
    // Se cuentan en plural porque el menú se pinta dos veces: la hoja del
    // teléfono y la de la cabecera entre `md` y `lg` comparten componente, así
    // que hay dos copias de cada entrada en el documento.
    await expect(page.locator('a[href="/calculadora"]:visible')).toHaveCount(0);

    await page.getByRole('button', { name: /más/i }).click();
    await expect(page.getByRole('link', { name: /Acerca de ApexData/i }).first()).toBeVisible();
    await expect(page.locator('a[href="/calculadora"]:visible')).toHaveCount(0);
  });

  test('en la app instalada sí, porque allí no hay barra de direcciones', async ({ page }) => {
    await comoInstalada(page);
    await page.goto('/');

    await expect(page.locator('html[data-instalada]')).toHaveCount(1);

    await page.getByRole('button', { name: /más/i }).click();
    const enlace = page.locator('a[href="/calculadora"]:visible');
    await expect(enlace).toHaveCount(1);
    await expect(enlace).toHaveText(/Calculadora científica/);

    await enlace.click();
    await expect(page.locator('[data-calculadora]')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Que las teclas estén conectadas
// ---------------------------------------------------------------------------

test.describe('las teclas mueven el motor', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('calcula mientras se escribe y respeta la precedencia', async ({ page }) => {
    await page.goto('/calculadora');

    for (const k of ['2', '+', '3', '×', '4']) await pulsar(page, k);
    // Antes de pulsar `=`: la vista previa es lo que distingue esta pantalla de
    // una calculadora de botones, y si se rompe no lo nota nadie.
    await expect(resultado(page)).toHaveText('14');

    await pulsar(page, '=');
    await expect(resultado(page)).toHaveText('14');
  });

  test('la trigonometría cambia con el mando de unidades', async ({ page }) => {
    await page.goto('/calculadora');

    await pulsar(page, 'sin');
    await pulsar(page, '3');
    await pulsar(page, '0');
    await pulsar(page, '=');
    await expect(resultado(page)).toHaveText('0.5');

    await page.getByRole('radio', { name: 'RAD', exact: true }).click();
    await pulsar(page, 'C');
    await pulsar(page, 'sin');
    await pulsar(page, '3');
    await pulsar(page, '0');
    await pulsar(page, '=');
    await expect(resultado(page)).toHaveText(/^-0\.988/);
  });

  test('el porcentaje se toma del número de la izquierda', async ({ page }) => {
    await page.goto('/calculadora');
    for (const k of ['2', '0', '0', '+', '1', '0', '%']) {
      await pulsar(page, k);
    }
    await pulsar(page, '=');
    await expect(resultado(page)).toHaveText('220');
  });

  test('«2nd» y «hyp» cambian la cara de las teclas y se combinan', async ({ page }) => {
    await page.goto('/calculadora');

    await page.getByRole('button', { name: '2nd' }).click();
    await expect(page.getByRole('button', { name: 'sin⁻¹', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'hyp' }).click();
    await expect(
      page.getByRole('button', { name: 'sinh⁻¹', exact: true })
    ).toBeVisible();

    // Quitar `hyp` deja `2nd` puesto: son dos mandos independientes, y la
    // tecla pasa de `sinh⁻¹` a `sin⁻¹`, no a `sin`.
    await page.getByRole('button', { name: 'hyp' }).click();
    await expect(page.getByRole('button', { name: 'sin⁻¹', exact: true })).toBeVisible();

    // `2nd` sí es de un solo uso, como en una calculadora física: se apaga al
    // usar la función, no antes.
    await pulsar(page, 'sin⁻¹');
    await expect(page.getByRole('button', { name: 'sin', exact: true })).toBeVisible();
    await expect(expresion(page)).toHaveText('sin⁻¹(');
  });

  test('el retroceso borra una tecla entera, no una letra', async ({ page }) => {
    await page.goto('/calculadora');

    await pulsar(page, 'sin');
    await pulsar(page, '9');
    await expect(expresion(page)).toHaveText('sin(9');

    // Dos pulsaciones para dos teclas. Si borrase letras harían falta cinco y
    // por el camino quedaría `sin`, que el analizador no sabe leer.
    await pulsar(page, 'borrar lo último');
    await pulsar(page, 'borrar lo último');
    await expect(expresion(page)).toHaveText('');
  });

  test('se puede teclear, y tras «=» se sigue del resultado', async ({ page }) => {
    await page.goto('/calculadora');

    await page.keyboard.type('7*6');
    await page.keyboard.press('Enter');
    await expect(resultado(page)).toHaveText('42');

    await pulsar(page, '+');
    await pulsar(page, '8');
    await pulsar(page, '=');
    await expect(resultado(page)).toHaveText('50');
  });

  test('«±» sobre un resultado lo niega, en vez de dejar un menos suelto', async ({ page }) => {
    await page.goto('/calculadora');

    await page.keyboard.type('5*5');
    await page.keyboard.press('Enter');
    await expect(resultado(page)).toHaveText('25');

    // Lo que hacía antes: dejar `Ans−`, una expresión a medias cuyo resultado
    // desaparecía de la pantalla.
    await pulsar(page, '±');
    await pulsar(page, '=');
    await expect(resultado(page)).toHaveText('-25');
  });

  test('con el foco en una tecla, Enter pulsa esa tecla y no «=»', async ({ page }) => {
    await page.goto('/calculadora');

    // Quien navega con el tabulador activa los botones con Enter. Si el atajo
    // global se quedara con la tecla, enfocar el `7` y pulsar Enter calcularía.
    await page.getByRole('button', { name: '7', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(expresion(page)).toHaveText('7');
  });

  test('lo que se teclea en un campo de la app no se lo queda la calculadora', async ({ page }) => {
    await page.goto('/calculadora');

    // La cabecera trae un panel de ajustes con campos, y esta pantalla lo
    // hereda del armazón. El atajo global escucha en `window`, así que sin
    // guarda se llevaba los dígitos de cualquier campo de la página.
    await page.evaluate(() => {
      const campo = document.createElement('input');
      campo.id = 'campo-de-prueba';
      document.body.appendChild(campo);
      campo.focus();
    });
    await page.keyboard.type('7');

    await expect(page.locator('#campo-de-prueba')).toHaveValue('7');
    await expect(expresion(page)).toHaveText('');
  });

  test('la memoria guarda y devuelve', async ({ page }) => {
    await page.goto('/calculadora');

    await pulsar(page, '7');
    await pulsar(page, 'MS');
    await expect(page.locator('[data-calculadora] span[title^="En memoria"]')).toBeVisible();

    await pulsar(page, 'C');
    await pulsar(page, 'MR');
    await pulsar(page, '=');
    await expect(resultado(page)).toHaveText('7');
  });

  test('la cinta recuerda los cálculos y los devuelve al tocarlos', async ({ page }) => {
    await page.goto('/calculadora');

    await page.keyboard.type('12*12');
    await page.keyboard.press('Enter');
    await expect(resultado(page)).toHaveText('144');

    await page.getByRole('button', { name: 'Cinta' }).click();
    const primera = page.locator('[data-calculadora] ul li button').first();
    await expect(primera).toContainText('144');

    await primera.click();
    await expect(expresion(page)).toHaveText('144');
  });

  test('lo que no se puede calcular se dice con palabras', async ({ page }) => {
    await page.goto('/calculadora');

    await pulsar(page, '1');
    await pulsar(page, '÷');
    await pulsar(page, '0');
    await pulsar(page, '=');

    // Ni `NaN`, ni `Infinity`, ni una pantalla en blanco.
    await expect(resultado(page)).toHaveText(/dividir entre cero/i);
  });
});

// ---------------------------------------------------------------------------
// Que se lea y quepa, en los dos temas
// ---------------------------------------------------------------------------

for (const tema of ['light', 'dark'] as const) {
  test.describe(`el tema ${tema}`, () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('todo lo que hay que leer llega a 4,5:1', async ({ page }) => {
      await conMedidor(page, tema);
      await page.goto('/calculadora');
      await expect(page.locator('[data-calculadora]')).toBeVisible();

      const esOscuro = await page.evaluate(() =>
        document.documentElement.classList.contains('dark')
      );
      expect(esOscuro, 'no se ha aplicado el tema pedido').toBe(tema === 'dark');

      const medidas = await page.evaluate(() => {
        const medir = (window as unknown as { __contraste: (el: Element) => number }).__contraste;
        const salida: Record<string, number> = {};

        salida['la expresión'] = medir(document.querySelector('[data-visor="expresion"]')!);
        salida['el resultado'] = medir(document.querySelector('[data-visor="resultado"]')!);

        // Una tecla de cada familia: el color dice para qué sirve, y cada
        // familia se apoya en un fondo distinto.
        const teclas = [...document.querySelectorAll('[data-calculadora] button')];
        for (const etiqueta of ['7', '÷', '=', 'sin', 'MC', 'DEG', 'C']) {
          const el = teclas.find((b) => b.textContent?.trim() === etiqueta);
          if (el) salida[`la tecla ${etiqueta}`] = medir(el);
        }
        return salida;
      });

      // Se comprueban todas y se informa de la que falle, con su valor: un
      // «esperaba true» no dice cuánto falta.
      for (const [que, ratio] of Object.entries(medidas)) {
        expect(ratio, `${que} se queda en ${ratio}:1`).toBeGreaterThanOrEqual(LEGIBLE);
      }
      expect(Object.keys(medidas).length, 'han desaparecido elementos por medir').toBe(9);
    });

    test('el aviso de error también se lee', async ({ page }) => {
      await conMedidor(page, tema);
      await page.goto('/calculadora');

      await pulsar(page, '1');
      await pulsar(page, '÷');
      await pulsar(page, '0');
      await pulsar(page, '=');
      await expect(resultado(page)).toHaveText(/dividir entre cero/i);

      const ratio = await page.evaluate(() =>
        (window as unknown as { __contraste: (el: Element) => number }).__contraste(
          document.querySelector('[data-visor="resultado"]')!
        )
      );
      expect(ratio, `el aviso de error se queda en ${ratio}:1`).toBeGreaterThanOrEqual(LEGIBLE);
    });
  });
}

// ---------------------------------------------------------------------------
// Que quepa en los tres anchos que exige el proyecto
// ---------------------------------------------------------------------------

test.describe('la maqueta aguanta los tres anchos', () => {
  for (const ancho of [360, 390, 1280]) {
    test(`a ${ancho} px no arrastra ni corta etiquetas`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.goto('/calculadora');
      await expect(page.locator('[data-calculadora]')).toBeVisible();

      // El peor caso de todos: con los dos modificadores puestos salen las
      // etiquetas más largas que existen, `sinh⁻¹` y compañía.
      await page.getByRole('button', { name: 'hyp' }).click();
      await page.getByRole('button', { name: '2nd' }).click();
      await expect(
        page.getByRole('button', { name: 'sinh⁻¹', exact: true })
      ).toBeVisible();

      const m = await page.evaluate(() => {
        const teclas = [...document.querySelectorAll('[data-calculadora] button')];
        return {
          documento: document.documentElement.scrollWidth,
          cortadas: teclas
            .filter((b) => b.scrollWidth > b.clientWidth + 1)
            .map((b) => b.textContent?.trim()),
          masBaja: Math.min(...teclas.map((b) => Math.round(b.getBoundingClientRect().height))),
        };
      });

      expect(m.documento, 'hay arrastre horizontal').toBeLessThanOrEqual(ancho);
      expect(m.cortadas, `etiquetas cortadas: ${m.cortadas.join(', ')}`).toEqual([]);
      // El listón del proyecto para un objetivo táctil.
      expect(m.masBaja, 'hay teclas por debajo de 32 px').toBeGreaterThanOrEqual(32);
    });
  }
});
