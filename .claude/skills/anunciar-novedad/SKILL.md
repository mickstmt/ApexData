---
name: anunciar-novedad
description: Añade una novedad a la guía de lo nuevo de ApexData — la guía paso a paso que señala lo añadido a un módulo la primera vez que alguien entra después del cambio. Úsala cada vez que una función nueva y visible llegue a un módulo, antes de commitear.
---

# Anunciar una novedad en ApexData

Cuando se añade algo visible a un módulo, la primera vez que cada persona entra
después del cambio le sale una guía corta que se lo señala, paso a paso, con
«Saltar», «Atrás», «Siguiente» y «Entendido». La pidió el usuario el
2026-10-29 para todas las funciones nuevas de aquí en adelante.

El componente ya existe y **no se toca**. Anunciar una novedad es añadir una
entrada al registro y, si el módulo aún no tiene guía, ponérsela.

## Qué hay y dónde

| Pieza | Dónde |
|---|---|
| El registro: qué se anuncia, en qué módulo, desde cuándo | `src/lib/novedades/registro.ts` |
| Qué queda por ver y dónde se apunta lo visto | `src/lib/novedades/pendientes.ts` |
| La guía: el globo, el anillo, el teclado | `src/components/novedades/GuiaDeNovedades.tsx` |
| Colores y anillo | `.novedad-*` en `src/app/globals.css` |
| Pruebas de navegador con todo ya visto | `e2e/novedades-vistas.ts`, aplicado en `playwright.config.ts` |

## Lo que ya está decidido (no se reabre)

Se decidió con una maqueta navegable y dos agentes de UX. Para reabrir algo de
esto hace falta que lo pida el usuario.

- **Variante libre.** Sin oscurecer la pantalla: el módulo sigue funcionando
  debajo, y usar lo señalado hace avanzar la guía. La variante con foco se
  descartó porque bloquea justo lo que se está enseñando.
- **Caduca a los 30 días** de `desde`. Después ya no es nueva.
- **Sale también a quien entra por primera vez en su vida.** Un agente propuso
  lo contrario; el usuario lo pidió así y la caducidad lo acota.
- **De 1 a 3 pasos por novedad.** Si hacen falta más, eso es una página de
  cambios, no una guía. Una prueba unitaria lo vigila.
- **Lo visto se guarda en el aparato**, en `localStorage`, no en la cuenta. En
  el iPhone, Safari y la app instalada cuentan por separado, y se acepta.
- **Cuenta como visto:** cada paso al enseñarse; todos con «Saltar» o `Esc`;
  y un paso cuando se usa lo que señala, aunque la guía no esté abierta.
- **El foco no se mueve al abrir.** Se anuncia en una región viva y se llega
  con el tabulador. Al cerrar desde dentro, vuelve a lo señalado.

## Procedimiento

### 1. La entrada en el registro

```ts
{
  id: 'modulo-que-es',          // único y para siempre: lo visto se apunta con él
  modulo: 'calendario',         // el nombre que la pantalla le pasa a la guía
  desde: '2026-11-03',          // el día en que llega a PRODUCCIÓN, no el de hoy si no se despliega hoy
  pasos: [
    {
      id: 'filtro',
      ancla: '[data-novedad="filtro"]',
      titulo: 'Nuevo: filtrar por equipo',   // corto; empieza por «Nuevo:» si es lo primero que se ve
      texto: 'Toca un equipo para ver solo sus carreras.',  // una o dos frases, qué hace y cómo
    },
  ],
},
```

- **El ancla** es un selector CSS. Lo normal es poner `data-novedad="…"` en el
  elemento. Si ya tiene un atributo estable (`data-tecla`, un `id`), vale ese.
  Un paso cuyo elemento no esté en pantalla al abrirse la guía se salta solo.
- **Un id publicado no se cambia nunca**: cambiarlo hace que la guía vuelva a
  salir a todos los que ya la vieron.
- **No reutilices un id** de una novedad caducada para otra nueva: quien vio la
  vieja no vería la nueva.
- **Si el módulo ya tenía un aviso propio** que guardaba lo visto en otra
  clave, apúntala en `heredados: { idDelPaso: 'clave-vieja' }` para no
  repetírselo a quien ya lo vio.
- **Las novedades caducadas pueden quedarse** en el registro: no salen y no
  molestan. Las pruebas de la guía usan `calculadora-fracciones`; si un día se
  borra, cámbialas a otra.

### 2. Si el módulo aún no tiene guía

En la pantalla del módulo, que tiene que ser un componente de cliente:

```tsx
const guia = useGuiaDeNovedades('calendario');
const caja = useRef<HTMLDivElement>(null);

<div ref={caja} className="relative …">
  {/* … el módulo … */}
  <GuiaDeNovedades guia={guia} contenedor={caja} />
</div>
```

- **El contenedor tiene que ser `relative`** y contener lo señalado. El globo
  se pinta en él, fuera de cualquier `overflow-hidden` de dentro.
- **Los colores:** define en el contenedor `--novedad-fondo`, `--novedad-tinta`,
  `--novedad-acento` y `--novedad-acento-tinta`, como hace `[data-calculadora]`
  en `globals.css`. Sin ellas se usan los colores de la app invertidos, que no
  se han medido en ningún módulo. **Mídelos** (paso 4).
- **`Esc` ya lo gestiona la guía**, antes que los atajos de la pantalla. No
  hace falta tocar el teclado del módulo.
- **El clic sobre lo señalado ya cuenta como uso.** Si además se puede usar con
  un atajo de teclado, llama a `guia.usado(ancla)` desde ese atajo, como hace
  la calculadora con `f` y `d`.
- **Para un ejemplo o un dibujo** dentro de un paso, pásalo en `adornos`, por
  la clave `novedad/paso`: `adornos={{ 'calculadora-fracciones/tecla': <Ejemplo /> }}`.

### 3. Las pruebas

- **Las pruebas de siempre no se tocan.** `playwright.config.ts` da por vistas
  todas las novedades del registro, así que la guía no tapa nada.
- **Las de la guía de un módulo nuevo** empiezan con el navegador vacío y con
  el reloj fijo dentro del plazo, o se pondrán rojas solas a los 30 días. Copia
  el patrón de `la guía de lo nuevo` en `e2e/calculadora.spec.ts`:

```ts
test.use({ storageState: NAVEGADOR_VACIO });
test.beforeEach(async ({ page }) => page.clock.setFixedTime(enElDia(1)));
```

Como mínimo: que salga y señale cada paso, que «Siguiente»/«Entendido» la
cierre y no vuelva al recargar, que `Esc` no dispare el atajo del módulo, que
usar lo señalado avance, y el contraste y el ancho del punto 4.

### 4. Medir

Como en todo lo visual (skill `verificar`), en **360, 390 y escritorio**, en
**los dos temas**:

- El globo cabe entero, no tapa lo que señala y sus botones van en una fila.
- Texto del globo y botones: **4,5:1**.
- El anillo contra el fondo que rodea a lo señalado: **3:1** (WCAG 1.4.11).
- Ancho del documento no mayor que la ventana.

### 5. Al cerrar

En la bitácora, la novedad con su `id` y su `desde`. Y si `desde` era una
previsión y el despliegue se retrasó, corrígela antes: la caducidad cuenta
desde ahí.
