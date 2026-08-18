# ApexData — Progreso del Relanzamiento 2026

> **Documento vivo del plan definido en `AUDITORIA_Y_PLAN_RELANZAMIENTO_2026.md`.** Se actualiza con cada cambio, por mínimo que sea.
> Si estás retomando el trabajo desde cualquier máquina (casa u oficina), este archivo + el plan de referencia contienen TODO el contexto necesario. Instrucción para Claude: leer ambos documentos completos antes de tocar código.

---

## Reglas de trabajo acordadas

1. **Este documento se actualiza siempre**: cada sesión de trabajo termina con una entrada en la bitácora y el estado actualizado, y se commitea/pushea para que esté disponible desde cualquier lugar.
2. **Acciones del usuario**: cuando algo requiera acción manual suya, se indica con máximo detalle, sin asumir conocimientos ni pasos previos. Si son varios pasos: primero un resumen corto de qué se va a hacer, y después SIEMPRE paso a paso, uno por uno, esperando confirmación antes de seguir, para evitar errores y estancamientos.
3. **Herramientas**: se usan agentes especializados por ámbito, skills de Claude Code (dataviz, code-review, security-review), e investigación en internet cuando haga falta.
4. **Cada sprint cierra con la app corriendo y verificada**, no con promesas.

---

## Estado actual

**Fase**: 🟡 **Sprint 6 en curso** (2026-08-18) — la web y la telemetría en producción: https://apexdata.meeks.fun · Sprint 5 cerrado con recortes anotados · Sprints 0–4 completados (2026-08-16).

**Cobertura de datos**: **2010–2026 completo** (17 temporadas) — resultados, clasificación y standings oficiales. 84 pilotos, 25 equipos, 55 circuitos.

**Imágenes**: 29 fotos de pilotos, 36 trazados de circuitos, 36 banderas y 8 logos de equipo, todo autoalojado en `public/images/` y vinculado en la BD.

**El repo está verde**: `npm run lint` (0 errores), `npm run type-check` (limpio por primera vez en el proyecto) y `npm run build` pasan. CI configurado en GitHub Actions.

**PWA**: instalable en iOS con icono propio, splash nativa, barra de pestañas inferior, modo offline y aviso de actualización.

**Próximo paso**: **cerrar el Sprint 6** con lo que queda de su alcance: `<Suspense>` en la ficha de piloto y en `/standings` (bucle de hasta 24 consultas), `global-error.tsx`, las consultas sin `take` de `/compare` y de la ficha de equipo, `/standings` distinguiendo un fallo de base de datos de una temporada vacía, la carrera sin resultados, las tablas priority+ y el resto del ARIA (pestañas, tablas, combobox).

**Tests**: 52 unitarios (TypeScript) + 14 (Python) + **10 de navegador (Playwright), que desde el 2026-08-18 corren también en CI** con acceso a la base de datos. Bloquean el despliegue en CI, igual que en plastik. Cubren lo que estuvo mal en silencio: detección de abandonos, horas reales de carrera, agregación por temporada, cara a cara, serialización de telemetría, el orden de los tiempos de vuelta, la edad de los pilotos y que cada equipo tenga un color visible en tema claro.

### Deuda técnica conocida (documentada, no bloqueante)
- ~~Colisión del modelo `Constructor`~~ → **resuelto en S3**: el modelo se llama `Team` (con `@@map("constructors")`, sin tocar la BD) y el workaround de `src/lib/prisma.ts` desapareció.
- La página `/telemetry` (OpenF1) sigue siendo un demo; conviene fusionarla con `/analysis`.
- El comparador `/compare` calcula stats sobre las últimas 5 carreras (engañoso); el head-to-head del perfil de piloto ya lo sustituye, falta retirarlo.
- El venv local tiene FastF1 3.7.0 aunque `requirements.txt` pide ≥3.8 (necesario para 2026): ejecutar `pip install -r requirements.txt` en el venv.
- Pendientes de S4 no abordados: mapa del circuito coloreado por velocidad y gráfico de estrategia de neumáticos.
- 15 warnings de lint (variables sin usar, algún `any`) — limpieza cosmética pendiente.
- 🟡 **Estados de carga: la mayor parte, resuelta el 2026-08-18**. De 6 páginas con `loading.tsx` se pasa a 12, la home transmite por partes con `<Suspense>` y las páginas históricas tienen caché de una hora. Queda pendiente el `<Suspense>` de la ficha de piloto (5 consultas secuenciales), que es la mitad del punto 6 del orden de ataque.
- **Recortado de S5 el 2026-08-18, decisión del usuario** (se registra en lugar de desaparecer, que era justo el fallo de método diagnosticado):
  - **Push post-GP** (§8.8 del plan): sin `push` ni `notificationclick` en `public/sw.js`.
  - **Pantalla de administración para importar temporadas**: no existe `src/app/admin`.
  - **Checklist de seguridad de §10, incompleto**: faltan *secret scanning* y *push protection* en GitHub, backup mensual con `pg_dump` y *rate limiting* (`slowapi`) en el servicio Python. El RLS de Supabase, que estaba en esta lista, dejó de estar recortado el mismo día — ver la bitácora.
- 🟡 **Logos de equipo** (detectado por el usuario el 2026-08-18 mirando `/constructors`). Resueltos dos de los tres defectos: el **encuadre** —la caja era cuadrada de 48 px y los logos van de 1,09:1 a 4,8:1, así que un wordmark se dibujaba a 48×10 px— y la **legibilidad por tema**, porque el archivo trae la tinta fija; ahora se pintan como silueta monocroma, negra en claro y blanca en oscuro. De paso se quitó de `sauber.svg` un fondo blanco que cubría el lienzo. **Sigue pendiente** lo que exige acción manual: las **6 marcas sin logo** (Ferrari, Red Bull, Aston Martin, RB, Cadillac, AlphaTauri) y que `williams` es `.webp` en vez de SVG.
- 🔴 **Latencia de la base de datos: el pooler cuesta 5× lo que la conexión directa** (medido el 2026-08-18; no se ha cambiado nada, por decisión del usuario). Sobre el mismo host `aws-1-us-east-1`: una `SELECT 1` por el **pooler (6543)** tarda **506 ms**; por la **conexión directa (5432)**, **101 ms**, que es exactamente el ida y vuelta de red hasta Virginia. Además `connection_limit=1` serializa: cinco consultas en paralelo tardan lo mismo que en fila india. Se nota donde no hay caché: la home, con 4 consultas encadenadas, tarda **1,4 s**, y `/api/health`, con una sola, **540 ms**; las páginas con `unstable_cache` responden en 55-90 ms y estaban tapando el problema. El pooler tiene sentido en serverless, donde cada petición es un proceso nuevo; aquí hay un contenedor permanente.
- **El servicio de telemetría no tiene despliegue automático**: el CI solo dispara el webhook de la web, así que un cambio en `python-service/` exige pulsar *Deploy* a mano en el panel.
- 🔴 **Auditoría triple del 2026-08-17** (retroalimentación · accesibilidad/móvil · veracidad de la documentación): el alcance completo quedó consolidado en la sección **"S6 — alcance completo"** del plan de referencia. Resuelto el 2026-08-18: `useReducedMotion`, el foco de teclado, el zoom bloqueado, Favoritos a partir del piloto 51, y los tokens de timing, los gráficos en tema claro y la edad de los pilotos. **Sigue pendiente**: ninguna tabla con priority+, y **9 promesas del plan sin implementar ni registrar como deuda** (personalización por equipo, Table/Chip/Sheet, ficha de circuito, FLIP, `seed:all` incompleto…). La documentación resultó veraz en lo que afirma e incompleta en lo que omite: el cierre de cada sprint nunca se contrastó contra su alcance original.

**Decisiones tomadas**:
- ✅ **Las pruebas de navegador corren en CI** (2026-08-18). El job `e2e` construye con credenciales falsas —como el job `web`, para no perder la garantía de que la app compila sin base de datos— y sirve la app con el secret `DATABASE_URL` que ya existía para el cron. El despliegue depende ahora de las tres cosas: tipos, tests y navegador.
- ✅ **Estados de carga elegidos sobre un mockup en vivo** (2026-08-18): al **navegar entre páginas**, un coche cruzando la pantalla con barra de avance arriba; al **cambiar de temporada**, indicador dentro de la caja del selector y contenido velado. El usuario pidió que las decisiones de interfaz y animación se propongan siempre así, viéndolas, y no descritas por escrito.
- ✅ **Todo en el VPS del usuario vía EasyPanel** (2026-08-17). Se descartó Vercel al descubrir que plastik ya se despliega en ese VPS con `git push` → GitHub Actions → webhook de EasyPanel, **sin necesitar acceso SSH**: el panel es web (`panel.dittochatbot.com`). El argumento a favor de Vercel era precisamente poder desplegar desde casa, y eso ya estaba resuelto.
- ✅ **Hosting del microservicio Python: el mismo VPS** (2026-08-16). El usuario ya tiene un VPS con varios aplicativos desplegados; el servicio FastF1 (que ya tiene Dockerfile) se despliega ahí en S5. Esto elimina el único coste previsto (~$5/mes de Railway) → **coste total del proyecto: $0/mes**. Pendiente de recabar en S5: proveedor/SO del VPS, RAM/disco disponibles, si usa Docker y qué reverse proxy (Nginx/Caddy/Traefik) sirve los demás aplicativos.

**Decisiones pendientes**:
- [ ] **Qué hacer con la latencia de la base de datos**, con las medidas ya sobre la mesa (ver la deuda técnica): pasar la app a la conexión directa —5× más rápido, gratis, una variable en EasyPanel— o llevarse Postgres al VPS —~1 ms, pero los backups y las actualizaciones pasan a ser cosa nuestra—. El usuario pidió medir primero y decidir después.
- [ ] Ampliar el histórico más atrás de 2010 (opcional; ~10 min por temporada, desatendido).
- [ ] Subdominio para la app (p. ej. `apexdata.izistoreperu.com`) — se elige al crear la app en EasyPanel.

---

## Acciones pendientes del usuario

1. ~~**Desplegar la web y el servicio de telemetría en EasyPanel**~~ → ambos hechos: la web el 2026-08-17 y la telemetría el 2026-08-18, con el volumen en `/app/cache` y `FASTF1_SERVICE_URL` ya configurada. ~~Comprobación de cutover del CI~~ → resuelta.
2. **6 logos de equipo** que no están en fuentes libres (son marcas registradas): Ferrari, Red Bull, Aston Martin, RB, Cadillac y AlphaTauri. Descargar el SVG de cada uno (Brandfetch, seeklogo o la web oficial) y guardarlo como `public/images/constructors/<constructorId>.svg` — exactamente: `ferrari.svg`, `red_bull.svg`, `aston_martin.svg`, `rb.svg`, `cadillac.svg`, `alphatauri.svg`. Después ejecutar `npm run images:link`. Sin esto, esos equipos muestran sus iniciales en un recuadro (no se rompe nada).
3. ~~Decidir cuánto histórico cargar~~ → hecho: 2010–2026 completo.

---

## Bitácora

### 2026-08-18 (6) — El coche en pista, los logos y la factura del pooler ✅

**Los estados de carga se eligieron viéndolos, no leyéndolos.** El indicador del selector de temporada que se había puesto por la mañana —un spinner y un «Cargando temporada…» colgados a la derecha del control— le pareció al usuario horrible, con razón: además de ruido, empujaba el layout al aparecer. De ahí una regla nueva de método: **lo visual se propone en un mockup navegable**, con las variantes lado a lado y animadas, y se decide sobre lo que se ve.

**Al navegar entre páginas: el coche.** Era una idea del usuario registrada el 2026-08-17 y sin decidir; ahora es la elegida, en su versión completa — coche grande cruzando el centro, barra de avance arriba y la página anterior velada detrás. Tres decisiones que conviene no perder: **solo cambios de ruta**, porque cambiar de temporada ya lo señala el selector y anunciarlo dos veces sería ruido; **no aparece antes de 250 ms**, porque una navegación resuelta en 70 ms con un coche por encima se siente más lenta, no más informada; y el arranque se detecta **interceptando el clic**, porque el router del App Router no emite eventos.

**Al cambiar de temporada: indicador en la caja y contenido velado.** El hueco de la flecha del desplegable ya estaba reservado, así que el indicador no mueve nada. El velo es un pseudoelemento sobre `main` y no `opacity` sobre el contenedor, para que el propio selector quede por encima, nítido: es la señal de «te he oído» y atenuarla sería quitarle el sentido. El texto visible pasa a `sr-only`, que era lo único que aportaba de verdad.

**Y la verificación pagó dos veces.** La primera medición dijo que el coche no aparecía nunca: la navegación real tardaba **69 ms** porque Next la había *prefetcheado*, así que el indicador estaba haciendo justo lo correcto — y la prueba estaba mal montada, con el retardo puesto en una petición que nunca llegaba a ocurrir. Repetida anulando el prefetch, el coche sale, cruza y se mueve. Las dos situaciones quedan como pruebas de navegador: **que aparece cuando la página tarda** y **que no interrumpe cuando es rápida**.

**Logos de equipo: tres defectos, no uno.** El usuario los vio mal en `/constructors`. (1) Seis marcas sin logo — marcas registradas, sigue siendo acción manual. (2) Invisibles en tema oscuro, porque el archivo trae la tinta fija. (3) «Súper chiquitos», que tenía una causa concreta: `TeamLogo` metía todos los logos en una **caja cuadrada de 48 px** y ninguno es cuadrado — `alfa` es 4,8:1 y se dibujaba a **48×10 px**. Ahora manda el alto, el ancho acompaña, y se pintan como **silueta monocroma**: la identidad del equipo ya la lleva su barra de color, que es donde el sistema de diseño dice que debe vivir. Al hacerlo apareció otro defecto que solo se ve mirando: **`sauber.svg` traía un fondo blanco que cubría el lienzo**, así que la silueta salía como un rectángulo macizo. Eliminado del archivo.

**Un dato que di mal y corrijo**: inspeccionando los logos con `grep` leí el primer `viewBox` de cada archivo y dije que `sauber` era vertical (916×1958). Su elemento raíz declara 722×193, que es lo que el navegador usa: es apaisado como los demás. El síntoma era el mismo; el motivo, no.

**Contrastes que faltaban por cerrar**: `--primary` en claro baja de 24% a 20% de luminosidad —los badges de dorsal y posición pasan de 3,52:1 a 4,51:1, y el blanco sobre el verde sólido de 4,86 a 6,45— y `--live` de 44% a 35% (3,27 → 4,59). Mismo tono; solo se mueve la luminosidad.

**Las pruebas de navegador entran en CI.** El job construye con credenciales falsas, como el de siempre, para no perder la garantía de que la app compila sin base de datos, y sirve la app con el secret que ya existía para el cron. De paso, `actions/checkout` y `setup-node` suben a v5, que era el aviso de retirada de Node 20.

**La lentitud tenía nombre, y no era Supabase.** El usuario preguntó si los tiempos de carga venían de Supabase y si un Postgres en el VPS iría más rápido. Medido: sobre el **mismo host**, una `SELECT 1` por el **pooler (6543)** cuesta **506 ms** y por la **conexión directa (5432)**, **101 ms** — que es exactamente el ida y vuelta de red hasta Virginia. La distancia pone 101 ms; **la configuración pone los otros 400**. Con `connection_limit=1`, además, cinco consultas en paralelo tardan lo mismo que en serie. Se ve en la app: la home, con 4 consultas encadenadas, tarda 1,4 s, y `/api/health`, con una sola, 540 ms, mientras las páginas con caché responden en 55-90 ms y tapaban el problema. **No se ha cambiado nada**: el usuario pidió saberlo primero y decidir después.

**Verificación**: build reproduciendo el CI sin base de datos, 52 tests unitarios, **10 de navegador**, y recorrido real en los dos temas con capturas — que es donde salió el rectángulo blanco de Sauber, algo que ninguna comprobación automática habría visto.

### 2026-08-18 (5) — Los tokens que nadie usaba, y una edad mal contada ✅

**La infraestructura de diseño llevaba desde el S3 sin consumirse**, que es el diagnóstico transversal de la auditoría. Los tokens `--fastest/--personal-best/--slower` existían y ningún componente los usaba: los tiempos se pintaban con `text-purple-400` a pelo, que en tema claro da **2,34:1**. Migrados en `LapTimesTable` y `AnalysisClient`.

**Pero sustituir el color por el token no bastaba: dos de los tres tokens tampoco cumplían.** `--personal-best` daba 4,21:1 y `--slower` 3,61:1 sobre la tarjeta blanca. Y menos aún en su uso real, porque los badges ponen la tinta **sobre un tinte de sí misma al 20 %**, que resta ~1,3 puntos. Oscurecidos hasta cumplir en ese peor caso: **6,88:1** y **6,60:1** sobre blanco, **4,73** y **4,60** sobre el tinte. Se ven más profundos que antes; es el precio de leerse.

**La semántica de broadcast estaba invertida.** `LapTimesTable` pintaba de morado el *mejor personal*, cuando morado es el mejor absoluto y verde el personal. Arreglarlo destapó que la tabla **no sabía cuál era la vuelta más rápida**: solo recibía el flag `IsPersonalBest`. De ahí `src/lib/lap-times.ts`, con la trampa que justifica un módulo aparte y sus tests: comparados como texto, `"59.900"` ordena *después* de `"1:29.165"`.

**Los gráficos desaparecían en tema claro** porque pintaban la variante `onDark` sobre lienzo blanco: Mercedes 1,40:1, Renault 1,15:1. Añadido el tercer valor `onLight`, **derivado y no escrito a mano** — oscurecer la identidad hasta superar 3:1 conserva el tono y garantiza que un equipo añadido mañana no llegue sin variante legible. Ferrari y Red Bull se quedan igual, porque ya se leían.

**Cómo lo consumen los dos gráficos, que era la decisión de fondo.** El SVG (`PointsEvolution`) lo hace **sin JavaScript**: el elemento lleva las dos variantes como variables CSS y la clase `.team-ink` deja que el tema elija, así que no hay parpadeo del color equivocado durante la hidratación. El canvas (`TelemetryChart`) no puede heredar una variable CSS, así que es el único sitio que lee el tema en código — y al hacerlo apareció un fallo latente: **no redibujaba al cambiar de tema**, de modo que rejilla y etiquetas se quedaban con los colores del tema anterior.

**Decisión del usuario: tokens de podio.** El oro estaba escrito a mano en cinco sitios y daba 2,58:1. Se valoró contra la alternativa barata (tonos de Tailwind más oscuros) y se eligió el sistema: `--podium-gold/silver/bronze`, un solo sitio donde se define qué es "oro". Ahora 4,77–5,00:1.

**La edad de los pilotos era `año − año`**, así que todo el que no había cumplido salía un año más viejo: Verstappen, nacido el 30/09/1997, aparecía con 29. Corregido en las dos pantallas y añadida la fecha de nacimiento junto a la edad, que era la otra mitad de la petición. Al medirlo apareció un tercer fallo, latente: la fecha se guarda a **medianoche UTC** y `/compare` la renderizaba en hora local, **mostrando el día anterior** (29/9/1997) para cualquiera al oeste de Greenwich. Los tres pasan ahora por `src/lib/driver-age.ts`, con tests del día del cumpleaños, del 29 de febrero y de la zona horaria.

**Dos decisiones delegadas por el usuario**: `TelemetryComparison.tsx` **no se migra** —es código muerto que ninguna página importa y que debe morir en la limpieza, no repintarse—, y el `COMPOUND_COLORS` duplicado de `LapTimesTable` **sí se centraliza**, porque no era solo duplicación: el mapa local usaba colores de Tailwind y el central tiene los valores Pirelli exactos. Al centralizarlo salió otro dato invisible: el compuesto HARD es `#F0F0EC`, un punto casi blanco sobre tarjeta blanca (**1,14:1**); lleva anillo, y el nombre del compuesto en `sr-only` porque el color era su única codificación.

**Verificación, y la lección de la sesión.** Build reproduciendo el CI **sin base de datos**; recorrido real en navegador **midiendo el color computado**, no a ojo; 52 tests unitarios, las 8 pruebas de navegador, y una pasada en tema oscuro para comprobar que no había regresión (las líneas siguen usando exactamente los valores `onDark`). **El navegador desmintió una suposición propia**: `onLight` se derivó contra blanco puro, pero el gráfico se dibuja sobre `--background` (`#F7F7F8`), que es más oscuro; McLaren pasaba el umbral en el cálculo (3,08) y lo fallaba en la página real (**2,88**). Retocado el suelo de referencia al que la app usa de verdad. Es el mismo patrón que el servidor viejo en el puerto: el cálculo era correcto, el entorno contra el que se medía no era el real.

**Detectado y no abordado** (queda anotado, no desaparece): el token `--live` no cumple sobre su propio tinte (3,48:1), y `text-primary` sobre `bg-primary/20` da 3,75:1 en los badges de dorsal y posición. Ninguno es de timing; no se tocan sin decisión.

### 2026-08-18 (4) — El cron, probado; y Next 16.3.1 por una vulnerabilidad crítica ✅

**El cron se ejecutó por primera vez y terminó en éxito**, lanzado a mano desde Actions: sembró la temporada 2026 completa (calendario, resultados, clasificación y sprints) y después calentó el caché de telemetría de la última carrera. Con esto queda cerrado lo último que faltaba del Sprint 5.

**Y su log traíia, casi de pasada, `16 vulnerabilities … 1 critical`.** La crítica era de **Next.js**: la 16.0.3 que corría en producción está afectada por *RCE in React flight protocol* —ejecución remota de código—, además de una lista larga de denegaciones de servicio, *bypass* de middleware y envenenamiento de caché. Actualizado a **16.3.1**, dentro de la misma versión mayor: la crítica desaparece y los avisos bajan de 16 a 13; los que quedan son herramientas de construcción y desarrollo, mucho menos expuestas.

Conviene distinguirlo de la contraseña de Supabase que se decidió no rotar: allí el peor caso era que alguien leyera datos públicos de Fórmula 1; aquí, que alguien ejecutara código en el VPS donde viven otros aplicativos.

**Verificado con la versión nueva**: lint sin errores, tipos limpios, 36 tests unitarios y **las ocho pruebas de navegador**.

**Pendiente menor**, detectado en el mismo log: GitHub está retirando Node 20 de sus acciones y `actions/checkout@v4` y `setup-node@v4` todavía lo usan. Hoy solo avisa, pero conviene subirlas a la v5.

### 2026-08-18 (3) — Accesibilidad, y por fin un navegador de verdad ✅

**Playwright, ocho pruebas** contra el servidor de producción local (`npm run test:e2e`). Existen por lo que originó este sprint: lint, tipos y build **no pueden ver un hueco de comportamiento**, y hasta hoy toda la verificación del proyecto era eso. Cada prueba cita el hallazgo del informe que cubre, para que se sepa qué defiende.

**Prioridad 1 del informe 2, reducir movimiento.** No había **ni un solo** soporte de `prefers-reduced-motion` en el proyecto, con framer-motion animando en seis componentes: cada navegación desplazaba la página entera y las listas entraban en cascada, sin escape posible para quien sufre trastorno vestibular. Resuelto en dos frentes: `MotionProvider` con `MotionConfig reducedMotion=“user”` para todo lo de framer-motion, y un bloque `@media (prefers-reduced-motion: reduce)` para lo escrito en CSS.

**Prioridad 2, el foco de teclado.** Diez controles tenían el anillo al 20 % de alfa —1,2:1 de contraste, invisible— o directamente `focus:outline-none` sin sustituto. Todos pasan al patrón de `button.tsx`, que ya lo hacía bien.

**Prioridad 3, el zoom.** `maximumScale: 1` y `userScalable: false` salían del `viewport`: incumplían WCAG 1.4.4 y no hacían falta, porque el zoom al enfocar un campo ya se evita dando 16 px a inputs y selects.

**Punto 7, nombres accesibles.** Los cuatro `<select>` de `/analysis` se atan a su etiqueta con `htmlFor`/`id` —VoiceOver los anunciaba como “menú emergente”, sin decir de qué— y suben a 16 px en móvil.

**Y las pruebas se pagaron solas el mismo día en que se escribieron, con dos fallos reales:**

1. **La media query de `prefers-reduced-motion` no llegaba al CSS servido.** Estaba dentro de `@layer base` y Tailwind no la emitía: la regla sencillamente no existía. El código fuente parecía correcto, así que sin navegador se habría dado por hecha — exactamente el patrón de omisión que este sprint persigue.
2. **La caché de `/compare` lanzaba un `unhandledRejection`** al serializar `Result.milliseconds`, que es un `BigInt` y JSON no sabe representar. Lo había introducido ese mismo día al añadir `unstable_cache`, y afectaba a un campo que esa pantalla ni siquiera usa.

Y una suposición propia desmentida: **`MotionConfig` global no basta para `PageTransition`**. Se dio por bueno, la prueba lo negó mostrando que la página seguía desplazándose, y hubo que anular el salto explícitamente con `useReducedMotion`.

**Verificación**: ocho pruebas en verde en tres tandas seguidas, una de ellas desde caché fría tras reconstruir, más tipos limpios, lint sin errores y los 36 tests unitarios.

**Queda abierto**: las pruebas de navegador **no corren en CI**, porque el CI construye sin base de datos a propósito. Con el secret que ya existe para el cron sería viable; está anotado como decisión pendiente, sin tomar.

### 2026-08-18 (2) — Sprint 6: retroalimentación al navegar 🟡

Los seis puntos del “Orden de ataque sugerido” del informe 1, uno a uno.

**1. El selector de temporada** pasa a `useTransition` con `useOptimistic`: al elegir un año, el desplegable muestra ya el elegido en vez de revertir visiblemente al anterior, se deshabilita y aparece un indicador. Arregla las cinco páginas que lo usan de una sola edición. La navegación es solo de query dentro del mismo segmento, así que no era fiable que el `loading.tsx` de la ruta volviera a mostrarse: el aviso tenía que salir del propio componente.

**2. Los seis `loading.tsx`** que faltaban, con el esqueleto **espejando la página real** — la auditoría había señalado que los existentes no se parecían a su página y producían un salto visual al resolverse. Cada uno anuncia además la carga a los lectores de pantalla, que hasta ahora no se enteraban de nada.

**3. Un paréntesis en `/compare`**: `!driver1 || !driver2 && (...)` se agrupaba como `!driver1 || (!driver2 && jsx)`, así que el mensaje “Selecciona dos pilotos” no aparecía nunca al entrar.

**4. Favoritos deja de mentir dos veces.** Las rutas de API aceptan ahora `?ids=`, así que la página pide exactamente los favoritos guardados en lugar de traer los 50 primeros por orden alfabético y filtrarlos en el cliente: con 84 pilotos en la base, Verstappen o Zhou eran **inalcanzables desde Favoritos**. Y un fallo de red ya no se disfraza de “No hay favoritos”: hay aviso con reintento, y el estado de carga son tarjetas esqueleto en vez de texto centrado.

**5. Caché de una hora — de los datos, no de las páginas.** El primer intento fue declarar `revalidate` en `/circuits`, `/analysis` y `/compare`, y **tumbó el CI**: al marcarlas como estáticas, Next las prerenderiza durante el build, y el build se ejecuta a propósito **sin base de datos**. `/analysis` reventó el prerenderizado y las otras dos se habrían horneado con su contenido de reserva. La forma correcta es dejar la página dinámica y envolver la consulta en `unstable_cache`: Supabase recibe una consulta por hora en vez de una por visita, y el build no toca la base. Efecto colateral bueno: **`/compare` deja de ser estática**, que era justo el defecto señalado por la auditoría —quedarse congelada en el Full Route Cache—. Las fichas de carrera, de equipo y de piloto sí llevan `revalidate`: son rutas con parámetro y no se prerenderizan en el build. `/favorites` se deja estática a propósito, porque es un armazón que carga en cliente. Y las páginas con `?season=` no se tocan: son dinámicas por definición.

**La segunda lección del día, encadenada con la anterior**: el build local pasaba porque esta máquina **sí** tiene base de datos. Reproducir el CI exige construir con sus mismas credenciales falsas, y así fue como se localizó el fallo en un intento en vez de a ciegas. Dos veces en la misma sesión, verificar en un entorno que no era el real dio un resultado que no valía.

**6. La home transmite el campeonato aparte**, en un `<Suspense>`: la próxima carrera ya no espera por dos o tres viajes más a la base de datos. **La otra mitad de este punto, los `<Suspense>` de la ficha de piloto (5 consultas secuenciales), no está hecha** y es lo primero de la próxima sesión.

**Una lección de verificación, porque estuvo a punto de colarse.** Las primeras mediciones dieron dos falsos negativos —el campeonato “no se transmitía” y `?ids=` “se ignoraba”— y ambos eran mentira: **el servidor local anterior seguía escuchando en el puerto**, así que se estaba midiendo el build viejo. Se descubrió porque el arranque del servidor nuevo falló con `EADDRINUSE`. Verificar contra un proceso vivo obliga a comprobar que es el proceso que uno cree.

**Sigue sin verificarse en un navegador** lo que solo se ve pulsando: el indicador del selector en movimiento, el foco de teclado y las animaciones. No hay Playwright instalado y no se instaló sin decisión previa. Es justo el hueco que originó este sprint.

### 2026-08-18 — Telemetría en producción, cron de datos y un fallo de concurrencia ✅

**El servicio de telemetría ya sirve datos reales.** Desplegado en EasyPanel como app aparte (`apexdata-telemetry`, proyecto `ditto`), con volumen en `/app/cache` y **sin dominio público**: solo accesible por la red interna, porque la web le habla de servidor a servidor y exponerlo únicamente añadiría superficie de ataque sobre un servicio que todavía no tiene *rate limiting*. Verificado de punta a punta contra producción: Leclerc 1:29.165 y Verstappen 1:29.179 en la Q de Bahréin 2024. La primera llamada tardó 36 s y la segunda 78 ms — el volumen cumple exactamente su función.

**La guía estaba equivocada justo en el punto que más importaba.** `DEPLOY.md` mandaba construir con la ruta `./python-service/Dockerfile` desde la raíz, y eso no puede funcionar: el Dockerfile del servicio hace `COPY requirements.txt .`, así que su contexto tiene que ser esa carpeta, y además el `.dockerignore` de la raíz excluye `python-service` entero. Lo correcto es **Build Path `/python-service`** con File `/Dockerfile`. Se detectó leyendo el Dockerfile *antes* de tocar el panel, así que no costó ni un intento fallido: es la lección de la sesión anterior —leer el Dockerfile de plastik habría ahorrado tres intentos— aplicada esta vez a tiempo.

**Un fallo real de producción, encontrado al abrir la consola del contenedor**: `P2024 Timed out fetching a new connection from the connection pool (connection limit: 1)`, repetido, sobre `prisma.race.findUnique()`. La causa era `connection_limit=1`, un valor heredado del plan cuando el destino era Vercel: en serverless cada invocación es un proceso aparte y una conexión por proceso es lo correcto, pero aquí hay **un contenedor permanente** atendiendo a todos los visitantes, y las peticiones concurrentes se encolaban hasta morir a los 10 segundos con la pantalla de “Algo salió mal” en las fichas de carrera. Subido a 5 y verificado con seis peticiones simultáneas: las seis en 200, ningún `P2024`. No podía detectarse en local ni en CI; solo aparece con concurrencia real.

**Cutover del CI: resuelto.** La instrumentación añadida el día anterior cumplió su función y las dos últimas ejecuciones del job de despliegue terminan en verde.

**Cron semanal de datos** (`.github/workflows/data-refresh.yml`): los lunes a las 06:00 UTC siembra la temporada en curso y calienta el caché de telemetría de la última carrera; de paso, esa escritura semanal evita que Supabase vuelva a pausar el proyecto. Tres decisiones que conviene recordar: el año se **deriva** (`date -u +%Y`), porque uno fijo seguiría sembrando en enero una temporada terminada; el caché se calienta **a través de las rutas proxy de la web**, no llamando al servicio, porque este ya no es accesible desde internet; y el calentamiento es *best effort*, para que su lentitud no invalide el sembrado. Validado antes de commitear: YAML, sintaxis bash de los cuatro bloques, la rama de “secrets ausentes”, la extracción de temporada y ronda contra `/api/standings/current` (2026, ronda 11) y el paso completo ejecutado contra producción.

**Aviso de seguridad de Supabase, atendido el mismo día.** Llegó un correo marcando las tablas como *publicly accessible* por no tener Row Level Security. Comprobado con una consulta directa: **las 11 tablas sin RLS y sin una sola política**. La exposición real era menor de lo que sugiere el aviso —ninguna clave JWT del proyecto ha estado nunca en el repositorio (`git log -S'eyJ'` no devuelve nada) y la app no usa el cliente de Supabase, solo Prisma con usuario y contraseña—, pero en el modelo de Supabase la clave anónima **está pensada para ser pública**: que no se haya filtrado es suerte, no diseño. Resuelto con la migración `20260818153000_enable_rls`, versionada en lugar de aplicada a mano en el panel, para que se reproduzca sola en cada despliegue.

**El riesgo de esa migración era silencioso, así que se ensayó antes.** Si el rol de la app no fuera propietario de las tablas, activar RLS devolvería **cero filas sin ningún error** y la web quedaría vacía sin que nada lo delatara en los logs. Se ejecutaron las diez sentencias contra la base de datos real **dentro de una transacción revertida**: la app sigue leyendo (84 pilotos, 352 carreras, 7.113 resultados) y el rol `postgres` tiene `bypassrls`. `_prisma_migrations` se deja fuera a propósito: el contenedor arranca con `migrate deploy && node server.js`, así que un problema de permisos en esa tabla impediría arrancar la app entera, y a cambio solo protegenía nombres y checksums de migraciones. Queda el script `npm run db:rls` para auditar el estado cuando haga falta.

**Contraste con el alcance original del Sprint 5**, que es el método que exigió la auditoría de veracidad: hechos el despliegue de ambas apps, el cutover y el cron semanal. **Se recortan explícitamente** el push post-GP, la pantalla de administración y el resto del checklist de seguridad —el RLS sí se hizo, empujado por el aviso—, y quedan registrados arriba como deuda con su motivo. No desaparecen sin dejar rastro, que era justo el fallo diagnosticado.

### 2026-08-17 (5) — Auditoría triple de experiencia de uso 🔍

A raíz del hallazgo de los estados de carga, el usuario pidió auditar el proyecto con agentes expertos en busca de más omisiones del mismo tipo. Tres agentes en paralelo: **retroalimentación al usuario**, **accesibilidad/móvil contra las reglas del propio plan**, y **veracidad de la documentación** (contrastó lo declarado contra el código y la BD reales — los conteos declarados son exactos y los 36 tests pasan).

**Los tres informes íntegros están en `docs/AUDITORIA_UX_2026-08-17.md`** (guardados en el repo precisamente para poder trabajar desde cualquier máquina sin el contexto de la conversación). El alcance consolidado y priorizado, en la sección **"S6 — alcance completo"** del plan de referencia.

Diagnóstico transversal: **la infraestructura de diseño se construyó bien, pero las páginas no la consumen** (tokens sin usar, componentes modelo que el resto no imita). Y una segunda corrección de método: la documentación es veraz en lo que afirma pero incompleta en lo que omite — 9 promesas del plan desaparecieron sin quedar registradas como deuda, y eso solo lo detecta **contrastar el cierre de cada sprint contra su lista de alcance original**, que desde ahora es parte del cierre junto con el recorrido real de la app.

También del usuario, mismo día: mostrar la **fecha de nacimiento** de los pilotos junto a la edad (ya está en BD; `/compare` ya la muestra). Al verificarlo se encontró que el cálculo de edad es `año − año`: todo piloto que no ha cumplido aparece un año más viejo. Ambos en S6.

### 2026-08-17 (4) — La web, en producción 🟡

**ApexData está publicada en https://apexdata.meeks.fun**, servida desde el VPS vía EasyPanel, con HTTPS y consultando Supabase (`/api/health` responde `database: ok`). Queda pendiente el servicio de telemetría.

**Dominio propio.** El usuario descartó `apexdata.izistoreperu.com`: el dominio es de la empresa donde trabaja y la app es suya. Tampoco quiso pagar por uno. Se revisó qué opciones gratuitas existen (subdominios de terceros tipo `is-a.dev`, `eu.org`, DuckDNS) y se aclaró que Cloudflare no regala dominios: solo gestiona zonas que ya poseas. Finalmente **compró `meeks.fun` en Hostinger**, lo delegó a Cloudflare y creó `apexdata.meeks.fun` → `161.132.4.18`, **con el proxy desactivado (nube gris)**, sin lo cual Let's Encrypt no puede validar el dominio.

**Cinco fallos encadenados antes de que arrancara.** El `Dockerfile` se había escrito el día anterior copiando el patrón de plastik, pero **nunca se había construido**. Cada intento destapó el siguiente:

1. `prisma migrate deploy` salía por el pooler y **se colgaba sin error**. Causa: el `datasource` de `prisma.config.ts` tiene precedencia sobre el schema y **descartaba su `directUrl`**, añadido en su día justo para esto. Como el arranque es `migrate deploy && node server.js`, el servidor no se habría ejecutado nunca.
2. `prisma generate` moría en el build con `Missing required environment variable`: el helper `env()` resuelve al cargar la config, y en la construcción no hay variables de base de datos. EasyPanel las pasa como *build args*, pero el `Dockerfile` no declara ningún `ARG`.
3. Al arrancar: `Cannot find module 'dotenv/config'`.
4. Y después: `Cannot find module 'prisma/config'`.
5. Ya arrancado, **502**: el contenedor escuchaba en el puerto 80 y el dominio apuntaba al 3000. Faltaba `PORT=3000` entre las variables.

Los fallos 2, 3 y 4 eran **el mismo problema**: `prisma.config.ts` viaja dentro de la salida `standalone`, que solo incluye lo que la aplicación importa, y la CLI lo carga al arrancar exigiendo dependencias de desarrollo que la imagen no lleva. Se resolvió **borrándolo en el runner**, con lo que la CLI cae en `prisma/schema.prisma` — que ya declara `url` (pooler) y `directUrl` (directa). **Es exactamente lo que hace plastik, que no tiene ese archivo.** Leer su Dockerfile antes habría ahorrado tres intentos.

**Despliegue automático a medias.** El *Deployment Trigger* (así se llama en el panel, al final de la pestaña *Deployments*) se guardó como secret. Dos incidencias: se copió por error **el de plastik**, lo que provocó un despliegue no solicitado de esa app — se verificó que quedó sana y que, al no haber cambios en su código, un despliegue equivale a un reinicio. Y la comprobación de cutover **falla sin explicar por qué**: repite `no response yet` treinta veces aunque `/api/health` responda 200 desde fuera. Descartados por comprobación directa: la variable `APP_URL` (correcta, con `https`), la barra final, y el certificado (cadena completa, `Verify return code: 0`). **El paso mandaba los errores de `curl` a `/dev/null`**, así que se instrumentó para que la próxima ejecución diga la causa real. **Pendiente de resolver.**

**Seguridad**: el *Deployment Trigger* se ofrece como `http://<ip>:3000/...` con el token en claro; se comprobó que el mismo endpoint responde por HTTPS en `panel.dittochatbot.com` y se usa esa forma. Nota aparte: el panel está expuesto sin cifrar en el puerto 3000 del VPS.

**`DEPLOY.md` reescrito** con lo aprendido: casi todos sus pasos del panel eran inexactos (nombre del webhook, pestaña de origen, ruta del Dockerfile, `PORT`), y la tabla de diagnóstico incorpora seis síntomas reales de esta sesión.

**Recursos del VPS**: 6,6 GB de 15,3 GB en uso y 30,9 GB de 298,9 GB de disco. El tope de heap de 2048 MB del `Dockerfile` queda muy por debajo de lo disponible; no hubo que tocarlo.

### 2026-08-17 (3) — Revisión de seguridad previa al despliegue ✅

Pasada con la skill `security-review` sobre los cambios de despliegue y los tests. **Un hallazgo real** y dos notas de endurecimiento, todas corregidas:

- **Proxy de imágenes abierto** (`next.config.ts`): `remotePatterns` con `hostname: '**'` aceptaba cualquier host, así que cualquiera podía servir su propia imagen **desde tu dominio** (phishing con tu certificado y tu reputación) y el servidor haría peticiones salientes a hosts elegidos por terceros. Como **ninguna imagen de la app es remota**, se eliminó por completo. Verificado: las locales siguen dando 200 y un host externo devuelve 400.
- **Detalles internos en errores** del servicio Python: los `500` incluían el texto de la excepción, que el proxy de Next reenviaba al cliente y podía revelar rutas del servidor. Ahora se registra en el log y se devuelve un mensaje genérico.
- **Docs de la API** (`/docs`, `/redoc`, `/openapi.json`): visibles en desarrollo, ocultas cuando `ENVIRONMENT=production`. Además CORS pasa a `allow_credentials=False` y solo `GET`, porque el servicio no maneja cookies ni sesiones.

Verificado y descartado por el revisor: inyección SQL (las tres `$queryRaw` son *tagged templates* con parámetros vinculados), secretos versionados (ninguno), inyección de comandos en el workflow, XSS (cero `dangerouslySetInnerHTML`), deserialización, y que `/api/health` no filtra la URL del servicio ni errores de base de datos.

### 2026-08-17 (2) — Tests: la Fase 6 que nunca se empezó ✅

El proyecto tenía **cero tests** y el CI solo verificaba que compilara. Antes de exponerlo a internet con despliegue automático en cada push, se añade la red de seguridad que faltaba — y que en plastik ya bloquea despliegues.

**Vitest, 36 tests** sobre lógica pura (sin BD ni red, así corren en CI en segundos):
- `classifiedPosition` — los seis marcadores de abandono de Jolpica, y el caso que demuestra el bug original: el mismo registro trae `position: "18"` y `positionText: "R"`.
- `raceStart` / `isUpcoming` — que a las 09:00 UTC del domingo la carrera de las 13:00 **sigue siendo futura**, que era exactamente el fallo de la home.
- `aggregateSeasons` — victorias, podios, cambio de equipo a mitad de temporada, orden.
- `compareDuels` — solo cuentan las rondas donde ambos fueron clasificados.
- Colores de equipo (los 11 de 2026 con color propio y distinto), compuestos, y que cada nacionalidad tenga bandera descargada.

**Pytest, 14 tests** sobre la serialización del servicio Python: `NaN` → null, tiempos formateados como `1:29.165` y no como duración ISO, y que el resultado sea codificable con `allow_nan=False` (lo que FastAPI exige de facto).

**Refactor para poder probar**: la lógica delicada sale a `src/lib/results.ts`, un módulo puro que comparten el seeder y la app, así ambos leen un resultado igual.

**Verificación de que los tests sirven**: se reintrodujo el bug original de los abandonos a propósito y **5 tests fallaron de inmediato**; restaurado el código, los 36 vuelven a pasar.

**CI**: `npm test` y `pytest -q` ahora son requisito para que el job de despliegue se ejecute.

### 2026-08-17 — Preparación del despliegue en EasyPanel

El usuario preguntó por qué desplegar en Vercel si el VPS ya estaba decidido, y tenía razón: la recomendación partía de una suposición equivocada. Plastik ya se despliega en ese VPS con `git push` → GitHub Actions → webhook de EasyPanel, y **EasyPanel es un panel web**, así que no hace falta acceso SSH ni estar en una red concreta. Se adopta el mismo patrón para ApexData.

Preparado en el repo (siguiendo el Dockerfile de plastik y sus lecciones documentadas):
- **`Dockerfile`** con `output: 'standalone'` y el tope de heap en 2048 MB, deliberadamente **por debajo** de la RAM del host: ponerlo por encima hace que el OOM killer mate el build sin mensaje, y el síntoma se confunde con otra cosa.
- **`/api/health`** que reporta `buildId` y `startedAt`, para que "¿está mi código en producción?" sea una comparación y no una suposición.
- **Job `deploy` en CI** que dispara el webhook solo si lint, tipos y build pasan, y espera el cutover comparando el arranque del contenedor con la marca de tiempo del push. Documentado el aviso de plastik: **la integración nativa de EasyPanel con GitHub debe quedar desactivada**, o las dos construcciones se cancelan entre sí.
- `.dockerignore` que excluye `python-service` (será una app aparte en EasyPanel).

Pendiente del usuario en el panel: crear las dos apps, configurar variables, obtener el webhook y añadirlo como secret.

### 2026-08-16 (9) — Preparación para despliegue

El usuario no tiene acceso al VPS desde casa, así que se adelanta la parte del Sprint 5 que **no lo necesita**: el frontend en Vercel (Vercel y Supabase son ambos servicios en la nube; el VPS solo aloja el microservicio Python).

- **`DIRECT_URL`** añadida al datasource de Prisma: el pooler de Supabase no soporta los prepared statements que necesitan las migraciones.
- **La telemetría deja de ser un punto único de fallo**: sin `FASTF1_SERVICE_URL` configurada, el cliente lanza `TelemetryUnavailableError`, las rutas proxy responden **503 con un mensaje legible** y la página de análisis avisa de que esa sección está pendiente. Verificado simulando producción: las 6 páginas responden 200 sin el servicio Python levantado.
- **Encabezados de seguridad** en `next.config.ts` (HSTS, nosniff, Referrer-Policy, Permissions-Policy, `frame-ancestors 'none'`) y `Cache-Control: must-revalidate` en `/sw.js`, para que un service worker cacheado no siga sirviendo la app antigua tras un despliegue.
- `.env.example` reescrito y documentado.
- **Backfill histórico completado**: 2010–2026 con resultados y clasificación.

### 2026-08-16 (8) — Sprint 4: Telemetría 2.0 y perfiles ✅

**Perfil de piloto**: pasa de mostrar 10 resultados sueltos a una ficha completa — carreras, victorias, podios, poles, vueltas rápidas y puntos calculados desde la BD (Hamilton: 298/89/165/81), tabla por temporada con posición final y equipo, y **cara a cara con el compañero** en carrera y clasificación (`src/lib/driver-stats.ts`).

**Gráfico de evolución del campeonato** (`PointsEvolution`): puntos acumulados ronda a ronda de los cinco primeros, con crosshair y lectura fuera del área de trazado para que el dedo no tape el dato. El color sigue al equipo, no al puesto, y el segundo compañero va con línea discontinua — la convención de F1 que resuelve que dos pilotos compartan color.

**Telemetría en canvas** (`TelemetryChart`): sustituye los SVG hechos a mano. Velocidad, acelerador y freno apilados con **un solo crosshair compartido**, para leer los tres canales en el mismo punto de la pista. Canvas porque una vuelta son miles de muestras por canal, muy por encima de lo que SVG repinta con fluidez en un móvil.

**Fin de los datos hardcodeados**: `/analysis` se divide en shell de servidor + cliente, y los selectores salen de la base de datos (sesiones desde 2018, que es donde empieza FastF1, y la parrilla de la última carrera) en vez de las 5 sesiones y los 20 pilotos de 2024 escritos a mano.

**Tres bugs del servicio Python, encontrados al probarlo de verdad**:
- La telemetría contiene `NaN` legítimos (p. ej. distancia al coche de delante cuando vas líder), que **no son JSON válido**: la respuesta moría con 500. Resuelto con `app/utils/serialization.py`.
- El caché guardaba la respuesta **antes** de que fallara la serialización, así que devolvía el error una y otra vez hasta borrar el archivo. Ahora valida antes de guardar.
- Los tiempos salían como duraciones ISO (`P0DT0H1M29.165S`) en lugar de `1:29.165`.

Con esto **la comparación de pilotos funciona por primera vez**: Verstappen 1:29.179 vs Leclerc 1:29.165 en Bahréin 2024, delta 0.014.

**Correcciones de la revisión de código** (5 hallazgos): el guardián del caché rechazaba de más y habría desactivado el caché de dos endpoints (30s–2min por petición); la evolución se indexaba por posición en vez de por ronda, desplazando la línea de un piloto que se incorpore a mitad de temporada; `/analysis` reventaba con la lista de sesiones vacía; y las estadísticas por temporada dependían de un orden no garantizado.

**Verificación**: lint 0 errores · type-check limpio · build correcto · servicio Python levantado y probado de punta a punta (telemetría, comparación y vueltas rápidas, también a través del proxy de Next).

### 2026-08-16 (7) — Corrección de identidad: vuelve el verde

El rediseño había sustituido el verde lima original por rojo F1. Revisada la decisión con el usuario, se restaura el verde, que además era la opción correcta técnicamente:
- El rojo **choca con Ferrari**: el mismo color significaría marca de la app y equipo.
- El rojo tampoco podía ser el estado "en vivo" si ya era la marca; ahora `--live` es rojo en exclusiva.
- **Contraste**: `#CCFF00` sobre carbon da 16.7:1 (nivel AAA) frente a ~4:1 del rojo, que obligaba a inventar una variante clara solo para textos.
- Ningún equipo de 2026 usa verde lima, así que es un color que la app puede hacer suyo.

Detalle importante: en **modo claro** el lima como tinta sobre blanco solo alcanza 2:1, así que ese tema usa `hsl(72 100% 24%)` (4.9:1, mismo tono reconocible). Verificado con cálculo de contraste real y comprobado en el CSS servido. El icono de la app también pasa a verde.

### 2026-08-16 (6) — Sprint 3: Rediseño visual ✅

**Sistema de diseño**: paleta carbon (`#0B0B0F`) con el **verde lima `#CCFF00` como acento de ApexData** y el rojo F1 reservado al estado en vivo; tokens semánticos de timing (morado vuelta rápida, verde mejor personal, amarillo más lento — la convención de broadcast) con valores distintos por tema para mantener contraste. Todo pasa por variables CSS, así que el modo claro y oscuro se derivan del mismo sistema.

**Tipografía**: fuera Orbitron. Ahora **Chakra Petch** para titulares (carácter motorsport sin el cliché sci-fi), **Inter** para interfaz y **JetBrains Mono** para tiempos de vuelta.

**Colores de equipo** (`src/lib/team-colors.ts`): los 11 equipos de 2026 más las identidades históricas, cada uno con su color de identidad y una variante legible sobre fondo oscuro. Se usan como **barra vertical** en las filas de timing, nunca como tinta — por eso funcionan el negro de Mercedes o el blanco de Haas. Incluye los colores de compuesto de FastF1.

**Componentes nuevos**: `Card` (cada página reimplementaba el mismo borde y fondo), `TimingRow` (fila de torre de tiempos con barra de equipo, posición y valor) y `CountryFlag`.

**Race Hub**: la home deja de ser una landing de marketing y pasa a mostrar la próxima carrera con cuenta atrás en tu zona horaria, los horarios del fin de semana, el trazado del circuito, el podio de la última carrera y el top 5 de ambos campeonatos.

**Página de circuitos**: sección nueva con los 36 trazados descargados, contador de carreras e historial.

**Renombrado `Constructor` → `Team`**: la colisión con `Object.prototype.constructor` que arrastrábamos desde el S0 queda eliminada de raíz. El modelo mantiene `@@map("constructors")`, así que la base de datos no cambió; se actualizaron 22 archivos y desapareció el workaround de `src/lib/prisma.ts`.

**Correcciones de la revisión de código** (8 hallazgos):
- La home se habría **congelado en el momento del build** (sin `dynamic`), dejando la "próxima carrera" fija hasta el siguiente despliegue.
- `Race.date` se guarda a medianoche UTC y la hora real vive en `Race.time`: la carrera se anunciaba con un día de antelación y la cuenta atrás expiraba ~15h antes. Resuelto con `src/lib/race-time.ts`.
- Las fechas mostraban guiones en el HTML servido hasta la hidratación (y en la copia offline); ahora se renderiza UTC en servidor y se ajusta a la zona local en cliente.
- La navegación de escritorio con 11 enlaces desbordaba en iPad; ahora `site.ts` es la única fuente de verdad y solo los principales van en la barra.
- Consultas más ligeras en circuitos (`_count` en vez de traer 1.100 filas) y en el equipo actual de cada piloto.

**Verificación**: lint 0 errores · type-check limpio · build correcto · páginas comprobadas en la app real (home, circuitos, equipos, detalle de equipo, clasificación, resultados históricos y ficha de piloto).

### 2026-08-16 (5) — Sprint 2: PWA para iOS ✅

**Instalable y con identidad propia**:
- Icono maestro `public/icon.svg` (la línea de trazada por el apex con la traza de telemetría) y `scripts/pwa/generate-icons.ts`, que rasteriza los PNG del manifest, el `apple-touch-icon` **opaco** (iOS rechaza transparencia) y **13 splash screens** de Apple con su media query exacta por dispositivo — el hueco de mayor severidad que la auditoría de plastik dejó documentado.
- `manifest.webmanifest` con `id`, modo standalone, colores carbon y accesos directos a Calendario, Clasificación y Resultados.

**Comportamiento nativo**:
- **Barra de pestañas inferior** (`MobileTabBar`) con blur, safe area para el home indicator y objetivos táctiles de 44px. Es la navegación principal en móvil, imprescindible porque en modo standalone no hay botón atrás del navegador.
- Cabecera con safe area para la Dynamic Island; `overscroll-behavior-y: none` para eliminar el rebote de página; sin resaltado gris al tocar; inputs y selects a 16px para evitar el zoom automático de iOS.
- `ThemeColorSync`: la barra de estado sigue el tema de la app y no el del sistema.

**Service worker** (`public/sw.js`, artesanal, sin librerías): estáticos cache-first, imágenes stale-while-revalidate, API siempre en red, navegación network-first con página `/offline` precacheada.
- `PwaRegister` avisa con un botón "Actualizar" cuando hay versión nueva y revisa al volver al foreground — evita quedarse clavado en HTML viejo, el incidente que plastik sufrió dos veces en producción.
- `IosInstallHint`: Safari nunca ofrece botón de instalar, así que se explica la ruta por el menú Compartir.

**Correcciones de la revisión de código** (7 hallazgos, todos reales):
- El selector de `ThemeColorSync` nunca casaba (Next emite el meta sin atributo `media`), dejando el componente inerte.
- El aviso de actualización saltaba en la primera instalación: hay que comprobar en estado `installed`, porque `clients.claim()` ya ha fijado el controlador al llegar a `activated`.
- El footer quedaba debajo de la barra de pestañas, intocable en móvil.
- El service worker no registraba en desarrollo (cacheaba chunks para siempre), `cache.addAll` atómico podía dejar la app sin worker, la revalidación podía cortarse sin `waitUntil`, y con caché fría y red caída devolvía `undefined` (rompe `respondWith`).

**Verificación**: lint 0 errores · type-check limpio · build correcto · comprobado sirviendo la app real: manifest, service worker, iconos, splash y `/offline` responden 200, las etiquetas de iOS están presentes y el `apple-touch-icon` es RGB opaco.

### 2026-08-16 (4) — Sprint 1: Datos e imágenes ✅

**Pipeline de imágenes** (`scripts/images/`, todo autoalojado, nada de hotlinks):
- `drivers.ts` — 29 headshots oficiales vía OpenF1 → media service de F1. Resuelve el roster por sesiones (el endpoint no admite filtro por año) y casa nombres contra la BD con tabla de excepciones.
- `circuits.ts` — 36 trazados SVG: repo CC0 (nombres ya en formato Ergast) con F1DB como respaldo. Incluye **Madrid 2026**.
- `flags.ts` — 36 banderas circulares (MIT). Los mapas nacionalidad/país→ISO viven en `src/lib/countries.ts`, compartidos con el componente `CountryFlag`.
- `logos.ts` — 8 logos vía API de Commons (`imageinfo`) con User-Agent. Faltan 6 marcas no libres (Ferrari, Red Bull, Aston Martin, RB, Cadillac, AlphaTauri) → colocación manual en `public/images/constructors/<constructorId>.svg`.
- `seed-paths.ts` — vincula lo que exista en disco con la BD; limpia rutas huérfanas.

**Datos**:
- **Temporada 2026 cargada**: 23 carreras, 11 con resultados y clasificación, 4 sprints.
- **Seeder unificado** `scripts/seed/season.ts <años...>`: sustituye 10 archivos casi idénticos (uno por temporada y tipo). Añade User-Agent (Jolpica devuelve 403 sin él), control de ritmo con reintento ante 429, y rellena por fin las fechas de FP/quali/sprint que el schema tenía vacías.
- **Standings oficiales** (`scripts/seed/standings.ts`): nuevo modelo `DriverStanding` + `ConstructorStanding` poblados desde Jolpica. La página `/standings` ya no recalcula toda la temporada en memoria (además resolvía mal los desempates).

**Correcciones de modelo**:
- `permanentNumber` y `code` dejan de ser únicos: el **#1 pasa al campeón** cada año (Norris lo lleva en 2026) y los códigos se reutilizan entre épocas. Rompía el seed de 2026.
- `position` en standings pasa a nullable: los pilotos sin clasificar llegan como `positionText: "-"`.

**Interfaz**: fotos reales en la ficha de piloto (antes un icono genérico), banderas en tarjetas de piloto y calendario.

**Limpieza**: eliminados 16 scripts obsoletos (10 seeds por temporada + 6 de imágenes), `public/drivers/` con las 20 fotos manuales de diciembre y sus 3 documentos de instrucciones.

**Verificación**: lint 0 errores · type-check limpio · build correcto.

### 2026-08-16 (3) — Sprint 0: Saneamiento ✅
**Acción del usuario**: rotó la contraseña de la base de datos en Supabase (la anterior estuvo expuesta en el historial de git desde noviembre). Antes hubo que restaurar el proyecto, que Supabase había pausado por inactividad.

**Correcciones aplicadas**:
- `.env` actualizado con la nueva contraseña; conexión verificada (6 temporadas, 28 pilotos, 12 equipos intactos).
- **Bug DNF corregido** en los 6 seeds (results y sprint de 2023/2024/2025): ahora se evalúa `positionText` (que trae 'R'/'D'/'W'...) en vez de `position`. Además se creó `scripts/fix-dnf-positions.ts`, que **reparó 174 filas ya guardadas** (150 results + 24 sprint_results). Verificado: todas las carreras tienen exactamente un ganador.
- **Servicio Python**: `/compare` movido antes de `/{driver}` (Starlette lo capturaba como un piloto llamado "compare"); corregido el uso de `pick_fastest()`, que devuelve una vuelta y se estaba indexando con `.iloc[0]` (tomaba el primer valor de columna) — esto rompía la comparación aunque se arreglara el orden; prints de debug eliminados; los 404 ya no se convierten en 500; `fastf1>=3.8.0` (soporte 2026).
- **Nueva página `/constructors/[constructorId]`**: los enlaces desde 4 sitios daban 404. Incluye victorias, podios, puntos, pilotos e historial de resultados.
- **Configs duplicadas**: eliminados `tailwind.config.js` y `postcss.config.js`. El `.ts` superviviente hardcodeaba colores (habría roto el dark mode), así que ahora resuelve todo con `hsl(var(--token))` y se añadieron a `globals.css` las variables que faltaban (`--card`, `--popover`, `--destructive`, `--secondary`) en ambos temas.
- **Colisión `SessionType`** resuelta: el enum de `common.ts` pasa a llamarse `SessionName`.
- **ESLint migrado a flat config** (`eslint.config.mjs`): `next lint` ya no existe en Next 16, así que el CI habría fallado siempre. `npm run lint` → `eslint .`; los 4 errores existentes corregidos.
- `prisma/seed.ts` con import arreglado; singleton de Prisma en `/standings`; `error.tsx` y `not-found.tsx` globales; página `/test` de debug eliminada; `src/config/site.ts` con las rutas reales; scripts npm `seed:*` con el orden correcto documentado.
- **`/telemetry` blindada**: reventaba el build cuando OpenF1 no devuelve sesión (pausa entre carreras).
- **CI** (`.github/workflows/ci.yml`): lint + type-check + build para la web, e import smoke test para el servicio Python.

**Verificación**: lint 0 errores · type-check limpio (primera vez en el proyecto) · build correcto con las 23 rutas.

*Nota de método*: se usó la skill `code-review` sobre el diff completo, que detectó 5 problemas reales — incluidos el bug de `pick_fastest()`, que `next lint` ya no existe, y que borrar `tailwind.config.js` rompía el dark mode. Todos corregidos antes de commitear.

### 2026-08-16 (2) — Ajustes al plan
- Renombrado `PROGRESO.md` → `PROGRESO_RELANZAMIENTO_2026.md` para vincularlo explícitamente al plan de referencia.
- Aclarado el modelo de costes: Jolpica (API de datos históricos) y FastF1 (librería de telemetría) son ambos gratuitos; el único gasto era el hosting del servidor Python. Decidido: se usará el VPS propio del usuario → coste total $0/mes.

### 2026-08-16 — Auditoría y plan de relanzamiento
- Auditoría multiagente completa del repo: frontend, capa de datos, servicio Python, historia del proyecto.
- Investigación: ecosistema F1 2026 (Jolpica vivo, FastF1 3.8.x, parrilla de 11 equipos), PWA iOS 26, patrones PWA de plastik, diseño/UX, fuentes verificadas de imágenes (misterio de los 403 de Wikimedia resuelto: faltaba header User-Agent), deployment y seguridad.
- Plan de relanzamiento en 6 sprints documentado en `AUDITORIA_Y_PLAN_RELANZAMIENTO_2026.md` y como artifact visual: https://claude.ai/code/artifact/cd85e848-c8ea-465b-bd14-0a5f48603e50
- Commits: `efb0843` (trabajo WIP de imágenes de dic-2025 que estaba sin commitear), `4238f8c` (documento de auditoría y plan). Pusheados a `origin/main`.
- Creado este documento de progreso y acordadas las reglas de trabajo.

### 2025-12-28 — (histórico) Último trabajo antes de la pausa
- Commits `dee09b9` (servicio Python FastF1) y `20eb8af` (saneo de credenciales). Por la tarde: sprint de imágenes que quedó incompleto y sin commitear (recuperado el 2026-08-16 en `efb0843`).
