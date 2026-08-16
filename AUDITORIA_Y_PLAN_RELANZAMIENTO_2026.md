# ApexData — Auditoría completa y Plan de Relanzamiento 2026

> **Fecha**: 15–16 de agosto de 2026
> **Documento visual del plan (artifact)**: https://claude.ai/code/artifact/cd85e848-c8ea-465b-bd14-0a5f48603e50
> **Método**: auditoría multiagente (frontend, capa de datos, servicio Python, historia del proyecto) + investigación en internet (ecosistema F1, PWA iOS, diseño, imágenes, deployment) + análisis del proyecto de referencia `plastik` (`C:\projects\typscript\plastik`).

---

## 1. Qué es ApexData

Plataforma personal de datos y telemetría de Fórmula 1: una mezcla entre el sitio oficial de F1, StatsF1 y f1-tempo, hecha propia. Tres capas de ambición:

1. **Enciclopedia de datos F1** — pilotos, equipos, calendario, resultados, clasificaciones por temporada (datos de la API Jolpica, guardados en BD propia).
2. **Herramienta de análisis técnico** — telemetría real (velocidad, RPM, marchas, freno, DRS), comparación de vueltas, stints y neumáticos, vía microservicio Python con FastF1.
3. **Escaparate visual** — dark mode, animaciones, imágenes reales de pilotos/circuitos/logos.

**Stack**: Next.js 16 (App Router) + React 19 + TypeScript strict + Tailwind + framer-motion · Prisma + Supabase (Postgres) · FastAPI + FastF1 (Python).

**Visión renovada (agosto 2026)**: PWA-first para iOS — la experiencia instalada en iPhone es el criterio de diseño principal, sin perder excelencia en web.

---

## 2. Historia del proyecto

- **37 commits entre 2025-11-17 y 2025-12-28**. Remote: `github.com/mickstmt/ApexData` (sincronizado). Parado ~7,5 meses.
- Fases 0–5 del plan original completadas (setup, BD, API, páginas, animaciones, telemetría OpenF1, comparador, favoritos). Fases 6–7 (testing, deploy) **nunca empezadas**.
- Diciembre 2025: se construyó el microservicio Python FastF1 + página `/analysis` (Sprint 1 del PLAN_ESCALAMIENTO).
- **Abandono**: la tarde del 2025-12-28, a mitad de un "Sprint de imágenes" que pivotó dos veces (Wikimedia con 403 → placeholders ui-avatars → descarga manual). Quedó sin commitear: migración `circuits.imageUrl`, 6 scripts de seed de imágenes, 20 de ~29 fotos de pilotos (3 con nombres rotos: `max_verstappen.jpg.jpg`, `hulkenber.jpg`, `2025mercedesandant01right.jpg`), y `public/logos` y `public/circuits` vacíos.

---

## 3. Estado actual del código (auditoría)

### 3.1 Frontend (~8.700 líneas TS/TSX, 74 archivos)

**Funcional con datos reales**: `/drivers`, `/constructors`, `/calendar`, `/standings`, `/results`, `/results/[year]/[round]` (tabs Carrera y Quali). **Parcial/demo**: `/drivers/[driverId]` (sin stats de carrera), `/telemetry` (OpenF1, "próximamente"), `/analysis` (funciona pero con 5 sesiones y parrilla 2024 hardcodeadas, requiere el servicio Python en localhost:8000), `/compare` (stats engañosas: calcula sobre las últimas 5 carreras), `/favorites` (limitado a los primeros 50 pilotos de la API). **Sobra**: `/test` (página de debug).

**Lo bueno**: TypeScript strict sin `any`, App Router bien usado, `OptimizedImage`/`DriverAvatar` bien diseñados, skeletons, dark mode con tokens, manejo defensivo de errores con banners de fallback.

**Deuda**: configs Tailwind/PostCSS duplicadas en conflicto; enlaces rotos a `/constructors/[id]` desde 4 sitios (la página no existe); colisión de tipos `SessionType` en el barrel; sin `error.tsx`/`not-found.tsx`; sin caché (`revalidate`); código duplicado (búsquedas, selectores); `src/hooks` vacío; `src/config/site.ts` con rutas inexistentes; `jolpica/transformers.ts` muerto; sin tests ni CI.

### 3.2 Capa de datos

- **Schema Prisma sólido**: 9 modelos bien normalizados e indexados (Driver, Constructor, Circuit, Season, Race, Result, Qualifying, SprintResult, ConstructorStanding).
- **Cobertura real: 2023–2025** (resultados, quali, sprints). 2020–2022 solo filas vacías en `seasons`. La doc promete 1950+.
- **Problemas**: `prisma/seed.ts` roto (import a `src/generated/prisma/client`, inexistente); **bug DNF** en seeds (comparan `result.position` en vez de `positionText` → los abandonos guardan posición numérica); `ConstructorStanding` es tabla muerta (nadie la puebla; standings se recalculan al vuelo); no existe `DriverStanding`; 18 de 20 seeds sin script npm ni orquestación; campos nunca rellenados (fechas de sesiones, datos de circuito); sin Postgres local — todo escribe directo contra Supabase sin `DIRECT_URL`.

### 3.3 Microservicio Python (FastAPI + FastF1) — la pieza más madura

10 endpoints (telemetría por vuelta, comparación, laps, vueltas rápidas, análisis por piloto, clima, sesiones), caché en disco con diskcache, Dockerfile, README completo. Integrado vía cliente TS tipado + API routes proxy + página `/analysis`.

**Problemas**: **bug de orden de rutas** — `/compare` registrado después de `/{driver}`, así que la comparación cae en el handler equivocado (el botón "Comparar" casi seguro falla); endpoints huérfanos sin UI (weather, sessions, analysis); manejo de errores burdo (todo → 500); prints de debug; sin tests; `fastf1>=3.4` (hay que subir a 3.8.x).

### 3.4 Seguridad

Commit `20eb8af` saneó credenciales de Supabase expuestas en `.env.example`, **pero siguen en el historial de git → hay que rotarlas** (password de BD y keys desde el dashboard).

---

## 4. Qué cambió en el ecosistema (nov 2025 → ago 2026)

| Tema | Estado |
|---|---|
| **Jolpica F1** | Vivo, financiado por la comunidad, cubre 1950–2026. Requiere header `User-Agent` (devuelve 403 sin él). |
| **FastF1** | v3.8.3, con soporte de la temporada 2026 y colores de equipos 2026. Python ≥3.10. |
| **iOS 26** | Toda web añadida a la pantalla de inicio abre en **standalone por defecto**. Push notifications desde iOS 16.4; Declarative Web Push desde Safari 18.4. El mejor momento para una PWA. |
| **Parrilla 2026** | **11 equipos / 22 pilotos**: McLaren (Norris·Piastri), Ferrari (Hamilton·Leclerc), Red Bull (Verstappen·Hadjar), Mercedes (Russell·Antonelli), Aston Martin (Alonso·Stroll), Williams (Albon·Sainz), **Audi** ex-Sauber (Hülkenberg·Bortoleto), Alpine (Gasly·Colapinto), Haas (Ocon·Bearman), Racing Bulls (Lawson·Lindblad, único rookie), **Cadillac** nuevo (Pérez·Bottas). Las 20 fotos descargadas en dic-2025 son de la parrilla 2025. |

---

## 5. PWA iOS — receta (basada en plastik)

plastik (`C:\projects\typscript\plastik` — ojo al typo "typscript" en la ruta real) demuestra que **no hace falta librería PWA**: service worker artesanal (`public/sw.js`) + `manifest.webmanifest` + Metadata API de Next 16. Su auditoría interna (`docs/auditoria/04_PWA_IOS.md`, 15 hallazgos con fixes y checklist de 61 puntos) es lectura obligada antes de portar.

**Se porta de plastik**:
- SW con 4 estrategias: `/_next/static` cache-first · iconos/imágenes stale-while-revalidate · `/api/*` network-only · navegación network-first con fallback a `/offline`. Versionado manual de caches (`apexdata-static-v1`, `apexdata-pages-v1`) — bumpear en cada release.
- **Golden rule de safe areas**: `pt-[max(1.25rem,calc(env(safe-area-inset-top)+1rem))]` (top) / `pb-[max(1.25rem,env(safe-area-inset-bottom))]` (bottom) en todo overlay/sheet/tab bar. `viewport-fit=cover` obligatorio.
- Tab bar inferior fija con blur (`bg-background/85 backdrop-blur`) y auto-hide al scroll (hook rAF-throttled).
- `metadata.appleWebApp` + `viewport` de Next; `ThemeColorSync` (theme-color dinámico con el truco `media="not all"` para no romper el reconciler de React 19); splash in-app solo en standalone (`display-mode: standalone`); página `/offline` precacheada; iconos generados con sharp desde SVG maestro; excluir `sw.js`/`manifest` del matcher del middleware; CSP con `worker-src 'self'` y `manifest-src 'self'`.

**Se corrige desde el día uno (los huecos de plastik)**:
1. `appleWebApp.startupImage` con media queries por dispositivo (splash nativa iOS — su hallazgo más grave, ausente allí). Generar con `pwa-asset-generator`.
2. Registro del SW **con listeners de update** (`updatefound` + toast "Nueva versión — recargar" + `reg.update()` al volver al foreground) — evita usuarios clavados en HTML viejo.
3. `overscroll-contain` en overlays scrolleables.
4. `apple-touch-icon` **opaco** (flatten, sin alpha).
5. `"id": "/"` en el manifest.
6. Inputs y selects a `text-base md:text-sm` (16px móvil, anti focus-zoom).
7. `min-h-dvh` en vez de `min-h-screen`.
8. Hint de instalación para Safari iOS ("Compartir → Añadir a pantalla de inicio") con dismiss persistente.

---

## 6. Nueva identidad visual

**Dirección**: de "gamer techno" a **"broadcast profesional"** — lienzo carbon neutro donde el color lo ponen los datos.

**Tipografía** (via `next/font`, Google Fonts):
- Display: **Chakra Petch** (con itálicas para el "lean" de velocidad). Alternativa: Saira Condensed para labels densos.
- UI/cuerpo: **Inter**, con `tabular-nums` obligatorio en todo número comparable.
- Tiempos de vuelta: **JetBrains Mono** (`1:23.456`).
- Orbitron: retirar (o dejar solo como dorsal decorativo gigante).

**Paleta base dark-first**: bg `#0B0B0F` · surface `#141418` / `#1C1C22` / `#26262E` · border `#2A2A33` · texto `#F5F5F7` / `#A0A0AB` · rojo F1 `#E10600` **solo** marca/CTAs/LIVE (variante texto `#FF453A`) · morado fastest `#C084FC` · verde personal-best `#34D399` · amarillo slower `#FBBF24` (convención broadcast: morado = mejor absoluto, verde = mejor personal, amarillo = más lento).

**Colores de equipo 2026** como sistema semántico: token doble `team.color` + `team.colorOnDark` (variante AA para líneas/texto grande). Uso: **barra vertical de 3-4px** en filas de timing, nunca tinta de texto. Compañeros de equipo: línea sólida vs discontinua. Personalización: el equipo favorito tiñe el acento (patrón app oficial F1).

| Equipo | Primario | Equipo | Primario |
|---|---|---|---|
| McLaren | `#FF8000` | Alpine | `#FF87BC` |
| Ferrari | `#E80020` | Williams | `#64C4FF` |
| Red Bull | `#3671C6` | Racing Bulls | `#6692FF` |
| Mercedes | `#27F4D2` | Haas | `#E6002B` |
| Aston Martin | `#00665E` | Audi | `#C8CED4` |
| Cadillac | `#000000` + dorado | | |

**Compuestos** (valores FastF1/Pirelli, como anillo con letra): Soft `#DA291C` · Medium `#FFD12E` · Hard `#F0F0EC` · Inter `#43B02A` · Wet `#0067AD`.

**UX móvil**: tab bar inferior de 4-5 ítems (Inicio · Calendario · Standings · Telemetría · Más); tablas con patrón **priority+** (POS·piloto·tiempo·neumático visible, resto en row-expand/sheet) o primera columna congelada con scroll horizontal contenido; filas ≥44pt; sticky headers. Telemetría: **crosshair táctil sincronizado con tooltip fijo** (no bajo el dedo), long-press para scrub, render en **canvas** (SVG no aguanta 3+ vueltas a 60fps). Motion: solo `transform`/`opacity`, 150-250ms, `layout` FLIP para reordenar posiciones, number ticking sobre tabular-nums, `useReducedMotion` global.

---

## 7. Imágenes reales — pipeline verificado

**El misterio de diciembre, resuelto**: los 403 de Wikimedia eran por **falta de header `User-Agent`** (reproducido: sin UA → 403; con UA descriptivo → 200). Los 429 eran ráfagas → pausa de 300-500ms entre descargas.

Estrategia general: **descargar una vez → autoalojar en `public/images/` versionado en git → seed de rutas en BD**. Nunca hotlinkear media.formula1.com ni upload.wikimedia.org.

| Asset | Fuente (verificada) | Método |
|---|---|---|
| **Headshots pilotos** | OpenF1 `https://api.openf1.org/v1/drivers?session_key=latest` → campo `headshot_url` (media service oficial F1, HTTP 200 comprobado; `2col` para más resolución) | Script: roster Jolpica (fuente de verdad de `driverId`) + matching con OpenF1 → `public/images/drivers/{driverId}.png`. Cubre 2023–2026. |
| **Logos equipos** | Wikimedia vía API (`action=query&prop=imageinfo&iiprop=url` + User-Agent) para los libres; Brandfetch/manual para el resto | Semi-manual: 11 SVG en `public/images/constructors/{constructorId}.svg`; el seed solo escanea la carpeta. |
| **Trazados circuitos** | **F1DB** (`github.com/f1db/f1db`, CC BY 4.0, SVG de todos los históricos en estilos white/black) · respaldo **MasterPlay007/F1-Track-Layouts-SVG** (CC0) · **bacinger/f1-circuits** (GeoJSON MIT, incluye Madrid 2026) · opción premium: generarlos con FastF1 (`get_pos_data()` + `circuit_info.rotation`, coloreables por velocidad) | Script one-shot → `public/images/circuits/{circuitId}.svg` con `stroke: currentColor`. Atribuir F1DB en un About. |
| **Banderas** | **HatScripts/circle-flags** (MIT, circulares, ~2KB) · alternativa flagcdn | Tabla `nationality→ISO` (~25 entradas) → `public/images/flags/{iso}.svg`. |

Total ~5–10 MB, optimizado por `next/image`. Todo fetch con `User-Agent: "ApexData/1.0 (personal F1 hobby app)"`, skip si existe, upsert de ruta relativa al final.

---

## 8. Features nuevas (por impacto)

1. **Race Hub — nueva home**: próxima sesión con countdown en zona horaria local, horarios del weekend, trazado del circuito; el lunes, el resultado. Reemplaza la landing de marketing.
2. **Página de circuitos** (sección nueva): grid de trazados SVG, ficha con datos e historial de ganadores desde la BD.
3. **Telemetría 2.0**: crosshair táctil, canvas, mapa coloreado por velocidad, selectores desde BD (adiós hardcode 2024).
4. **Perfil de piloto completo + head-to-head**: victorias/podios/poles/puntos reales por temporada + duelo contra el compañero en quali y carrera.
5. **Standings con evolución**: gráfico de puntos ronda a ronda por color de equipo + animación FLIP.
6. **Estrategia de neumáticos**: barras de stints por piloto con color de compuesto (datos de laps FastF1).
7. **Personalización por equipo favorito** (tiñe el acento de la app).
8. **Push post-GP + modo offline** (último GP consultable sin conexión).

**Se retira/fusiona**: `/telemetry` (OpenF1) → se fusiona en Telemetría 2.0 · `/compare` actual → renace dentro del perfil de piloto con datos completos · `/test` → fuera.

---

## 9. Bugs conocidos (lista cerrada del Sprint 0)

1. 🔴 **Rotar claves Supabase** (expuestas en historial git; borrar del repo no las invalida). *Manual, con guía.*
2. 🔴 Crear `/constructors/[constructorId]` — enlazada desde 4 sitios (`ConstructorCard.tsx:22`, `results/page.tsx:137`, `RaceDetailClient.tsx:258,476`), no existe → 404.
3. 🔴 **Bug DNF** en `seed-results-*.ts` y sprints: comparar `positionText` (no `position`) → re-seedear.
4. 🔴 **Orden de rutas** en `python-service/app/routes/telemetry.py`: mover `/compare` (línea ~91) antes de `/{driver}` (línea ~15).
5. 🟡 Unificar `tailwind.config.js`/`.ts` (gana el .js, sin tokens `card`/`destructive`) y `postcss.config.js`/`.mjs`.
6. 🟡 `prisma/seed.ts`: import roto (`../src/generated/prisma/client` → `@prisma/client`).
7. 🟡 Colisión `SessionType` en `src/types/index.ts` (dos `export *` conflictivos).
8. 🟡 Higiene: singleton Prisma en `standings/page.tsx`, `error.tsx`/`not-found.tsx`, validar `searchParams` (NaN), retirar `/test`, commitear migración `circuits.imageUrl`, limpiar código muerto, quitar prints de debug del servicio Python, subir FastF1 a 3.8.x.

---

## 10. Arquitectura de producción (~$5/mes)

| Pieza | Servicio | Coste |
|---|---|---|
| Frontend Next.js + PWA | **Vercel Hobby** | $0 |
| FastAPI + FastF1 | **Railway Hobby** con volumen persistente 2–5GB para el caché (alt.: Fly.io ~$4, Hetzner ~€4.50) | ~$5 |
| Base de datos | **Supabase Free** (actual) | $0 |
| Imágenes | `/public` en git + `next/image` | $0 |
| CI/CD + datos | **GitHub Actions** | $0 |

- **Prisma + Supabase**: `DATABASE_URL` = pooler 6543 con `?pgbouncer=true&connection_limit=1` (runtime) + `DIRECT_URL` = 5432 (solo migraciones).
- **Cron de los lunes post-GP** (GitHub Actions, `0 6 * * 1` + `workflow_dispatch`): seeds de resultados/quali/sprint → `POST /admin/precache` (bearer token) al servicio Python para calentar el caché FastF1 → efecto colateral: mantiene Supabase activo (evita pausa por 7 días).
- **CI**: `npm ci` → `prisma generate` → lint → `tsc --noEmit` → build (env dummy). Vercel/Railway despliegan desde GitHub.
- **Seguridad**: RLS "deny all" en todas las tablas (defensa en profundidad); CORS estricto (solo dominios propios) y rate limiting (`slowapi`) en el servicio público; headers de seguridad en `next.config.ts`; secrets solo en Vercel/Railway/Actions Secrets (nunca `NEXT_PUBLIC_*`); secret scanning + push protection en GitHub; backup mensual con `pg_dump` (free tier no tiene backups).

---

## 11. Hoja de ruta — 6 sprints

| Sprint | Contenido | Estimación |
|---|---|---|
| **S0 — Saneamiento** | Rotar claves, los 8 puntos de la sección 9, commitear trabajo de dic-2025 ordenado, dependencias al día, CI mínimo | ~1 sesión |
| **S1 — Datos + imágenes** | Pipeline de imágenes (4 categorías), temporada 2026 en BD, re-seed con fix DNF, `seed:all` orquestado, DriverStanding/ConstructorStanding poblados | ~1–2 sesiones |
| **S2 — PWA shell** | Manifest, SW, iconos, splash, tab bar con safe areas, offline, install hint → instalada en iPhone | ~1–2 sesiones |
| **S3 — Rediseño visual** | Tokens (carbon + team colors), tipografía nueva, primitivos UI (Card/Table/Chip/Sheet), tablas priority+, **Race Hub**, página de circuitos | ~2–3 sesiones |
| **S4 — Telemetría 2.0 + perfiles** | Crosshair canvas, mapa por velocidad, estrategia de neumáticos, perfil piloto + H2H, standings con evolución | ~2–3 sesiones |
| **S5 — Producción** | Deploy Vercel + Railway, cron semanal, checklist de seguridad, push post-GP | ~1 sesión |

**Método de trabajo acordado**: agentes especializados por ámbito, skills de Claude Code (dataviz para gráficos, code-review y security-review antes de cada merge), investigación en internet cuando haga falta. Cada sprint cierra con la app corriendo y verificada.

**Pendiente del usuario**: rotar claves Supabase al arrancar S0 (con guía) · decidir dominio propio vs subdominio Vercel · descarga manual de los ~5 logos sin fuente libre.
