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

**Fase**: 🟡 **Sprint 5 en curso** (2026-08-17) — **la web está en producción**: https://apexdata.meeks.fun · Sprints 0–4 completados (2026-08-16).

**Cobertura de datos**: **2010–2026 completo** (17 temporadas) — resultados, clasificación y standings oficiales. 84 pilotos, 25 equipos, 55 circuitos.

**Imágenes**: 29 fotos de pilotos, 36 trazados de circuitos, 36 banderas y 8 logos de equipo, todo autoalojado en `public/images/` y vinculado en la BD.

**El repo está verde**: `npm run lint` (0 errores), `npm run type-check` (limpio por primera vez en el proyecto) y `npm run build` pasan. CI configurado en GitHub Actions.

**PWA**: instalable en iOS con icono propio, splash nativa, barra de pestañas inferior, modo offline y aviso de actualización.

**Próximo paso**: **Sprint 5 — Producción** (deploy en Vercel + el VPS para el servicio Python, cron semanal de datos, checklist de seguridad, push post-GP, y la pantalla de administración para importar temporadas). Después, **Sprint 6 — Auditoría de experiencia de uso**, añadido el 2026-08-17.

**Tests**: 36 unitarios (TypeScript) + 14 (Python). Bloquean el despliegue en CI, igual que en plastik. Cubren lo que estuvo mal en silencio: detección de abandonos, horas reales de carrera, agregación por temporada, cara a cara, y serialización de telemetría.

### Deuda técnica conocida (documentada, no bloqueante)
- ~~Colisión del modelo `Constructor`~~ → **resuelto en S3**: el modelo se llama `Team` (con `@@map("constructors")`, sin tocar la BD) y el workaround de `src/lib/prisma.ts` desapareció.
- La página `/telemetry` (OpenF1) sigue siendo un demo; conviene fusionarla con `/analysis`.
- El comparador `/compare` calcula stats sobre las últimas 5 carreras (engañoso); el head-to-head del perfil de piloto ya lo sustituye, falta retirarlo.
- El venv local tiene FastF1 3.7.0 aunque `requirements.txt` pide ≥3.8 (necesario para 2026): ejecutar `pip install -r requirements.txt` en el venv.
- Pendientes de S4 no abordados: mapa del circuito coloreado por velocidad y gráfico de estrategia de neumáticos.
- 11 warnings de lint (variables sin usar, algún `any`) — limpieza cosmética pendiente.
- 🔴 **Faltan estados de carga en la mayoría de la app** (detectado por Frank el 2026-08-17 probando en local): solo 6 de 14 páginas tienen `loading.tsx` y no hay un solo `<Suspense>` en el proyecto, así que al navegar a `/`, `/results`, `/circuits`, `/compare`, `/favorites`, `/analysis` o una ficha de equipo el navegador se queda sin ningún indicio hasta que termina la consulta. Tampoco hay caché (`revalidate`) en ninguna página. → **Sprint 6**, ver el plan de referencia.
- 🔴 **Auditoría triple del 2026-08-17** (retroalimentación · accesibilidad/móvil · veracidad de la documentación): el alcance completo quedó consolidado en la sección **"S6 — alcance completo"** del plan de referencia. Lo más grave: `useReducedMotion` inexistente, foco de teclado invisible, zoom bloqueado, tokens de timing definidos pero sin usar (tiempos ilegibles en tema claro y semántica broadcast invertida), gráficos invisibles en tema claro, ninguna tabla con priority+, Favoritos roto a partir del piloto 51, y **9 promesas del plan sin implementar ni registrar como deuda** (personalización por equipo, Table/Chip/Sheet, ficha de circuito, FLIP, `seed:all` incompleto…). La documentación resultó veraz en lo que afirma e incompleta en lo que omite: el cierre de cada sprint nunca se contrastó contra su alcance original.

**Decisiones tomadas**:
- ✅ **Todo en el VPS de Frank vía EasyPanel** (2026-08-17). Se descartó Vercel al descubrir que plastik ya se despliega en ese VPS con `git push` → GitHub Actions → webhook de EasyPanel, **sin necesitar acceso SSH**: el panel es web (`panel.dittochatbot.com`). El argumento a favor de Vercel era precisamente poder desplegar desde casa, y eso ya estaba resuelto.
- ✅ **Hosting del microservicio Python: el mismo VPS** (2026-08-16). Frank ya tiene un VPS con varios aplicativos desplegados; el servicio FastF1 (que ya tiene Dockerfile) se despliega ahí en S5. Esto elimina el único coste previsto (~$5/mes de Railway) → **coste total del proyecto: $0/mes**. Pendiente de recabar en S5: proveedor/SO del VPS, RAM/disco disponibles, si usa Docker y qué reverse proxy (Nginx/Caddy/Traefik) sirve los demás aplicativos.

**Decisiones pendientes**:
- [ ] Ampliar el histórico más atrás de 2010 (opcional; ~10 min por temporada, desatendido).
- [ ] Subdominio para la app (p. ej. `apexdata.izistoreperu.com`) — se elige al crear la app en EasyPanel.

---

## Acciones pendientes de Frank

1. ~~**Desplegar la web en EasyPanel**~~ → hecho el 2026-08-17: https://apexdata.meeks.fun. **Queda pendiente el servicio de telemetría**: app aparte con `python-service/Dockerfile`, **volumen en `/app/cache`** (sin él, FastF1 vuelve a descargar cientos de MB en cada reinicio), puerto 8000, `CORS_ORIGINS` con el dominio de la web y `ENVIRONMENT=production` para ocultar la documentación de la API. Después, añadir `FASTF1_SERVICE_URL` a las variables de la web. Y resolver la comprobación de cutover del CI, que sigue fallando.
2. **6 logos de equipo** que no están en fuentes libres (son marcas registradas): Ferrari, Red Bull, Aston Martin, RB, Cadillac y AlphaTauri. Descargar el SVG de cada uno (Brandfetch, seeklogo o la web oficial) y guardarlo como `public/images/constructors/<constructorId>.svg` — exactamente: `ferrari.svg`, `red_bull.svg`, `aston_martin.svg`, `rb.svg`, `cadillac.svg`, `alphatauri.svg`. Después ejecutar `npm run images:link`. Sin esto, esos equipos muestran sus iniciales en un recuadro (no se rompe nada).
3. ~~Decidir cuánto histórico cargar~~ → hecho: 2010–2026 completo.

---

## Bitácora

### 2026-08-17 (5) — Auditoría triple de experiencia de uso 🔍

A raíz del hallazgo de los estados de carga, Frank pidió auditar el proyecto con agentes expertos en busca de más omisiones del mismo tipo. Tres agentes en paralelo: **retroalimentación al usuario**, **accesibilidad/móvil contra las reglas del propio plan**, y **veracidad de la documentación** (contrastó lo declarado contra el código y la BD reales — los conteos declarados son exactos y los 36 tests pasan).

**Los tres informes íntegros están en `docs/AUDITORIA_UX_2026-08-17.md`** (guardados en el repo precisamente para poder trabajar desde cualquier máquina sin el contexto de la conversación). El alcance consolidado y priorizado, en la sección **"S6 — alcance completo"** del plan de referencia.

Diagnóstico transversal: **la infraestructura de diseño se construyó bien, pero las páginas no la consumen** (tokens sin usar, componentes modelo que el resto no imita). Y una segunda corrección de método: la documentación es veraz en lo que afirma pero incompleta en lo que omite — 9 promesas del plan desaparecieron sin quedar registradas como deuda, y eso solo lo detecta **contrastar el cierre de cada sprint contra su lista de alcance original**, que desde ahora es parte del cierre junto con el recorrido real de la app.

También de Frank, mismo día: mostrar la **fecha de nacimiento** de los pilotos junto a la edad (ya está en BD; `/compare` ya la muestra). Al verificarlo se encontró que el cálculo de edad es `año − año`: todo piloto que no ha cumplido aparece un año más viejo. Ambos en S6.

### 2026-08-17 (4) — La web, en producción 🟡

**ApexData está publicada en https://apexdata.meeks.fun**, servida desde el VPS vía EasyPanel, con HTTPS y consultando Supabase (`/api/health` responde `database: ok`). Queda pendiente el servicio de telemetría.

**Dominio propio.** Frank descartó `apexdata.izistoreperu.com`: el dominio es de la empresa donde trabaja y la app es suya. Tampoco quiso pagar por uno. Se revisó qué opciones gratuitas existen (subdominios de terceros tipo `is-a.dev`, `eu.org`, DuckDNS) y se aclaró que Cloudflare no regala dominios: solo gestiona zonas que ya poseas. Finalmente **compró `meeks.fun` en Hostinger**, lo delegó a Cloudflare y creó `apexdata.meeks.fun` → `161.132.4.18`, **con el proxy desactivado (nube gris)**, sin lo cual Let's Encrypt no puede validar el dominio.

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

Frank preguntó por qué desplegar en Vercel si el VPS ya estaba decidido, y tenía razón: la recomendación partía de una suposición equivocada. Plastik ya se despliega en ese VPS con `git push` → GitHub Actions → webhook de EasyPanel, y **EasyPanel es un panel web**, así que no hace falta acceso SSH ni estar en una red concreta. Se adopta el mismo patrón para ApexData.

Preparado en el repo (siguiendo el Dockerfile de plastik y sus lecciones documentadas):
- **`Dockerfile`** con `output: 'standalone'` y el tope de heap en 2048 MB, deliberadamente **por debajo** de la RAM del host: ponerlo por encima hace que el OOM killer mate el build sin mensaje, y el síntoma se confunde con otra cosa.
- **`/api/health`** que reporta `buildId` y `startedAt`, para que "¿está mi código en producción?" sea una comparación y no una suposición.
- **Job `deploy` en CI** que dispara el webhook solo si lint, tipos y build pasan, y espera el cutover comparando el arranque del contenedor con la marca de tiempo del push. Documentado el aviso de plastik: **la integración nativa de EasyPanel con GitHub debe quedar desactivada**, o las dos construcciones se cancelan entre sí.
- `.dockerignore` que excluye `python-service` (será una app aparte en EasyPanel).

Pendiente de Frank en el panel: crear las dos apps, configurar variables, obtener el webhook y añadirlo como secret.

### 2026-08-16 (9) — Preparación para despliegue

Frank no tiene acceso al VPS desde casa, así que se adelanta la parte del Sprint 5 que **no lo necesita**: el frontend en Vercel (Vercel y Supabase son ambos servicios en la nube; el VPS solo aloja el microservicio Python).

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
