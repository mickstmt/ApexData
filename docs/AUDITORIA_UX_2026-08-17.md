# Auditoría triple de experiencia de uso — 2026-08-17

> **Origen**: Frank detectó probando en local que la mayoría de la app no tiene
> estados de carga, y pidió auditar el proyecto con agentes expertos en busca
> de más omisiones del mismo tipo. Tres agentes en paralelo, misma noche del
> primer despliegue en producción.
>
> **Este archivo contiene los tres informes ÍNTEGROS**, con archivo:línea de
> cada hallazgo, para poder trabajar el Sprint 6 desde cualquier máquina sin
> depender del contexto de la conversación en que se generaron. El alcance
> consolidado y priorizado vive en `AUDITORIA_Y_PLAN_RELANZAMIENTO_2026.md`,
> sección **"S6 — alcance completo"**.
>
> **Diagnóstico transversal**: la infraestructura de diseño se construyó bien,
> pero las páginas no la consumen — tokens definidos que nadie usa, y
> componentes modelo (`TimingRow`, `AnalysisClient`, `button.tsx`, la tabla del
> perfil de piloto) que el resto no imita.

---

# Informe 1 — Retroalimentación al usuario (estados de carga, vacío y error)

Auditadas las 15 rutas de `src/app` (14 reales + `/offline`), los 30 componentes y los servicios.

## GRAVEDAD ALTA

### 1. `SeasonSelector`: cero feedback al cambiar de temporada (afecta 5 páginas)
`src/components/ui/SeasonSelector.tsx:22-26` y `:34-45`

```tsx
const handleSeasonChange = (season: number) => {
  const params = new URLSearchParams(searchParams);
  params.set('season', season.toString());
  router.push(`?${params.toString()}`);
};
```

Sin `useTransition`, sin `isPending`, sin `disabled`, sin spinner. El `<select>` es totalmente controlado (`value={currentSeason}`, prop del servidor) y **no tiene estado local**: no hay actualización optimista, el valor mostrado depende de que llegue la respuesta del servidor.

Lo que le pasa al usuario: elige "Temporada 2019" en `/results` → la página sigue mostrando 2024 íntegra, sin skeleton, sin barra, sin nada, durante toda la consulta a Supabase. Como es una navegación solo-query dentro del mismo segmento, tampoco es fiable que el `loading.tsx` de `/calendar`, `/standings`, `/drivers` o `/constructors` se vuelva a mostrar. En `/results` no hay `loading.tsx` en absoluto → congelación total. Usado en: `calendar/page.tsx:110`, `standings/page.tsx:173`, `drivers/page.tsx:83`, `constructors/page.tsx:77`, `results/page.tsx:56`.

### 2. `/analysis` sin `loading.tsx`, y es pestaña primaria en móvil
`src/app/analysis/page.tsx:5,13` + `src/app/analysis/options.ts:32-58`

`force-dynamic` y antes de devolver HTML hace dos consultas encadenadas: `race.findMany` (60 carreras, filtro `results: { some: {} }`) y luego `result.findMany` de la última carrera con joins a driver y team. `MobileTabBar.tsx:21` la expone como una de las cinco pestañas fijas del móvil ("Telemetría"). El usuario toca la pestaña y **la pantalla anterior se queda quieta** hasta que la BD responde; ni siquiera cambia el tab activo.

### 3. `/compare` sin `loading.tsx` y con la consulta más pesada de la app
`src/app/compare/page.tsx:11,17-35`

`prisma.driver.findMany()` **sin `where` ni `take`**, con `include: { results: { take: 5, include: { team, race: { include: { season } } } } }`. Todo eso se serializa como props a `DriverSelector` (`'use client'`). Doble castigo: espera en blanco durante la consulta, y luego un payload RSC que crece con la tabla de pilotos aunque el usuario solo vaya a comparar dos.

### 4. `/results` — sin `loading.tsx` y sin `try/catch`
`src/app/results/page.tsx:20-40`

`race.findMany` de una temporada entera con `circuit`, `results` (top 3), `driver` y `team` anidados. Es una entrada `primary: true` del header (`config/site.ts:29`). Sin protección: si la BD falla, la excepción sube a `error.tsx` y toda la sección se sustituye por "Algo salió mal" — mucho más brusco que el banner de fallback que sí tienen `/calendar`, `/drivers` y `/constructors`.

### 5. `/results/[year]/[round]` sin `loading.tsx` ni `<Suspense>`
`src/app/results/[year]/[round]/page.tsx:26-54`

Un `findUnique` con `results` + `qualifyings`, ambos con `driver` y `team` (≈40 filas con joins). Al pulsar un GP desde la tabla de resultados o desde la home ("Ver todo", `page.tsx:220`), **nada indica que se haya pulsado**. El header, el nombre del circuito y las pestañas de sesión podrían pintarse al instante desde la consulta ligera y dejar la tabla dentro de un `<Suspense>`.

### 6. `/circuits` sin `loading.tsx`, con `force-dynamic`
`src/app/circuits/page.tsx:13,31-37`

`circuit.findMany()` sin filtro, con `_count.races` y una subconsulta `races` ordenada por cada circuito. Pantalla anterior congelada, y luego un grid de ~77 tarjetas con imágenes que se cargan de golpe.

### 7. Favoritos: un fallo de red o un piloto fuera del top-50 se muestra como "No hay favoritos"
`src/components/favorites/FavoritesGrid.tsx:22-27,43-46,63-73` + `src/app/api/drivers/route.ts:24`

Dos defectos que producen el mismo síntoma engañoso:
- `/api/drivers` tiene `take: limit ? … : 50` y ordena por `familyName: 'asc'`. `FavoritesGrid` llama sin `?limit`, así que si tu piloto favorito está por debajo de la posición 50 alfabética, **desaparece de Favoritos sin explicación**.
- Si la API devuelve 500, `driversData.data` es `undefined`, el `.filter` lanza, el `catch` solo hace `console.error`, y el componente cae en `!hasAnyFavorites` → el usuario ve **"No hay favoritos. Explora pilotos y equipos…"** aunque tenga diez marcados. Nunca se entera de que hubo un error.

### 8. `/compare`: el estado vacío no se muestra nunca en la carga inicial (bug de precedencia)
`src/components/compare/DriverSelector.tsx:282`

```tsx
{!driver1 || !driver2 && (
  <div …>Selecciona dos pilotos para comenzar la comparación</div>
)}
```

Se evalúa como `!driver1 || (!driver2 && <jsx>)`. Al entrar a `/compare` sin nadie seleccionado, `!driver1` es `true` → la expresión vale `true` → React **no renderiza nada**. El mensaje de ayuda solo aparece cuando ya has elegido al piloto 1, que es justo cuando ya no hace falta. El usuario llega a la página y ve dos cajas de búsqueda sobre una zona vacía.

## GRAVEDAD MEDIA

### 9. `/standings` reporta un fallo de BD como "no hay datos"
`src/app/standings/page.tsx:145-148` y `:194-199`

El `catch` devuelve `{ drivers: [], constructors: [], round: 0, evolution: [] }`, indistinguible de una temporada sin datos. El usuario ve *"No hay datos de clasificación disponibles para la temporada 2025"* cuando lo cierto es que Supabase está caído. No reintenta, no avisa. Es la única página con `SeasonSelector` que no distingue error de vacío (las otras sí, vía `usingFallback`).

### 10. Ninguna oportunidad de `<Suspense>` aprovechada — tres candidatas claras
- **Home** (`src/app/page.tsx:33-105`): `Promise.all` (próxima + última carrera) → `findFirst` de la ronda → `Promise.all` de dos standings → `result.findMany` para colores de equipo. **Cuatro viajes secuenciales** antes del primer byte, y la página es `force-dynamic` sin `loading.tsx`. La "Próxima carrera" (lo que el usuario viene a ver) podría pintarse tras el primer viaje y dejar "Último resultado" y "Campeonato" en `<Suspense>`.
- **`/drivers/[driverId]`** (`:104` y `:106`): tras la consulta principal, `await getDriverStats()` (3 queries, `driver-stats.ts:35-55`) y luego `await getHeadToHead()` (2 queries más, `:102-116`), **secuenciales**. La cabecera con foto y nombre ya está disponible desde `:65`, pero espera a las 5 consultas. Aquí el `loading.tsx` existe, así que el coste se paga en un skeleton innecesariamente largo.
- **`/standings`** (`:76-90`): un bucle `for` que consulta ronda por ronda hasta resolver el equipo de cada piloto — hasta 24 round-trips en el peor caso. El gráfico `PointsEvolution` (`:94-120`) es otra query independiente, perfecta para `<Suspense>`.

### 11. Carrera sin resultados = tabla fantasma
`src/app/results/[year]/[round]/RaceDetailClient.tsx:158,199,306`

Si la carrera existe pero aún no tiene resultados (GP futuro, seed a medias), no hay guarda: el usuario ve **cabeceras de tabla sin filas**, una tarjeta *"VUELTAS: 0 / Vueltas completadas"* y una sección *"Podio"* con el título y nada debajo. La pestaña Clasificación sí tiene su estado vacío (`:588-596`) — falta el mismo tratamiento para Carrera.

### 12. Caché: ni un solo `revalidate` en toda la app
Verificado con grep: cero `revalidate` en páginas, cero `unstable_cache`, cero `cache()`. Solo `openf1/client.ts:42` (`next: { revalidate: 300 }`, correcto).

Dos problemas opuestos:
- **A la BD en cada visita sin necesidad**: `/circuits` (`force-dynamic`, datos que cambian una vez al año), `/calendar`, `/drivers`, `/constructors`, `/results` (dinámicas por `searchParams`) y `/drivers/[driverId]` (`force-dynamic`). Un `export const revalidate = 3600` en las históricas eliminaría la mayor parte de la espera descrita en los puntos 1-6.
- **Datos congelados sin control**: `/compare`, `/favorites`, `/results/[year]/[round]` y `/constructors/[constructorId]` no declaran `dynamic` ni usan APIs dinámicas → quedan en el Full Route Cache sin caducidad (o prerenderizadas en build). Un GP renderizado antes de tener resultados puede servirse indefinidamente vacío. *Conviene confirmarlo con `next build`: el `.next` del repo es solo de `dev`, no hay `prerender-manifest.json` que lo verifique.*

### 13. Home puede quedar casi en blanco sin decirlo
`src/app/page.tsx:146,212,265`

Las tres secciones son condicionales (`nextRace &&`, `lastRace && …`, `driverStandings.length > 0 &&`). Con la BD conectada pero una temporada sin sembrar, `getHubData()` devuelve un objeto válido con todo vacío → el usuario ve **solo los tres botones del final** ("Calendario completo", "Circuitos", "Telemetría") flotando sobre una página vacía. El único mensaje (`:117-126`) cubre `data === null`, no este caso.

### 14. `/constructors/[constructorId]` sin `loading.tsx` y sin `take`
`src/app/constructors/[constructorId]/page.tsx:42-56`

Trae **todos** los `results` históricos del equipo con `race`, `circuit` y `driver` anidados, solo para calcular tres contadores (`:97-99`) y mostrar `slice(0, 10)` (`:113`). Ferrari son ~1.000+ filas con joins. Sin indicación de carga al pulsar un equipo desde `/standings` o desde la home.

### 15. `/analysis` con base de datos vacía: selects vacíos y error crudo
`src/app/analysis/AnalysisClient.tsx:50-55,185-192`

Si `sessions` viene vacío el fallback es `{ year: actual, event: '1', name: 'Sin sesiones' }` pero el `<select>` se renderiza **sin ninguna opción**. Los botones siguen activos: al pulsarlos, el fetch a `/api/telemetry/2026/1/Q/VER` falla y se muestra el mensaje crudo de la API en el banner rojo (`:296-300`). Debería deshabilitar los botones y explicar que no hay sesiones sembradas.

### 16. `PageTransition` retrasa 300 ms la aparición de todos los skeletons
`src/components/providers/PageTransition.tsx:14-19`

`AnimatePresence mode="wait"` con `key={pathname}`: la página vieja hace su animación de salida completa (0.3 s) **antes** de que se monte el `loading.tsx` de la nueva. En las 6 rutas que sí tienen skeleton, el feedback llega 300 ms tarde. En las que no lo tienen, el `pathname` ni siquiera cambia hasta que llegan los datos, así que la animación no dispara: el efecto es que **las rutas bien resueltas se sienten más lentas y las mal resueltas no se sienten en absoluto**. Además, al ir keyed por `pathname`, un cambio de `?season` no anima nada (relacionado con el punto 1).

## GRAVEDAD BAJA

| # | Archivo:línea | Qué ve el usuario |
|---|---|---|
| 17 | `FavoritesGrid.tsx:53-59` | "Cargando favoritos..." en texto plano centrado, no skeleton; el layout salta al llegar las tarjetas |
| 18 | `src/app/` (ausente) | No hay `global-error.tsx`: un fallo en el root layout o en `ThemeProvider`/`FavoritesProvider` da pantalla en blanco del navegador |
| 19 | `drivers/[driverId]/loading.tsx` | El skeleton no corresponde a la página real: dibuja 3 tiles de stats (la página tiene 6, `page.tsx:183-190`) y una tabla de 4 columnas donde hay `TimingRow`s. Salto visual notable al resolverse |
| 20 | `src/app/drivers/`, `constructors/` (ausente) | Un `driverId` inexistente cae en el `not-found.tsx` global: 404 genérico con botones "Inicio"/"Calendario", sin "Volver a pilotos" |
| 21 | `LapTimesTable.tsx:29`, `TelemetryComparison.tsx:86` | Mensajes de estado vacío en inglés ("No lap data available", "No telemetry data available") en una UI 100% en español |
| 22 | `standings/loading.tsx:87-89` | El skeleton dibuja una "nota informativa" final que la página real ya no tiene, y omite el gráfico `PointsEvolution` que sí ocupa 280 px |

## Lo que ya está bien — NO tocar

- **`AnalysisClient.tsx:63-71, 142, 253-300, 385-398` es el modelo a seguir.** Estado de carga **por acción** (`telemetry`/`comparison`/`laps` independientes), `Loader2` girando dentro del propio botón, `disabled={isAnyLoading}` global para evitar peticiones cruzadas, banner de error legible, estado vacío con instrucciones **y** un aviso preventivo de que la primera carga tarda (`:159`, `:393-396`). El resto de la app debería copiar este patrón.
- **`error.tsx`** con botón `reset()` real + salida a inicio, **`not-found.tsx`**, **`/offline`** precacheada por el service worker (`public/sw.js:19-33`, con el comentario correcto sobre no usar `cache.addAll`). Buena base.
- **Banners `usingFallback`** en `/calendar:115-130`, `/drivers:88-103`, `/constructors:82-97`, `/compare:61-67`: distinguen "BD caída" de "sin datos" y enlazan al dashboard de Supabase. Es exactamente lo que le falta a `/standings` (punto 9).
- **Estados vacíos de búsqueda cliente**: `DriversSearch.tsx:96-111` y `ConstructorsSearch.tsx:81-96` — mensaje + botón "Limpiar filtros" + contador en vivo ("N pilotos encontrados", `:83-85`). Impecable; el filtrado es en memoria, así que no necesita pending state.
- **`/telemetry/page.tsx:45,193,202`**: las tres ramas cubiertas (datos / error / vacío), con mensajes distintos y un aviso proactivo de "datos desde 2023". Más su `loading.tsx` con 20 tarjetas de piloto.
- **Imágenes**: `OptimizedImage.tsx:30-71` (skeleton mientras carga + `onError` con fallback visible), `DriverAvatar:107-117` y `TeamLogo:149-159` (iniciales cuando no hay `src`), `CountryFlag.tsx:26` (`return null` en vez de imagen rota). Cero huecos aquí.
- **`ThemeToggle.tsx:19-23`**: placeholder del mismo tamaño durante la hidratación — sin salto de layout.
- **`openf1/client.ts:41-59`**: `revalidate: 300`, 429 devuelve `[]` en lugar de tirar la página, y `fastf1/client.ts:33,57-64` distingue "servicio no configurado" de "error de conexión" con un mensaje en español.
- **Gráficos**: `PointsEvolution.tsx:200-221` y `TelemetryChart.tsx:196-216` — ambos tienen lectura de valores fuera del área táctil y texto guía cuando no hay hover ("Pasa el dedo o el cursor…"). Detalle de calidad.
- **`prisma.ts:12`** con singleton global en dev, `constructors/[constructorId]:66-93` con pantalla de error específica y enlace de recuperación.

## Orden de ataque sugerido

1. Envolver `SeasonSelector` en `useTransition` + `disabled`/spinner (una edición, arregla 5 páginas).
2. Añadir `loading.tsx` a `/analysis`, `/compare`, `/results`, `/results/[year]/[round]`, `/circuits`, `/constructors/[constructorId]`.
3. El bug de precedencia de `DriverSelector.tsx:282` (un paréntesis).
4. `limit` en la llamada de `FavoritesGrid` + estado de error explícito.
5. `revalidate` en las rutas históricas — reduce la latencia que originó los puntos 1-6.
6. `<Suspense>` en home y `/drivers/[driverId]`.

---

# Informe 2 — Accesibilidad y UX móvil/PWA

Contrastes calculados sobre los HSL reales de `globals.css` (fórmula WCAG). Referencia: plan §5 (receta PWA iOS) y §6 (identidad, tablas, motion).

## GRAVEDAD ALTA

**1. No existe soporte de reduced-motion en ningún sitio.** El plan lo exige explícitamente ("`useReducedMotion` global", §6).
- `src/app/globals.css:1-99` — no hay ningún bloque `@media (prefers-reduced-motion: reduce)`.
- `src/components/providers/PageTransition.tsx:15-24` — cada navegación anima `y: 20 → 0 → -20` sobre **toda** la página.
- `src/components/drivers/DriverCard.tsx:32-37`, `src/components/constructors/ConstructorCard.tsx:23-28` — entrada escalonada `delay: index * 0.05`; con 20+ pilotos la cascada dura más de 1 s.
- También sin guarda: `DriverSelector.tsx:229-231`, `ThemeToggle.tsx:26-28`, `FavoriteButton.tsx:20-22`, `Skeleton.tsx:8`, `AnalysisClient.tsx:259,273,287`.
- Consecuencia: usuarios con trastorno vestibular sufren desplazamiento vertical en cada cambio de sección, sin escape posible. Nota positiva: todo lo animado usa `transform`/`opacity` — esa parte del plan sí se cumple.

**2. El foco visible está anulado o es invisible.**
- `focus:outline-none focus:ring-2 focus:ring-primary/20` en `DriversSearch.tsx:64,73`, `ConstructorsSearch.tsx:49,58`, `SeasonSelector.tsx:38`. El anillo al 20 % de alfa da **1,21:1 en claro y 1,75:1 en oscuro** — indistinguible.
- Peor aún, `focus:outline-none focus:border-primary` **sin anillo de sustitución** en `AnalysisClient.tsx:175,202,220,238` y `DriverSelector.tsx:115,189`: solo cambia el color de un borde de 1 px.
- Consecuencia: navegando con teclado se pierde por completo la posición en los formularios. WCAG 2.4.7 (AA). `button.tsx:8` sí lo hace bien (`focus-visible:ring-ring ring-offset-2`) — ese es el patrón a replicar.

**3. Zoom desactivado.** `src/app/layout.tsx:74-75` — `maximumScale: 1` + `userScalable: false`. Fallo automático de WCAG 1.4.4. Safari iOS lo ignora para el pinch desde iOS 10, pero no todos los WebViews, y el plan ya resuelve el zoom-al-enfocar por la vía correcta (regla #6: `text-base md:text-sm`), así que la restricción es innecesaria.

**4. Colores Tailwind hardcodeados que se rompen en tema claro.** Los tokens semánticos `--fastest / --personal-best / --slower` existen en `globals.css:33-35,61-63` y están bien calculados… pero **no se usan en ningún componente**. En su lugar:

| Archivo:línea | Clase | Contraste en claro |
|---|---|---|
| `LapTimesTable.tsx:94` | `text-purple-400` sobre `bg-purple-500/10` | **2,34:1** |
| `AnalysisClient.tsx:297` | `text-red-400` sobre `bg-red-500/10` | **2,42:1** |
| `AnalysisClient.tsx:325` | `text-yellow-400` sobre `bg-yellow-500/20` | **1,35:1** |
| `AnalysisClient.tsx:326` | `text-slate-400` sobre `bg-slate-500/20` | **1,99:1** |
| `AnalysisClient.tsx:333` | `text-purple-400` | **2,64:1** |
| `RaceDetailClient.tsx:215,433` / `results/page.tsx:127` | `text-yellow-600` sobre `bg-yellow-500/20` | **2,58:1** |
| `RaceDetailClient.tsx:314,534` | `text-orange-600` sobre `bg-orange-500/20` | **2,90:1** |

Consecuencia: en tema claro los tiempos de vuelta rápida, los mensajes de error de telemetría y los podios son prácticamente ilegibles. Todos necesitan ≥4,5:1.

**5. Los gráficos usan la variante `onDark` sobre lienzo blanco.** `PointsEvolution.tsx:137,147,160,165,211` y `TelemetryChart.tsx:122-123,203` pintan siempre `teamColor(...).onDark` sobre `bg-card`, que en tema claro es **blanco puro**:
- Mercedes `#27F4D2` → **1,40:1** · Williams `#64C4FF` → **1,93:1** · Audi `#D9DEE3` → **1,35:1** · Renault `#FFF500` → **1,15:1**.
- Consecuencia: en tema claro las líneas de evolución del campeonato y las trazas de telemetría desaparecen del fondo. El sistema de `team-colors.ts` está bien diseñado (token doble, comentario correcto) pero **le falta el tercer valor `onLight`**, o los gráficos deben forzar un fondo oscuro.

**6. Ninguna tabla aplica el patrón "priority+" del plan.** Todas son `<table className="w-full">` con celdas `p-4` dentro de un `overflow-x-auto`, sin columna congelada ni row-expand:
- `RaceDetailClient.tsx:184-293` — 7 columnas (POS/NO/PILOTO/EQUIPO/LAPS/TIME/PTS), cada `td` con avatar de 40 px + `p-4`.
- `RaceDetailClient.tsx:402-513` — 7 columnas (Q1/Q2/Q3).
- `results/page.tsx:67-162` — 6 columnas.
- `LapTimesTable.tsx:36-130` — 8 columnas (Lap/Driver/Time/S1/S2/S3/Tyre/Max Speed).
- Consecuencia: en un iPhone de 375 px el ancho intrínseco ronda los 900-1000 px; hay que arrastrar horizontalmente **toda** la fila y la columna POS se pierde de vista, que es exactamente el fallo que el plan quería evitar. Ni siquiera se muestra la barra de color de equipo aquí.

**7. Cuatro `<select>` sin nombre accesible.** `AnalysisClient.tsx:171-174, 198-201, 216-219, 234-237`: el `<label>` no tiene `htmlFor` y el `<select>` no tiene `id` ni `aria-label`. Mismo patrón en `DriverSelector.tsx:80-82` / `:106` y `:154-156` / `:180`. Consecuencia: VoiceOver anuncia "menú emergente" sin decir si es Gran Premio, Sesión, Piloto 1 o Piloto 2. WCAG 4.1.2 (nivel A). `SeasonSelector.tsx:31-35` lo hace bien y sirve de plantilla.

## GRAVEDAD MEDIA

**8. Inputs de 14 px en /analysis.** `AnalysisClient.tsx:175,202,220,238` usan `text-sm` — viola la regla #6 del plan (`text-base md:text-sm`) y provoca zoom al enfocar en iOS en cuanto se quite el `maximumScale: 1`. El resto de la app sí cumple (`DriversSearch.tsx:64,73`, `ConstructorsSearch.tsx:49,58`, `SeasonSelector.tsx:38`).

**9. Objetivos táctiles por debajo de 44 px.** El plan pide ≥44 pt.
- `ThemeToggle.tsx:30` — `h-9 w-9` = 36 px.
- `Header.tsx:52-60` — `p-2` + icono 24 px = 40 px.
- `button.tsx:23-26` — `default: h-10` (40), `sm: h-9` (36), `icon: h-10` (40).
- `FavoriteButton.tsx:28` — `p-2` + 20 px = 36 px.
- `DriverSelector.tsx:97,171` — `p-1` + 20 px = **28 px**, y además sin `aria-label`: es un botón sin nombre.
- `IosInstallHint.tsx:54` — `p-1` + 16 px = 24 px.
- `PwaRegister.tsx:76` — `py-1.5` ≈ 30 px de alto en el botón "Actualizar".
- `MobileTabBar.tsx:47` sí cumple (`min-h-[44px]`), igual que `TimingRow.tsx:59` (`min-h-[56px]`).

**10. `<button>` dentro de `<a>` — HTML inválido y doble tabulación.** `DriverCard.tsx:31→42` y `ConstructorCard.tsx:22→33` meten `FavoriteButton` dentro del `<Link>`; `page.tsx:340-357` envuelve tres `<Button>` en `<Link>`. Consecuencia: los lectores de pantalla anuncian el control anidado de forma impredecible y el teclado recibe paradas duplicadas.

**11. Nada se anuncia a los lectores de pantalla dinámicamente.** No hay ni un `role="alert"` ni un `aria-live` en todo `src/`.
- `AnalysisClient.tsx:296-300` — el error de fetch aparece en silencio.
- `PwaRegister.tsx:69-81` — el aviso "Hay una versión nueva" nunca se anuncia.
- `FavoritesGrid.tsx:53-59` y los tres estados `loading` de `AnalysisClient` tampoco.

**12. Tablas sin semántica de cabecera.** 41 elementos `<th>` en 6 archivos, **0 `scope=`** y **0 `<caption>`**. Con tablas de 7-8 columnas, VoiceOver no puede asociar celda↔cabecera al navegar por filas.

**13. Pestañas de sesión sin rol ARIA.** `RaceDetailClient.tsx:113-128` — son `<button>` sueltos, sin `role="tablist"/"tab"`, `aria-selected` ni `aria-controls`, y el panel de contenido no es un `tabpanel`. Se anuncian como seis botones sin relación con lo que cambian.

**14. Combobox casero sin ARIA ni teclado.** `DriverSelector.tsx:119-146` y `:193-220` — un `div` con `<button>` dentro, sin `role="combobox"`, `aria-expanded`, `aria-activedescendant` ni navegación con flechas. Solo se puede usar tabulando por cada resultado.

**15. El compuesto de neumático se codifica solo con color.** `LapTimesTable.tsx:113-117` — un `div` de 12 px coloreado, sin texto ni `aria-label`; junto a él solo aparece `L{TyreLife}`. Un usuario daltónico o de lector de pantalla no puede saber si es blando o duro. WCAG 1.4.1. Además ignora `COMPOUND_COLORS` de `team-colors.ts:76-83`, que ya tiene los valores Pirelli correctos del plan.

**16. Semántica de tiempos invertida respecto al plan.** `LapTimesTable.tsx:72,94` pinta de **morado** el *personal best*; el plan (§6) fija morado = mejor absoluto, verde = mejor personal. Un aficionado que lee la convención broadcast interpretará mal la tabla.

**17. Dos tokens semánticos fallan contraste en tema claro.** `globals.css:34-35` — `--personal-best` (160 84% 30%) da **4,20:1** y `--slower` (38 92% 38%) da **3,60:1** sobre `--card` blanco. En oscuro están bien (9,48 y 10,76). Igual, `text-primary` sobre `bg-primary/20` (badges de dorsal y de posición en `RaceDetailClient.tsx:217,239,457`, `results/page.tsx:140-143`) da **3,75:1**.

**18. Bordes de controles a 1,34:1.** `--border` / `--input` = 240 8% 88% sobre `--card` blanco (1,34:1) y 240 10% 18% sobre carbón (1,26:1). Como el borde es lo único que identifica un `<input>` o `<select>`, esto incumple WCAG 1.4.11 (mínimo 3:1 para límites de componentes).

**19. El menú del Header no gestiona el foco.** `Header.tsx:52-82` — tiene `aria-expanded` (bien) pero le falta `aria-controls`, no cierra con Escape, no atrapa el foco y no lo devuelve al botón al cerrar. En la PWA instalada, donde este menú es el acceso a las secciones secundarias, es la vía principal de navegación con teclado externo.

**20. `overscroll-contain` ausente en los desplegables scrollables.** El plan lo lista como corrección obligatoria (§5, punto 3). `DriverSelector.tsx:120,194` — `max-h-96 overflow-y-auto` sin contención: al llegar al final de la lista el scroll encadena a la página. `globals.css:74` solo protege el `html`.

**21. El gráfico de evolución no se puede desplazar en móvil.** `PointsEvolution.tsx:70,74` — el `<svg>` tiene `min-w-[560px]` dentro de un `overflow-x-auto`, pero lleva `touch-pan-y`, que bloquea el paneo horizontal iniciado sobre el propio SVG. Como las etiquetas de piloto viven en los 96 px de padding derecho (`PADDING.right`, línea 23), en una pantalla de 375 px **son inalcanzables**.

**22. Reflow forzado en cada movimiento del cursor de telemetría.** `TelemetryChart.tsx:67-92` — `draw()` lee `wrapper.clientWidth` (línea 72), llama a `getComputedStyle(document.documentElement)` (línea 86) y reasigna `canvas.width/height` (75-78). Como `handlePointer` (162-171) dispara `setCursor` en cada `pointermove`, cada frame de scrub provoca recálculo de estilo, layout y reasignación del buffer del canvas. Es el único punto del código que fuerza reflow durante una interacción continua; conviene cachear ancho y colores fuera del bucle de dibujo.

**23. Idioma mezclado.** App con `lang="es"` (`layout.tsx:86`) pero: cabeceras `GRAND PRIX / DATE / WINNER / CAR / LAPS / TIME` (`results/page.tsx:70-87`), fecha con `toLocaleDateString('en-US')` (`results/page.tsx:117`), `Lap/Driver/Time/Tyre/Max Speed` (`LapTimesTable.tsx:39-64`), `aria-label="Toggle theme"` (`ThemeToggle.tsx:31,35`), `alt` con "avatar"/"logo" y el fallback "Image not available" (`OptimizedImage.tsx:39,124,169`). Un lector de pantalla en español pronunciará mal estas cadenas.

**24. Sin `<h1>` cuando no hay próxima carrera.** `page.tsx:164` — el único `h1` de la home vive dentro del bloque `{nextRace && ...}`; fuera de temporada la página arranca en `h2` (líneas 215, 268).

## GRAVEDAD BAJA

- **`standings/page.tsx:211-213,271-274`** — el emoji de medalla **sustituye** al número de posición; VoiceOver dice "medalla de oro" en vez de "1". Añadir la posición como `sr-only`.
- **`calendar/page.tsx:155`** — `opacity-75` sobre carreras pasadas rebaja `muted-foreground` de 6,89:1 a ~4,3:1, justo por debajo del umbral.
- **`DriverSelector.tsx:282`** — bug de precedencia: `{!driver1 || !driver2 && (...)}` se agrupa como `!driver1 || (!driver2 && jsx)`, así que el estado vacío "Selecciona dos pilotos" **nunca aparece** al entrar en la página; solo tras elegir uno.
- **`Header.tsx:23`** — usa `pt-[env(safe-area-inset-top)]` en vez de la "golden rule" `pt-[max(1.25rem,calc(env(...)+1rem))]` del plan; funciona por la altura fija `h-16`, pero se desvía de la regla.
- **Sin enlace "saltar al contenido"** — con cabecera + tab bar, el teclado atraviesa toda la navegación en cada página.
- **`PointsEvolution.tsx:75-76` y `TelemetryChart.tsx:226`** — `role="img"` + `aria-label` genérico, sin alternativa textual de los datos (una tabla `sr-only` resolvería el gráfico de campeonato).

## Lo que sí está bien resuelto

- **Safe areas**: correctas en `layout.tsx:87` (`min-h-dvh`, no `min-h-screen` — regla #7 cumplida), `layout.tsx:77` (`viewportFit: 'cover'`), `MobileTabBar.tsx:33` (`pb-[max(0.5rem,env(safe-area-inset-bottom))]`), `PwaRegister.tsx:70` y `IosInstallHint.tsx:44` (`bottom-[calc(...+env(safe-area-inset-bottom))]`), y el hueco del footer en `layout.tsx:101`.
- **PWA**: `manifest.webmanifest` con `"id": "/"` (regla #5), icono maskable, shortcuts y `lang: es`; `appleWebApp.startupImage` presente (`layout.tsx:59`, regla #1); `PwaRegister.tsx:34-50` implementa `updatefound` + `reg.update()` en `visibilitychange` con la comprobación correcta en estado `installed` (regla #2); `ThemeColorSync.tsx:43-45` usa el truco `media="not all"` documentado.
- **`TimingRow.tsx`** es el componente modelo: barra vertical de 4 px con `aria-hidden` (36-39), color de equipo nunca como tinta, `tabular-nums`, `min-h-[56px]`, `font-mono` en los valores. Cumple §6 al pie de la letra.
- **`team-colors.ts`**: sistema de token doble `color`/`onDark` con la razón bien documentada, y `COMPOUND_COLORS` con los valores Pirelli exactos del plan.
- **`TelemetryChart.tsx`**: renderizado en **canvas** (no SVG) como pide el plan, crosshair compartido entre canales y **lectura de valores fuera del plot** (líneas 196-216) para que el dedo no la tape — la decisión de UX táctil mejor ejecutada del proyecto.
- **`PointsEvolution.tsx`**: compañeros de equipo con línea discontinua (46-53), etiquetas directas al final de línea en vez de leyenda, `figcaption` fuera del área del gráfico.
- **`drivers/[driverId]/page.tsx:268-305`**: la única tabla que sí cabe en móvil — 5 columnas de cabecera corta (Año/Equipo/Pos/Vict/Pts), `text-sm`, padding ajustado, `tabular-nums` en todas las cifras y barra de color de equipo. Es el patrón que deberían adoptar las demás.
- **Cero `<div onClick>`**: todos los elementos interactivos son `<button>` o `<Link>`.
- **Iconos decorativos** marcados con `aria-hidden` de forma sistemática; `aria-current="page"` en `Header.tsx:39` y `MobileTabBar.tsx:44`; `aria-label` en el nav de pestañas.
- **`tabular-nums`** aplicado de forma consistente en toda cifra comparable, como exige §6.
- **Contraste base sólido**: `muted-foreground` da 6,89:1 (claro) y 7,03:1 (oscuro); todos los tokens semánticos superan 5:1 en tema oscuro.

**Prioridad de corrección sugerida:** (1) `MotionConfig`/`useReducedMotion` global + bloque `@media (prefers-reduced-motion)`; (2) anillo de foco real reutilizando el patrón de `button.tsx:8`; (3) sustituir los colores Tailwind hardcodeados por los tokens `--fastest/--personal-best/--slower` que ya existen; (4) `htmlFor`/`id` en los selects de `/analysis`; (5) tercer token `onLight` para los gráficos; (6) priority+ en las cuatro tablas anchas.

---

# Informe 3 — Veracidad de la documentación

Verificado contra código real y contra la BD de producción (`scripts/check-data.ts`, ejecución real) y la suite de tests (`npx vitest run` → 36 passed).

## Resumen

La documentación es **mayoritariamente veraz en lo que afirma**, pero **incompleta en lo que omite**. Todo lo que PROGRESO declara como hecho, existe. El problema es lo contrario: **9 elementos prometidos en el plan desaparecieron de la documentación sin quedar registrados como deuda**. El patrón es siempre el mismo: la bitácora de cada sprint describe lo que *sí* se hizo, y lo no hecho no se resta del alcance original.

## 1. Afirmaciones verificadas como CIERTAS

| Afirmación | Comprobación |
|---|---|
| "2010–2026 completo (17 temporadas)… 84 pilotos, 25 equipos, 55 circuitos" (PROGRESO:21) | Exacto. `scripts/check-data.ts` devuelve 17 temporadas, todas con resultados/quali/standings; 84/25/55 |
| "29 fotos, 36 trazados, 36 banderas, 8 logos" (PROGRESO:23) | Exacto en disco y en BD (29 con foto, 8 con logo, 36 con trazado) |
| "36 unitarios + 14 (Python)" (PROGRESO:31) | Exacto: vitest 36 passed; `python-service/tests/test_serialization.py` 14 `def test_` |
| S0 — orden de rutas Python | `python-service/app/routes/telemetry.py:20` `/compare` antes de `:105` `/{driver}` ✅ |
| S0 — fix DNF | `src/lib/results.ts` (`classifiedPosition` sobre `positionText`) + `scripts/fix-dnf-positions.ts` ✅ |
| S0 — configs duplicadas, `SessionType`, `/test`, `error.tsx`/`not-found.tsx`, `/constructors/[id]` | Todos verificados ✅ |
| S2 — PWA completo | `manifest.webmanifest` (con `id`), `sw.js` (143 líneas, 4 estrategias), 13 splash en `public/splash/`, `apple-splash.ts`, `MobileTabBar.tsx` (5 tabs, safe-area), `IosInstallHint`, `PwaRegister`, `min-h-dvh`, `viewportFit:'cover'` ✅ |
| S3 — tipografía y tokens | `src/app/layout.tsx:2` Chakra Petch + Inter + JetBrains Mono, Orbitron fuera ✅ |
| S3 — Race Hub | `src/app/page.tsx` completo: countdown local, horarios del weekend, trazado, podio, top-5 de ambos campeonatos ✅ |
| S4 — canvas + crosshair | `src/components/telemetry/TelemetryChart.tsx:51,80,226` ✅ |
| S4 — fin del hardcode 2024 | `src/app/analysis/options.ts` (sesiones y parrilla desde BD) ✅ |
| S4 — perfil + H2H | `src/lib/driver-stats.ts:84,134`; `src/app/drivers/[driverId]/page.tsx:200` ✅ |
| S4 — standings con evolución | `src/components/charts/PointsEvolution.tsx` usado en `src/app/standings/page.tsx:189` ✅ |
| Deuda: 6 de 14 páginas con `loading.tsx`, cero `<Suspense>`, sin `revalidate` | Exacto: 6 `loading.tsx`; `grep Suspense src/` → 0; `revalidate` solo en `api/standings/current/route.ts:12` ✅ |

## 2. Pendientes declarados — confirmación de estado

| Pendiente declarado | Estado real | Veredicto |
|---|---|---|
| Mapa del circuito por velocidad (PROGRESO:38) | Cero rastro. Sin `get_pos_data`/`circuit_info` en `python-service/`, sin componente | **NO HECHO** (declarado correctamente) |
| Estrategia de neumáticos / stints (PROGRESO:38) | Cero rastro de `stint`. Solo el badge de compuesto por vuelta que ya existía en `LapTimesTable.tsx:111` | **NO HECHO** (declarado correctamente) |
| `/telemetry` demo OpenF1 (PROGRESO:35) | Sigue viva: `src/app/telemetry/page.tsx` con "Más funciones de telemetría próximamente", y sigue en el menú (`src/config/site.ts:35`, "En vivo") | **NO HECHO** (declarado) |
| `/compare` engañosa (PROGRESO:36) | Sigue viva: `src/app/compare/page.tsx:20` `results: { take: 5 }`. Sigue en el menú (`site.ts:37`) | **NO HECHO** (declarado) |
| 6 logos faltantes (PROGRESO:55) | **Cifra correcta**. `public/images/constructors/` tiene 8: `alfa, alpine, audi, haas, mclaren, mercedes, sauber` (+`williams`). Faltan ferrari, red_bull, aston_martin, rb, cadillac, alphatauri. Matiz no dicho: de los **11 equipos de 2026 solo 6 tienen logo** (alfa y sauber son históricos) | **NO HECHO** (declarado; cifra engañosa a favor) |
| Personalización por equipo favorito (§8.7, plan:147) | **Cero implementación**. `grep favoriteTeam\|teamAccent` → 0 resultados. `FavoritesContext.tsx` es el marcador de 2025 (listas de pilotos/equipos en localStorage), no tiñe nada | **NO HECHO y NO REGISTRADO COMO PENDIENTE** |
| Push post-GP (§8.8, plan:148) | Sin `push`/`notificationclick` en `public/sw.js`; sin workflow cron (`.github/workflows/` solo tiene `ci.yml`). El "modo offline" del mismo punto sí está | **NO HECHO** (atribuible a S5 en curso; el offline sí, el push no) |

## 3. Huecos silenciosos — prometido, no hecho, NO registrado como deuda

Este es el hallazgo principal.

| # | Promesa (cita y línea) | Código real | Veredicto |
|---|---|---|---|
| 1 | §8.7 plan:147 "**Personalización por equipo favorito** (tiñe el acento de la app)" — también plan:105 | Nada. Ni token, ni preferencia, ni selector | **NO HECHO / NO REGISTRADO** |
| 2 | §11 S3 plan:191 "primitivos UI (**Card/Table/Chip/Sheet**)" | `src/components/ui/` tiene `card.tsx`, `button.tsx`, `TimingRow`, `CountryFlag`, `Skeleton`, `SeasonSelector`, `OptimizedImage`. **No hay Table, Chip ni Sheet**. PROGRESO:176 redefine el entregable ("Card, TimingRow y CountryFlag") sin decir que faltan tres | **PARCIAL / NO REGISTRADO** |
| 3 | §11 S3 plan:191 + §6 plan:118 "**tablas priority+** (POS·piloto·tiempo·neumático visible, resto en row-expand/sheet) o primera columna congelada" | Solo `overflow-x-auto` (`RaceDetailClient.tsx:183,401`, `results/page.tsx:66`). Ni row-expand, ni columna congelada, ni ocultación por prioridad. `grep priority+` → 0 | **NO HECHO / NO REGISTRADO** |
| 4 | §8.2 plan:142 "Página de circuitos: grid de trazados SVG, **ficha con datos e historial de ganadores desde la BD**" | `src/app/circuits/page.tsx` es solo el grid. **No existe `/circuits/[circuitId]`**; la tarjeta enlaza a `/calendar?season=`. PROGRESO:180 lo cierra como "contador de carreras e historial", lo cual sobrevende el `_count` y un enlace de año | **PARCIAL / NO REGISTRADO** |
| 5 | §8.5 plan:145 "Standings con evolución: gráfico… + **animación FLIP**"; §6 plan:118 "`layout` FLIP para reordenar posiciones, **number ticking**" | El gráfico sí. `grep layout=\|layoutId` en `standings/page.tsx` → 0; ningún number ticking | **PARCIAL / NO REGISTRADO** |
| 6 | §6 plan:118 "**`useReducedMotion` global**" | `grep useReducedMotion\|prefers-reduced-motion src/` → **0 resultados**, con framer-motion animando en 6 componentes (`PageTransition`, `DriverCard`, `ConstructorCard`, `FavoriteButton`, `ThemeToggle`, `DriverSelector`) | **NO HECHO / NO REGISTRADO** (accesibilidad) |
| 7 | PROGRESO:21 "2010–2026 completo" vs `package.json:26` `seed:all` → `seed:season -- 2023 2024 2025 2026` | El orquestador declarado como entregable de S1 solo reproduce 4 de las 17 temporadas. La BD está bien poblada, pero no es reproducible desde `seed:all` | **PARCIAL / NO REGISTRADO** |
| 8 | §3.1 plan:36 "`/favorites` (limitado a los primeros 50 pilotos de la API)" | Sigue igual: `src/app/api/drivers/route.ts:24` `take: limit ? … : 50`, consumido por `FavoritesGrid.tsx:22`. Con **84 pilotos en BD**, ~34 son inalcanzables desde favoritos. Nunca entró en la lista de deuda de PROGRESO | **NO HECHO / NO REGISTRADO** (empeorado por S1) |
| 9 | §9.8 plan:163 "limpiar código muerto"; §3.1 plan:40 "`jolpica/transformers.ts` muerto" | `src/services/jolpica/transformers.ts` sigue, solo re-exportado por `jolpica/index.ts:6`. Igual `SpeedChart.tsx` y `TelemetryComparison.tsx`: solo salen del barrel `components/telemetry/index.ts:5,6`, ninguna página los usa (los sustituyó `TelemetryChart`). `src/hooks/` sigue con solo un README | **NO HECHO / NO REGISTRADO** |

## 4. Inexactitudes menores

- **`williams.webp`, no `.svg`** — §7 plan:131 promete "11 SVG en `public/images/constructors/{constructorId}.svg`". Es el único que no es SVG.
- **Duplicación de colores de compuesto**: `LapTimesTable.tsx:16` mantiene su propio `COMPOUND_COLORS` hardcodeado pese a que S3 los centralizó en `src/lib/team-colors.ts`.
- **`userScalable: false` + `maximumScale: 1`** (`layout.tsx:74-75`): el plan (§5.6) pedía resolver el focus-zoom con `text-base md:text-sm` — que también se hizo —, no bloqueando el zoom. Bloquear el zoom es una regresión de accesibilidad no documentada.
- **`slowapi` / rate limiting** (§10 plan:180) no está en `python-service/requirements.txt` — imputable a S5 en curso.

## 5. Lectura de método

El fenómeno diagnosticado para los estados de carga ("la verificación de cada sprint fue siempre *lint + type-check + build*… la app compila igual de bien sin estados de carga") **se repite idéntico en los 9 puntos de la sección 3**: `useReducedMotion`, tablas priority+, primitivos Table/Chip/Sheet, ficha de circuito, FLIP, personalización por equipo y el tope de 50 pilotos son todos huecos que compilan sin error. La corrección de método propuesta (recorrido real de la app) los detectaría *en parte* — pero no detectaría los tres primeros, que requieren **contrastar el cierre de cada sprint contra su lista original de alcance**, y eso es lo que no se hizo en ningún sprint.