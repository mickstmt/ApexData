import { expect, test, type Page } from '@playwright/test';

/**
 * La ficha de una carrera, contra la base de verdad.
 *
 * Lo que se vigila aquí es que la cabecera hable de la sesión que estás
 * viendo. Enseñaba siempre la fecha y la hora de la CARRERA, en todas las
 * pestañas: se entraba desde la tarjeta «Práctica 1 · vie, 11 sept, 06:30» y
 * arriba ponía el domingo a las 08:00. Quien no se sepa el horario de memoria
 * lee que la P1 fue a las ocho.
 *
 * La zona horaria se fija porque la hora se pinta en la de quien mira, y sin
 * fijarla la prueba diría cosas distintas según dónde corra.
 */
test.use({ viewport: { width: 390, height: 844 }, timezoneId: 'Europe/Madrid' });

/** La fila de circuito, fecha y hora que va bajo el título. */
async function cabecera(page: Page, url: string) {
  await page.goto(url);
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 30_000 });
  return {
    texto: await page
      .locator('h1')
      .first()
      .locator('xpath=following-sibling::div[1]')
      .innerText(),
    // `HoraDeSalida` es lo único con esta pinta dentro de la cabecera.
    horas: await page.locator('h1').first().locator('xpath=following-sibling::div[1]')
      .locator('span.font-mono.tabular-nums').count(),
  };
}

test.describe('la cabecera sigue a la pestaña', () => {
  test('cada sesión enseña SU fecha, no la del domingo', async ({ page }) => {
    // 2026 porque de 2022 en adelante la base guarda la hora de cada sesión.
    const carrera = await cabecera(page, '/results/2026/1?sesion=race');
    const practica = await cabecera(page, '/results/2026/1?sesion=practice1');
    const clasi = await cabecera(page, '/results/2026/1?sesion=qualifying');

    // Lo esencial: las tres dicen cosas distintas. Antes eran idénticas.
    expect(practica.texto).not.toBe(carrera.texto);
    expect(clasi.texto).not.toBe(carrera.texto);
    expect(practica.texto).not.toBe(clasi.texto);

    // Y las tres traen hora, porque en 2026 se conoce.
    expect(carrera.horas).toBe(1);
    expect(practica.horas).toBe(1);
    expect(clasi.horas).toBe(1);
  });

  test('antes de 2022 se enseña el día pero no una hora inventada', async ({ page }) => {
    // De 2010 a 2021 la base guarda el día de cada sesión a medianoche UTC
    // porque Ergast no publicaba horarios. Escribir «00:00» ahí diría que la
    // práctica fue a medianoche.
    const carrera = await cabecera(page, '/results/2015/2?sesion=race');
    const practica = await cabecera(page, '/results/2015/2?sesion=practice1');

    expect(practica.texto).not.toBe(carrera.texto);
    // La carrera sí tiene hora de salida; la práctica no tiene ninguna.
    expect(carrera.horas).toBe(1);
    expect(practica.horas).toBe(0);
  });

  test('sin fecha propia se enseña la de la carrera, y se dice que lo es', async ({ page }) => {
    // Imola 2022: fin de semana al sprint, con pestaña de clasificación al
    // sprint pero sin fecha guardada para esa sesión. Son 18 carreras así.
    const sq = await cabecera(page, '/results/2022/4?sesion=sprint-qualifying');

    expect(sq.texto).toContain('Carrera:');
    // Y no se presta la hora del domingo, que no es la de esta sesión.
    expect(sq.horas).toBe(0);
  });
});

/**
 * La puerta al replay, al pie de la tarjeta del resumen.
 *
 * Estaba suelta entre el resumen y la tabla: 147 px pegados a la izquierda en
 * el hueco entre dos piezas de 358. Eso era lo «descuadrado», y el sitio
 * tampoco era bueno.
 */
test.describe('el botón de ver la carrera', () => {
  test('ocupa el ancho de la tarjeta y va soldado a ella', async ({ page }) => {
    await page.goto('/results/2026/12');
    const boton = page.getByRole('link', { name: /Ver la carrera/ });
    await boton.waitFor({ timeout: 30_000 });
    await boton.scrollIntoViewIfNeeded();

    const m = await page.evaluate(() => {
      const b = [...document.querySelectorAll('a')].find((a) => /Ver la carrera/.test(a.textContent || ''))!;
      const pie = b.closest('div')!;
      const arriba = pie.previousElementSibling!.getBoundingClientRect();
      return {
        anchoBoton: b.getBoundingClientRect().width,
        anchoPie: pie.getBoundingClientRect().width,
        // Negativo sería pintarse encima; positivo, un hueco que rompe la
        // tarjeta en dos. Tiene que ser cero.
        junta: Math.round(pie.getBoundingClientRect().top - arriba.bottom),
      };
    });

    // Ya no es una pastilla: ocupa la tarjeta menos su relleno.
    expect(m.anchoBoton).toBeGreaterThan(m.anchoPie * 0.85);
    expect(m.junta).toBe(0);
  });

  test('antes de 2018 no hay replay, y no queda una caja vacía', async ({ page }) => {
    // `VerReplay` no se pinta sin posiciones, así que el pie tampoco puede
    // pintarse: serían bordes alrededor de nada.
    await page.goto('/results/2015/2');
    await expect(page.getByRole('link', { name: /Ver la carrera/ })).toHaveCount(0);

    const vacias = await page.evaluate(() =>
      [...document.querySelectorAll('div.rounded-b-lg.border-t-0')].filter(
        (d) => (d.textContent ?? '').trim() === ''
      ).length
    );
    expect(vacias).toBe(0);
  });
});
