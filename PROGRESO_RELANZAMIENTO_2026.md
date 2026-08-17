# ApexData — Progreso del Relanzamiento 2026

> **Documento vivo del plan definido en `AUDITORIA_Y_PLAN_RELANZAMIENTO_2026.md`.** Se actualiza con cada cambio, por mínimo que sea.
> Si estás retomando el trabajo desde cualquier máquina (casa u oficina), este archivo + el plan de referencia contienen TODO el contexto necesario. Instrucción para Claude: leer ambos documentos completos antes de tocar código.

---

## Reglas de trabajo acordadas

1. **Este documento se actualiza siempre**: cada sesión de trabajo termina con una entrada en la bitácora y el estado actualizado, y se commitea/pushea para que esté disponible desde cualquier lugar.
2. **Acciones del usuario (Frank)**: cuando algo requiera acción manual suya, se indica con máximo detalle, sin asumir conocimientos ni pasos previos. Si son varios pasos: primero un resumen corto de qué se va a hacer, y después SIEMPRE paso a paso, uno por uno, esperando confirmación antes de seguir, para evitar errores y estancamientos.
3. **Herramientas**: se usan agentes especializados por ámbito, skills de Claude Code (dataviz, code-review, security-review), e investigación en internet cuando haga falta.
4. **Cada sprint cierra con la app corriendo y verificada**, no con promesas.

---

## Estado actual

**Fase**: ✅ **Sprint 3 completado** (2026-08-16) · Sprints 0, 1 y 2 completados (2026-08-16).

**Cobertura de datos**: resultados y clasificación de **2015–2026**; standings oficiales de 2023–2026. Backfill de 2010–2014 y standings de 2015–2022 pendientes de ejecutar (`npm run seed:season -- <años>` y `npm run seed:standings -- <años>`).

**Imágenes**: 29 fotos de pilotos, 36 trazados de circuitos, 36 banderas y 8 logos de equipo, todo autoalojado en `public/images/` y vinculado en la BD.

**El repo está verde**: `npm run lint` (0 errores), `npm run type-check` (limpio por primera vez en el proyecto) y `npm run build` pasan. CI configurado en GitHub Actions.

**PWA**: instalable en iOS con icono propio, splash nativa, barra de pestañas inferior, modo offline y aviso de actualización.

**Próximo paso**: **Sprint 4 — Telemetría 2.0 y perfiles** (crosshair táctil en canvas, mapa del circuito por velocidad, estrategia de neumáticos, perfil de piloto con stats reales y head-to-head, standings con evolución).

### Deuda técnica conocida (documentada, no bloqueante)
- ~~Colisión del modelo `Constructor`~~ → **resuelto en S3**: el modelo se llama `Team` (con `@@map("constructors")`, sin tocar la BD) y el workaround de `src/lib/prisma.ts` desapareció.
- La página `/telemetry` (OpenF1) sigue siendo un demo; se fusionará en Telemetría 2.0 (S4).
- El comparador `/compare` calcula stats sobre las últimas 5 carreras (engañoso); se rehace en S4.
- 11 warnings de lint (variables sin usar, algún `any`) — limpieza cosmética pendiente.

**Decisiones tomadas**:
- ✅ **Hosting del microservicio Python: el VPS propio de Frank** (2026-08-16). Frank ya tiene un VPS con varios aplicativos desplegados; el servicio FastF1 (que ya tiene Dockerfile) se despliega ahí en S5. Esto elimina el único coste previsto (~$5/mes de Railway) → **coste total del proyecto: $0/mes**. Pendiente de recabar en S5: proveedor/SO del VPS, RAM/disco disponibles, si usa Docker y qué reverse proxy (Nginx/Caddy/Traefik) sirve los demás aplicativos.

**Decisiones pendientes**:
- [ ] **Cuánto histórico cargar**. Hoy: 2023–2026. El seeder acepta cualquier año a ~10 min por temporada, desatendido. Desde 2000 ≈ 5 h; desde 1950 ≈ 15 h. El tamaño no es problema (todo el histórico ronda 20–40 MB frente a los 500 MB del plan gratuito de Supabase). Recomendación: lanzar 1950–2022 en segundo plano cuando convenga.
- [ ] Dominio propio vs subdominio de Vercel (se decide en S5).

---

## Acciones pendientes de Frank

1. **6 logos de equipo** que no están en fuentes libres (son marcas registradas): Ferrari, Red Bull, Aston Martin, RB, Cadillac y AlphaTauri. Descargar el SVG de cada uno (Brandfetch, seeklogo o la web oficial) y guardarlo como `public/images/constructors/<constructorId>.svg` — exactamente: `ferrari.svg`, `red_bull.svg`, `aston_martin.svg`, `rb.svg`, `cadillac.svg`, `alphatauri.svg`. Después ejecutar `npm run images:link`. Sin esto, esos equipos muestran sus iniciales en un recuadro (no se rompe nada).
2. **Decidir cuánto histórico cargar** (ver "Decisiones pendientes").

---

## Bitácora

### 2026-08-16 (7) — Corrección de identidad: vuelve el verde

El rediseño había sustituido el verde lima original por rojo F1. Revisada la decisión con Frank, se restaura el verde, que además era la opción correcta técnicamente:
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
**Acción de Frank**: rotó la contraseña de la base de datos en Supabase (la anterior estuvo expuesta en el historial de git desde noviembre). Antes hubo que restaurar el proyecto, que Supabase había pausado por inactividad.

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
- Aclarado el modelo de costes: Jolpica (API de datos históricos) y FastF1 (librería de telemetría) son ambos gratuitos; el único gasto era el hosting del servidor Python. Decidido: se usará el VPS propio de Frank → coste total $0/mes.

### 2026-08-16 — Auditoría y plan de relanzamiento
- Auditoría multiagente completa del repo: frontend, capa de datos, servicio Python, historia del proyecto.
- Investigación: ecosistema F1 2026 (Jolpica vivo, FastF1 3.8.x, parrilla de 11 equipos), PWA iOS 26, patrones PWA de plastik, diseño/UX, fuentes verificadas de imágenes (misterio de los 403 de Wikimedia resuelto: faltaba header User-Agent), deployment y seguridad.
- Plan de relanzamiento en 6 sprints documentado en `AUDITORIA_Y_PLAN_RELANZAMIENTO_2026.md` y como artifact visual: https://claude.ai/code/artifact/cd85e848-c8ea-465b-bd14-0a5f48603e50
- Commits: `efb0843` (trabajo WIP de imágenes de dic-2025 que estaba sin commitear), `4238f8c` (documento de auditoría y plan). Pusheados a `origin/main`.
- Creado este documento de progreso y acordadas las reglas de trabajo.

### 2025-12-28 — (histórico) Último trabajo antes de la pausa
- Commits `dee09b9` (servicio Python FastF1) y `20eb8af` (saneo de credenciales). Por la tarde: sprint de imágenes que quedó incompleto y sin commitear (recuperado el 2026-08-16 en `efb0843`).
