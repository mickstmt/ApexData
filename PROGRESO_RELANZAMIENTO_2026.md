# ApexData — Progreso del Relanzamiento 2026

> **Documento vivo del plan definido en `AUDITORIA_Y_PLAN_RELANZAMIENTO_2026.md`.** Se actualiza con cada cambio, por mínimo que sea.
> Si estás retomando el trabajo desde cualquier máquina (casa u oficina), este archivo + el plan de referencia contienen TODO el contexto necesario. Instrucción para Claude: leer ambos documentos completos antes de tocar código.

---

## Reglas de trabajo acordadas

1. **Este documento se actualiza siempre**: cada sesión de trabajo termina con una entrada en la bitácora y el estado actualizado, y se commitea/pushea para que esté disponible desde cualquier lugar.
2. **Acciones del usuario**: cuando algo requiera acción manual suya, se indica con máximo detalle, sin asumir conocimientos ni pasos previos. Si son varios pasos: primero un resumen corto de qué se va a hacer, y después SIEMPRE paso a paso, uno por uno, esperando confirmación antes de seguir, para evitar errores y estancamientos.
3. **Herramientas**: se usan agentes especializados por ámbito, skills de Claude Code (dataviz, code-review, security-review), e investigación en internet cuando haga falta. **Esta regla se incumplió durante toda la sesión del 2026-08-19 y salió cara** (ver bitácora): desde entonces el repo tiene sus propias skills en `.claude/skills/` — `verificar`, `desplegar` y `cerrar-sesion` — que recogen el método para que no dependa de acordarse.
4. **Cada sprint cierra con la app corriendo y verificada**, no con promesas.

---

## Estado actual

**Fase**: 🟢 **Sprint 6 cerrado** (2026-08-19), con su alcance contrastado punto por punto y los recortes anotados — la web y la telemetría en producción: https://apexdata.meeks.fun · Sprint 5 cerrado con recortes anotados · Sprints 0–4 completados (2026-08-16).

**Cobertura de datos**: **2010–2026 completo** (17 temporadas) — resultados, clasificación y standings oficiales. 84 pilotos, 25 equipos, 55 circuitos.

**Imágenes**: 29 fotos de pilotos, 36 trazados de circuitos, 36 banderas y 8 logos de equipo, todo autoalojado en `public/images/` y vinculado en la BD.

**El repo está verde**: `npm run lint` (0 errores), `npm run type-check` (limpio por primera vez en el proyecto) y `npm run build` pasan. CI configurado en GitHub Actions.

**PWA**: instalable en iOS con icono propio, splash nativa, barra de pestañas inferior, modo offline y aviso de actualización.

**Próximo paso**: lo que queda de la deuda del Sprint 5 —aviso push tras cada GP, pantalla de administración, y el límite de peticiones con `slowapi`, que es el único que pide Deploy manual del servicio—, . El respaldo con `pg_dump` y el escaneo de secretos ya salen de esa lista: el primero hecho el 2026-08-20 y comprobado restaurándose, el segundo activado ese mismo día junto con la protección de subida. Queda además el mantenimiento: los 6 logos que faltan, Prisma 6→7 y los 14 avisos de lint.

**Tests**: 96 unitarios (TypeScript) + 28 (Python) + **24 de navegador (Playwright), que desde el 2026-08-18 corren también en CI** con acceso a la base de datos. Bloquean el despliegue en CI, igual que en plastik. Cubren lo que estuvo mal en silencio: detección de abandonos, horas reales de carrera, agregación por temporada, cara a cara, serialización de telemetría, el orden de los tiempos de vuelta, la edad de los pilotos y que cada equipo tenga un color visible en tema claro.

### Deuda técnica conocida (documentada, no bloqueante)
- ~~Colisión del modelo `Constructor`~~ → **resuelto en S3**: el modelo se llama `Team` (con `@@map("constructors")`, sin tocar la BD) y el workaround de `src/lib/prisma.ts` desapareció.
- ~~El venv local tiene FastF1 3.7.0~~ → resuelto el 2026-08-19: se creó `python-service/.venv` desde `requirements-dev.txt`, con **FastF1 3.8.3**. Está en `.gitignore`, así que es de esta máquina.
- ~~Pendientes de S4: mapa del circuito por velocidad y estrategia de neumáticos~~ → **hechos el 2026-08-19**, con dos endpoints nuevos en el servicio Python. **Exigen pulsar *Deploy* a mano en el panel**: sin eso, los dos botones nuevos de `/analysis` responden con error en producción.
- 15 warnings de lint (variables sin usar, algún `any`) — limpieza cosmética pendiente.
- 🟡 **Estados de carga: la mayor parte, resuelta el 2026-08-18**. De 6 páginas con `loading.tsx` se pasa a 12, la home transmite por partes con `<Suspense>` y las páginas históricas tienen caché de una hora. Queda pendiente el `<Suspense>` de la ficha de piloto (5 consultas secuenciales), que es la mitad del punto 6 del orden de ataque.
- **Recortado de S5 el 2026-08-18, decisión del usuario** (se registra en lugar de desaparecer, que era justo el fallo de método diagnosticado):
  - **Push post-GP** (§8.8 del plan): sin `push` ni `notificationclick` en `public/sw.js`.
  - **Pantalla de administración para importar temporadas**: no existe `src/app/admin`.
  - **Checklist de seguridad de §10**: el RLS de Supabase se hizo el mismo día que se listó; el **respaldo mensual con `pg_dump`** quedó hecho y comprobado el 2026-08-20; y ese mismo día el usuario activó en GitHub el **escaneo de secretos** y la **protección de subida**, que son ajustes de la cuenta y no del código. Queda solo el *rate limiting* (`slowapi`) del servicio Python — y conviene decidir antes si aplica: el servicio se dejó **sin dominio** el 2026-08-18, así que hoy no tiene superficie pública que limitar.
- 🟡 **Logos de equipo** (detectado por el usuario el 2026-08-18 mirando `/constructors`). Resueltos dos de los tres defectos: el **encuadre** —la caja era cuadrada de 48 px y los logos van de 1,09:1 a 4,8:1, así que un wordmark se dibujaba a 48×10 px— y la **legibilidad por tema**, porque el archivo trae la tinta fija; ahora se pintan como silueta monocroma, negra en claro y blanca en oscuro. De paso se quitó de `sauber.svg` un fondo blanco que cubría el lienzo. **Sigue pendiente** lo que exige acción manual: las **6 marcas sin logo** (Ferrari, Red Bull, Aston Martin, RB, Cadillac, AlphaTauri) y que `williams` es `.webp` en vez de SVG.
- 🟢 **Tablas priority+: resueltas el 2026-08-19**, sobre mockup y con la opción elegida por el usuario. En móvil, cada fila enseña lo esencial —posición, piloto y tiempo— y despliega el resto al tocarla; a partir de `md`, la tabla de siempre. El ancho del documento pasa de ~900 px a **390** en `/results` y en la ficha de carrera, y las cuatro tablas anchas comparten un primitivo nuevo, `PriorityRows`, que es además parte de la deuda «primitivos Table/Chip/Sheet» del informe 3.
- 🟢 **Semántica, teclado e idioma: resueltos el 2026-08-19**. Las pestañas de sesión son pestañas de verdad (`tablist`/`tab`/`tabpanel`, con flechas); las 6 tablas asocian celda y cabecera (**37 `scope="col"` y 6 leyendas**, donde antes había cero de ambas); el buscador de `/compare` es un combobox manejable con teclado y su botón de quitar tiene nombre; ningún control baja de 44 px en móvil —con la densidad de escritorio intacta a partir de `md`—; y las cabeceras, fechas y mensajes que estaban en inglés pasan al español de la app.
- 🟢 **Estados de error y vacío: resueltos el 2026-08-19**. Existe `global-error.tsx` —hasta ahora un fallo del layout raíz daba la pantalla en blanco del navegador—, `/standings` distingue un fallo de base de datos de una temporada sin sembrar, y una carrera sin resultados avisa en vez de pintar una tabla con cabeceras y ninguna fila.
- ⚪ **`PageTransition`: medido y descartado**. La auditoría lo acusaba de retrasar 300 ms todos los esqueletos. Medido en navegador contra la implementación alternativa: **96-123 ms antes, 81-85 ms después**. La penalización real era de ~20 ms, y quitar `mode="wait"` hace que la página que sale y la que entra convivan en el flujo, con riesgo de duplicar el alto un instante. No compensa: se deja como estaba.
- 🟢 **Consultas encadenadas: resueltas el 2026-08-19**. `/standings` pedía el equipo de cada piloto **ronda por ronda**, hasta 24 viajes en serie: la temporada 2015 tardaba **16,5 s** en pintarse y la 2024, 10 s. Ahora la parrilla de la última ronda viene con las tablas y solo se hace una segunda consulta si falta algún piloto — 2,8 s y 3,0 s. La ficha de piloto encadenaba 6 consultas antes del primer byte; con `<Suspense>`, la cabecera aparece a los 514 ms y las estadísticas entran después. La ficha de equipo traía **todos** los resultados históricos con sus joins (Ferrari, 676 filas) para mostrar tres contadores: ahora se cuentan y se suman en la base. Y `/compare` arrastraba carrera, temporada y equipo de cada resultado, que esa pantalla **no lee**: 160-220 ms → 15-47 ms.
- 🟢 **Latencia: resuelta el 2026-08-19** pasando la app al puerto 5432 (modo sesión) con `connection_limit=5`. Medido en producción antes/después: `/api/health` **540 → 155 ms**, `/standings?season=2015` **2.963 → 1.699 ms**, `/standings?season=2024` **2.837 → 1.268 ms**, home **~1.400 → ~1.140 ms**. Queda como nota histórica lo que se midió: el pooler en modo transacción (6543) cobraba ~400 ms por consulta sobre el mismo host, porque está pensado para serverless —un proceso por petición— y aquí hay un contenedor permanente.
- ⚪ **Medido y descartado por ahora: Postgres en el VPS.** Daría ~1 ms por consulta frente a los 101 ms de red hasta Virginia, pero con la conexión directa ya resuelta, el salto restante no compensa asumir backups y actualizaciones propios. Queda anotado por si algún día la latencia vuelve a molestar.
- ⚪ **Nota histórica: el pooler cuesta 5× lo que la conexión directa** (medido el 2026-08-18; no se ha cambiado nada, por decisión del usuario). Sobre el mismo host `aws-1-us-east-1`: una `SELECT 1` por el **pooler (6543)** tarda **506 ms**; por la **conexión directa (5432)**, **101 ms**, que es exactamente el ida y vuelta de red hasta Virginia. Además `connection_limit=1` serializa: cinco consultas en paralelo tardan lo mismo que en fila india. Se nota donde no hay caché: la home, con 4 consultas encadenadas, tarda **1,4 s**, y `/api/health`, con una sola, **540 ms**; las páginas con `unstable_cache` responden en 55-90 ms y estaban tapando el problema. El pooler tiene sentido en serverless, donde cada petición es un proceso nuevo; aquí hay un contenedor permanente.
- **El servicio de telemetría no tiene despliegue automático**: el CI solo dispara el webhook de la web, así que un cambio en `python-service/` exige pulsar *Deploy* a mano en el panel.
- 🟢 **Auditoría triple del 2026-08-17: cerrada el 2026-08-19.** Los tres informes se contrastaron punto por punto contra el código (ver la bitácora de cierre). Del informe 1 y del 2 no queda nada sin resolver o sin recortar explícitamente. **Recortado a propósito, con motivo**: (a) `PageTransition` —la acusación de 300 ms era de ~20 ms medidos, y el arreglo tenía un riesgo peor que el defecto—; (b) el `role="img"` de `TelemetryChart`, sin alternativa textual, porque una vuelta son miles de muestras y una tabla equivalente no es legible —el gráfico del campeonato sí la tiene—; (c) la «golden rule» de safe-area en `Header`, que se desvía del plan pero funciona por su altura fija. **Del informe 3 (huecos silenciosos) siguen abiertos** los puntos 1, 2 (parcial: existe `PriorityRows`, faltan Chip y Sheet), 4, 5, 7 y 9, listados abajo.

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
2. 🔴 **Pulsar *Deploy* en el servicio de telemetría OTRA VEZ** (el del 2026-08-19 ya se hizo; este es por la corrección de la ronda, que es la que arregla «no hay datos de Verstappen») (`apexdata-telemetry`, proyecto `ditto`, en panel.dittochatbot.com). El código nuevo ya está en el repo, pero ese servicio no se despliega solo: hasta entonces, los botones «Trazado» y «Estrategia de neumáticos» de `/analysis` dan error en producción.
3. **6 logos de equipo** que no están en fuentes libres (son marcas registradas): Ferrari, Red Bull, Aston Martin, RB, Cadillac y AlphaTauri. Descargar el SVG de cada uno (Brandfetch, seeklogo o la web oficial) y guardarlo como `public/images/constructors/<constructorId>.svg` — exactamente: `ferrari.svg`, `red_bull.svg`, `aston_martin.svg`, `rb.svg`, `cadillac.svg`, `alphatauri.svg`. Después ejecutar `npm run images:link`. Sin esto, esos equipos muestran sus iniciales en un recuadro (no se rompe nada).
4. ~~Decidir cuánto histórico cargar~~ → hecho: 2010–2026 completo.

---

## Bitácora

### 2026-08-20 (19) — Un respaldo que se restaura solo para demostrar que sirve ✅

**El plan gratuito de Supabase no hace copias.** Hasta hoy, si algo se borraba no había de dónde recuperarlo — y no es teórico: esta misma sesión descubrió que a 2025 le faltaban dos carreras enteras sin que nadie lo hubiera notado.

Ahora, el día 1 de cada mes: `pg_dump` del esquema `public` en formato `custom`, guardado 90 días como artefacto. **973 KB** para los 21 MB que ocupa la base. Los esquemas internos de Supabase se quedan fuera porque esta app no los usa y solo añaden ruido al restaurar.

**Lo que lo convierte en respaldo y no en un archivo**: el mismo trabajo levanta un Postgres de usar y tirar, restaura el volcado allí y **compara las filas de cuatro tablas contra el origen**. Si no cuadran, falla el mes que toca y no el día que haga falta de verdad. El código de salida de `pg_restore` no vale como prueba —una base de Supabase trae extensiones que un Postgres limpio no tiene—, así que la prueba son las filas.

**Falló a la primera, y el fallo enseña algo.** `pg_dump: server version 17.6, pg_dump version 16.15`. Instalar `postgresql-client-17` no basta: sus binarios quedan en `/usr/lib/postgresql/17/bin` y el `pg_dump` del `PATH` es un envoltorio que seguía eligiendo el 16. Pero lo importante es **por qué no se cazó antes**: el paso de instalación terminaba con `pg_dump --version`, que imprimía «16.15» y pasaba en verde. **Imprimir no es comprobar.** Ahora hay un paso que falla si la versión no es la que hace falta.

**Y el workflow se ejecuta al cambiar su propio archivo**, porque verificar un respaldo no puede depender de que alguien se acuerde de pulsar un botón: la primera versión solo se descubrió rota al ejecutarla a mano.

De paso, `upload-artifact` v4 → v7 también en el CI: era deuda de mantenimiento y salía como aviso de Node 20 en cada ejecución.

### 2026-08-20 (18b) — Sin logo, el nombre del equipo hace de logo ✅

Diecisiete de los veinticinco equipos de la base no tienen archivo de logo, y la mayoría no lo tendrá nunca: son escuderías desaparecidas. De los once actuales faltan cinco —Ferrari, Red Bull, Aston Martin, RB y Cadillac— y tampoco es descuido: **sus marcas están registradas y no viven en Wikimedia con licencia libre**, que es de donde el script baja las demás. Buscarlas por internet no lo arregla; es una decisión sobre marcas, no una búsqueda.

Lo que había eran dos letras en verde oliva —«FE», «RE»— dentro de un recuadro: parecía un hueco. Ahora es el nombre del equipo en la tipografía de títulos con **su** color, derivado legible por tema, porque el color de marca crudo no vale como tinta. Se recorta la coletilla: lo que identifica es «Cadillac», no «Team».

Esto no sustituye a los archivos —cuando los haya, se dejan en `public/images/constructors/` y el seeder los recoge—, pero hace que su ausencia parezca una decisión y no un fallo. Y para las diecisiete escuderías históricas es la solución definitiva.

### 2026-08-20 (18) — Chip y Sheet: los dos primitivos que faltaban del S3 ✅

Con estos se cierra el entregable «primitivos UI (Card/Table/Chip/Sheet)» que el informe 3 marcó como parcial: Card existía, Table quedó cubierto por `PriorityRows` el 2026-08-19, y hoy entran los dos últimos.

**Chip: refactor invisible, con tres tonos que salen de tres papeles reales.** No lo pide la estética sino la repetición: «HOY» y «FINALIZADO» en el calendario y el código del piloto en su tarjeta se dibujaban cada uno con su mezcla de `rounded-*`, `px-*` y `text-xs`. Tonos: `solido` para el estado que hay que ver primero, `apagado` para lo que ya pasó, `suave` para identificar sin alarmar. Y `ChipSeleccionable`, que es un botón de verdad con `aria-pressed` —lo que distingue «elegido» de «pulsado» para quien no ve la pantalla— y 44 px de alto. Adoptado en cuatro sitios; verificado en navegador: 11 etiquetas en el calendario, el código del piloto en 46×24 y los 12 chips del selector de equipo, ninguno por debajo de 44 px.

**Sheet: una hoja inferior, y el motivo no era estético.** El menú de secciones cerraba con `Escape` y devolvía el foco —eso ya estaba bien—, pero **no atrapaba el foco**: tabulando se salía hacia la página de detrás sin cerrarlo, y tampoco cerraba al tocar fuera. Va sobre `<dialog>` con `showModal()`, que da de fábrica lo que habría que escribir a mano y equivocarse: foco atrapado, `Escape`, foco devuelto al botón, velo y el fondo inerte.

**Elegido sobre mockup, con cuatro comportamientos funcionando.** El usuario preguntó por el cajón lateral que usa X, así que se añadieron sus dos versiones al mockup con lo que implican: en X el disparador vive arriba a la izquierda y por eso el panel entra por ahí, mientras que aquí el botón está a la derecha —copiar el lado obligaría a mover el botón—; y en el iPhone instalado **el borde izquierdo está reservado al gesto de volver atrás**, así que un cajón por ahí compite con él. Elegida la hoja inferior; el cajón queda anotado como opción para otra función.

**Medido, no supuesto**: doce tabulaciones seguidas con la hoja abierta y **ninguna cae en la página de detrás** —la única salida es el `<body>`, que es el punto donde el navegador cierra su propio ciclo—, `Escape` cierra y el foco vuelve al botón, y tocar el velo cierra. El relleno inferior da 20 px en el navegador, que es el mínimo de la regla de zona segura; en el iPhone instalado crece solo.

**Una decisión que conviene no deshacer**: la hoja **solo se anima al entrar**. Animar también el cierre obliga a esperar al final de la animación antes de cerrar el diálogo, y una hoja que tarda en irse se siente rota. Con «reducir movimiento» no se anima nada.

**Verificado**: 96 unitarias, **24 de navegador** (2 nuevas) y 28 de Python.

### 2026-08-20 (17) — El sembrador completo, dos carreras que faltaban y el acento del equipo ✅

**El comando de reconstrucción cubría 4 de las 17 temporadas.** `seed:all` llevaba «2023 2024 2025 2026» escrito a mano y repetido en dos comandos, así que el procedimiento documentado para levantar la base de cero reproducía menos de una cuarta parte de lo que hay en producción. Ahora las temporadas salen de un único módulo con pruebas —de 2010 al año en curso, así que en enero entra la nueva sin tocar código— y los dos sembradores aceptan `--todas`, `--current`, años sueltos o `--listar`, que enseña qué harían sin tocar nada. De paso dejan de pedirse los sprints anteriores a 2021, que no existían: **215 de las 1.562 peticiones** que cuesta la reconstrucción completa.

**Verificado sin escribir en la base, porque la única configurada es la de producción.** `scripts/seed/comparar.ts` contrasta una temporada de Jolpica contra lo guardado. Pasado por las diecisiete: **7.153 resultados comparados**, y dieciséis temporadas con **cero diferencias**.

**Y la diecisiete destapó un agujero real: a 2025 le faltaban las dos últimas carreras.** Qatar y Abu Dabi, 22 de 24, sin resultados ni clasificación. El calendario sí estaba, así que la app las mostraba como carreras existentes y vacías. Nadie lo había notado —y no había forma de notarlo: **como el comando solo sembraba cuatro temporadas, nadie podía contrastar lo que había**. Es exactamente el daño que esta deuda estaba causando en silencio, no una molestia teórica.

Sembrada 2025 de verdad, que además probó el camino de escritura: 24 carreras, 479 resultados y **cero diferencias** al volver a compararla; la clasificación llega ya hasta la ronda 24, con Norris campeón con 423 puntos.

**El acento por equipo favorito (§8.7 del plan), elegido sobre mockup.** Se propusieron cuatro grados de teñido sobre la misma pantalla con datos reales, y el usuario eligió **acento y ambiente**: el equipo tiñe botones, enlaces, cifras y anillo de foco, y además vela la barra superior, las cifras de las fichas y sus filas en la clasificación.

**La medida que decidió cómo se implementa**: `--primary` hace dos trabajos en esta app —relleno de botón y tinta de texto—, y el color de marca crudo no sirve para lo segundo. **Seis de los once equipos actuales están por debajo de 3:1 sobre el fondo claro**: Mercedes 1,31, Audi 1,48, Williams 1,80, Alpine 2,08, McLaren 2,35, RB 2,75. Así que el acento se deriva a grado texto (4,5:1) por tema, y el color puro queda solo para el ambiente, que se pinta al 12 %. Medido en la página real con Mercedes: **de 1,31:1 a 4,88:1 en claro** y 13,99:1 en oscuro.

**Dos cosas que las pruebas pillaron y la vista no:**

1. El dorado de Cadillac se quedaba en **4,39:1 en oscuro**: los valores `onDark` de la paleta se escribieron para rayas (3:1), no para texto. Ahora también se derivan.
2. El mismo dorado se derivaba correcto a 4,51:1 y **llegaba al documento con 4,39:1**, porque redondear los canales HSL del token al entero movía la luminancia. Los tokens llevan un decimal.

**Un apunte de método**: teñir la app entera no tocó ni un componente. Los tokens de ApexData son canales HSL, así que reescribir cuatro variables en el documento basta para que el acento recorra botones, enlaces, gráficas y focos. Lo único que no se puede hacer así es teñir *las filas de tu equipo*, porque exige **comparar** el equipo de la fila con el elegido y CSS no compara atributos: eso va como una regla escrita a la medida del equipo elegido.

**Verificado**: 96 pruebas unitarias (34 nuevas: las once escuderías comprobadas en los dos temas), 22 de navegador (2 nuevas) y 28 de Python. Recorrido real en claro y oscuro.

### 2026-08-20 (16) — La revisión de código que faltaba, y lo que encontró ✅

El cierre de ayer se saltó el paso 1 del método —`code-review` antes de commitear— y quedó anotado como pendiente. Hoy se pasó sobre los tres commits del día anterior: **siete hallazgos, seis reales y arreglados, uno cierto pero sin efecto medible**.

**1. La ficha de circuito descargaba Prisma al navegador.** Es consecuencia directa de la corrección de ayer: al mudar `contarSalida` al módulo que consulta la base, el componente de cliente que la usa se trajo detrás el cliente de Prisma. Medido en la compilación: `/circuits/<id>` pedía un chunk de **64 KB** con `PrismaClient` y su shim de navegador dentro, y **ninguna otra página lo pedía**. Ahora lo puro vive en `circuit-stats.ts` —sin un solo `import` de servidor— y la consulta en `circuit-history.ts`, que es la misma separación que ya tenían `results.ts` y `driver-stats.ts`. Comprobado tras recompilar: ningún chunk de cliente contiene `PrismaClient`.

**2. Cuatro circuitos rompían el historial, y son datos reales**: Red Bull Ring acogió dos carreras en 2020 y otras dos en 2021, y Silverstone y Baréin dos en 2020. Con el año como clave, las dos filas compartían identificador —`detalle-2021` duplicado—, así que desplegar una abría las dos. **Es exactamente el defecto de los `id` repetidos que el CI destapó el 2026-08-19**, otra vez y por otro camino. La clave pasa a ser año + ronda.

**3. Y al enseñarlas por separado apareció lo de fondo**: las dos filas de 2021 se leían idénticas —mismo año, mismo ganador, mismo equipo—, porque el nombre del gran premio no estaba a la vista. Ahora se nombra, **solo en los años con dos carreras**; en los demás sería ruido.

**4. El orden de los dobletes podía bailar entre visitas**: la consulta ordenaba solo por año. Añadido el desempate por ronda, que es lo que el propio módulo ya se cuidaba de hacer en las clasificaciones y no hizo aquí.

**5. El mapa y las trazas se sincronizaban aunque fueran de pilotos distintos.** El aviso que lo anuncia sí comprobaba que el piloto fuera el mismo; el cableado, no. Se puede cambiar de piloto y cargar el trazado sin recargar las trazas, y entonces cada lienzo señalaba un punto de una vuelta distinta. Ahora la condición es una sola y vale para las dos cosas.

**6. Un punto sin distancia podía llegar como `undefined`, no como `null`**, si el servicio devolvía algo guardado en su caché de una hora antes de que el trazado incluyera la distancia. `=== null` no lo veía y acababa escribiéndose en el estado. Comparado por tipo.

**7. El séptimo: cierto en estructura, sin efecto medible.** El efecto que dibuja el mapa dependía del cursor, así que cada movimiento del puntero rehacía el `ResizeObserver` y volvía a trazar los ~600 segmentos. Se separó en dos capas —el trazado debajo, el marcador encima—, pero **la medición no da diferencia**: 60 movimientos del puntero cuestan **4 ms de scripting con una versión y con la otra** (medido dentro de la página con `Performance.getMetrics`, porque el reloj de pared solo mide el ida y vuelta de Playwright: 993 ms en las dos). Se mantiene el cambio por el ciclo de vida del observador —desconectarlo y reconectarlo en cada movimiento puede perderse un cambio de tamaño—, no por velocidad. Queda dicho para no apuntarse una mejora que no existe.

**Lo que la revisión miró y descartó**, que también vale anotarlo: el `dropna` de la distancia en Python (el `cumsum` de pandas ya ignora nulos, así que descarta las mismas filas) y el enlace estirado de la lista de circuitos (el `z-10` del enlace de calendario sí queda por encima de la capa).

**Verificado**: 62 unitarias (2 nuevas), 20 de navegador (2 nuevas: el doblete de Red Bull Ring y que el marcador del mapa se pinta al recorrer las trazas) y 28 de Python. La prueba del cursor ahora cuenta píxeles opacos de la capa del marcador, que es lo único que comprueba de verdad que el mapa responde a las trazas.

### 2026-08-19 (15) — La ficha de circuito, y una pregunta que ninguna especificación responde ✅

Lo último que quedaba del §8: `/circuits/[circuitId]` con su historial de ganadores. Se llega tocando la tarjeta desde la lista —un solo enlace estirado sobre toda la tarjeta, para no anidar controles— y cada año del historial lleva a su carrera.

**Lo que la ficha NO enseña, y por qué.** El esquema tiene cuatro columnas de especificaciones —longitud, curvas, zonas DRS y récord de vuelta— y están **vacías en los 36 circuitos con carreras**. No es un olvido del seed: Jolpica/Ergast, que es de donde salen los circuitos, no las publica; `update-incomplete-circuits.ts` solo rellena ubicación, país, coordenadas y enlace. Una ficha llena de guiones dice menos que una ficha corta, así que no se pintan. Si alguna vez se quieren, hay que buscar otra fuente.

**Lo que sí se puede responder con lo que hay: ¿aquí se adelanta?** La parrilla del ganador lo cuenta mejor que ninguna especificación, y el contraste entre dos circuitos es inmediato:

| | Desde la pole | Parrilla media del ganador |
|---|---|---|
| Monza | 56 % | 2,4 |
| Mónaco | 69 % | 1,4 |

Con eso, cada ficha lleva cuatro cifras, la mayor remontada del circuito —en Monza, Gasly desde el 10.º en 2020—, quién manda aquí entre pilotos y equipos, y el historial completo.

**Una trampa de los datos, cubierta con pruebas**: en los datos de Ergast, salir del pit lane se guarda como **parrilla 0**, no como el último puesto. Hay 56 salidas así en la base. Sin ese cuidado, una victoria desde el pit lane contaría como la mejor parrilla posible y hundiría la media; ahora se ordena por detrás de cualquier parrilla y se nombra «desde el pit lane».

**Dos fallos propios que conviene anotar porque son de familia conocida:**

1. Exporté una función auxiliar desde el módulo de la tabla de móvil —que es `'use client'`— y la llamé desde la página, que es de servidor. **No lo ve el tipado, ni el lint, ni la compilación**: solo estalla al abrir la página, y la primera comprobación en navegador la enseñó en la primera visita. La función se mudó al módulo puro, que es de donde puede leerla el servidor.
2. La prueba de la fila plegable fallaba y parecía un fallo de la pantalla. Era **un localizador que se resolvía a otra fila**: al desplegarse, el botón cambia su nombre accesible de «Ver más de…» a «Ocultar…», así que `.first()` con ese nombre pasaba a apuntar a la siguiente fila sin desplegar y leía su `aria-expanded`. Ahora se agarra por `aria-controls`, que no cambia.

**Anotado, no resuelto**: 8 circuitos con carreras no tienen trazado —`mugello`, `ricard`, `yeongam`, `valencia`, `portimao`, `hockenheimring`, `sochi` y `nurburgring`—, todos retirados del calendario salvo Paul Ricard y Portimão. Su ficha funciona igual, sin la silueta.

**Verificado**: 60 pruebas unitarias (8 nuevas), 19 de navegador (2 nuevas) y 28 de Python. Recorrido en navegador de verdad, claro y oscuro, escritorio y móvil: la lista lleva a la ficha, el historial se pliega en móvil con su detalle enlazado, un circuito inventado da la página de 404 y la primera columna de la tabla es cabecera de fila. De paso, el ordinal «1.º» salió de la monoespaciada, donde se separaba y parecía un símbolo de grados.

### 2026-08-19 (14) — El mapa y las trazas, señalando el mismo punto ✅

La función distintiva de f1-tempo, y no hacía falta ningún dato nuevo salvo uno que ya estaba a mano: **la distancia de vuelta de cada punto del trazado**. El endpoint la descartaba igual que descartaba `Position`.

Ahora, pasar el dedo por la gráfica de velocidad mueve un punto por el asfalto, y tocar el asfalto mueve el cursor de las tres trazas. Verificado en los dos sentidos: tocando el mapa, las trazas leen 1.247 m, 4.604 m y 111 m según dónde; moviendo el cursor por las trazas, el marcador viaja de (383,134) a (733,227) en el lienzo.

**Un fallo de diseño que apareció al probarlo**: al mover el puntero de las trazas al mapa, el `pointerleave` de las primeras llegaba **después** del `pointermove` del segundo y borraba lo que el otro acababa de poner, así que el punto no aparecía nunca al pasar de un gráfico al otro. Se resuelve con una decisión que además es mejor: **el marcador se queda donde lo dejaste** en vez de borrarse al salir, que es exactamente lo que hace el referente («place a marker by clicking on the track map or telemetry graph»).

**Y dos errores de medición míos, encadenados.** El primero: probé el sentido mapa→trazas con las dos cosas cargadas y salía que no funcionaba… porque con las trazas en pantalla **el mapa queda fuera de la ventana**, y el ratón se movía a coordenadas que ya no caían sobre él. El segundo: antes de eso, había dado por bueno que el mapa no reaccionaba, cuando aislado sí lo hacía. Hace falta desplazar el elemento a la vista antes de medir; la prueba de navegador que fija esto lo hace.

Los gráficos siguen sirviendo sueltos: solo pasan a estar gobernados desde fuera si se les da un `onCursor`.

### 2026-08-19 (13) — La latencia, resuelta; y dos pantallas jubiladas ✅

**La conexión directa: entre 2 y 3,5 veces más rápido, y costó una variable.** Medido en producción antes y después del cambio:

| | Pooler (6543) | Directa (5432) |
|---|---|---|
| `/api/health` | 540 ms | **155 ms** |
| `/standings?season=2015` | 2.963 ms | **1.699 ms** |
| `/standings?season=2024` | 2.837 ms | **1.268 ms** |
| Home | ~1.400 ms | **~1.140 ms** |

Antes de tocar producción se comprobó aquí lo que de verdad importaba: que **la concurrencia no reventara**. Ocho peticiones simultáneas a páginas que consultan → las ocho en 200, **cero errores `P2024`** y exactamente cinco conexiones abiertas, que es el límite configurado. Era el escenario que ya mordió en agosto con `connection_limit=1`.

También se quitó `pgbouncer=true`: ese modificador desactiva las *prepared statements* porque el modo transacción no las soporta, y el modo sesión sí.

**`/telemetry` y `/compare`, jubiladas** — las dos retiradas que el plan pedía en §8 y que llevaban desde entonces en la deuda. Una prometía «próximamente» desde diciembre; la otra calculaba estadísticas sobre las últimas cinco carreras, lo que daba comparaciones engañosas, y el cara a cara de la ficha de piloto ya la sustituye con la temporada entera.

**Fusionar no fue borrar.** Lo que `/telemetry` enseñaba de verdad —las condiciones de la sesión— vive ahora en `/analysis`, con dos mejoras: es de **la sesión que el usuario elige** y no de «la última que hubiera», y sale de FastF1 en vez de OpenF1. Para eso se aprovechó el endpoint de meteorología que el servicio tenía **desde el principio y que ninguna pantalla usaba**: era uno de los «endpoints huérfanos sin UI» que la auditoría de agosto listó. Verificado con Baréin 2024: 18,2 °C de aire, 23,7 de pista, 48,8 % de humedad, y «sesión en seco» sobre 157 mediciones.

Las dos rutas **redirigen con 308** en lugar de dar 404, porque puede haber enlaces guardados y un 404 no explica nada.

**Y de paso, el código muerto que el informe 3 mandaba limpiar**: `SpeedChart`, `TelemetryComparison`, `jolpica/transformers.ts` y `src/hooks/` —que solo contenía un README—. Los avisos de lint bajan de 15 a 14.

**Un efecto que conviene decir**: al retirar `/compare` desaparece el único combobox de la app, así que su prueba de teclado se retira con él. El trabajo de ARIA que se hizo esta semana sobre ese componente se va con la pantalla; queda hecho el patrón, por si vuelve a hacer falta.

### 2026-08-19 (12) — Dos identificadores iguales, y un CI que por fin explica ✅

Tres fallos seguidos del job de navegador, y los dos primeros diagnosticados a ciegas: las anotaciones del check solo dicen «exit code 1» y tanto los logs como los artefactos exigen autenticación. **Lo primero fue arreglar eso**: Playwright tiene un reporter que publica cada fallo como anotación del check, legible por API sin credenciales. Con él, el tercer intento dijo exactamente qué pasaba en la primera línea.

**Y lo que pasaba era un fallo real de la app**: `strict mode violation: locator('#season-selector') resolved to 2 elements`. Dos `<select>` con el mismo `id` en el DOM. Es HTML inválido y rompe la asociación con la etiqueta — el `htmlFor` apunta a un id que ya no es único.

Aparece porque durante una transición pueden convivir un instante dos copias de la página, algo que en local no se reproduce —medido: siempre una— y en el CI, más lento, sí. El id fijo pasa a `useId()`, así que el problema desaparece pase lo que pase con el streaming, y las pruebas localizan **por nombre accesible** en vez de por id.

**El segundo fallo, el anterior, era otro**: seis procesos de Playwright contra un servidor con **una sola conexión** a la base (`connection_limit=1`, herencia de cuando el destino era serverless). Las páginas se encolaban hasta pasarse del tiempo límite. El CI pasa a dos procesos y ajusta la URL a `connection_limit=5`, como producción.

**De paso**, `upload-artifact` vuelve a v4: se había subido a v5 para quitar el aviso de retirada de Node 20 y **la v5 también va con Node 20**, así que el aviso seguía saliendo igual. La actual es la v7; se deja anotado en lugar de saltar cuatro versiones mayores sin mirar qué cambia.

### 2026-08-19 (11) — El CI no fallaba por el código, sino por una sola conexión ✅

Segundo fallo del job de navegador en el día, y otra vez **con las 17 pruebas en verde en local**. La reproducción esta vez fue exacta: levantar el servidor con la URL del `.env` —la misma que el secret del CI— en lugar de la retocada que venía usando.

**La causa: `connection_limit=1`.** Esa URL trae una sola conexión a la base, herencia de cuando el destino era serverless, donde cada petición es un proceso aparte. Producción corre con 5 desde agosto, pero el secret del CI no. Con **seis procesos de Playwright** pidiendo a la vez contra un servidor con una conexión, y ~500 ms por consulta, las páginas que consultan se encolan hasta pasarse del tiempo límite: caían «la fila desplegada» y «en escritorio la tabla sigue siendo una tabla», las dos sobre `/results/2024/1`.

Medido: con seis procesos, 1-2 fallos por tanda; **con dos, 17/17 en 48 segundos**.

Arreglado por los dos lados, porque cada uno cubre un flanco distinto: el CI pasa a **dos procesos** —el servidor de pruebas no da para más— y el job **ajusta la URL a `connection_limit=5`** antes de arrancar, para que el servidor de pruebas se parezca a producción y no a un entorno que ya no existe.

Es la tercera vez esta semana que el problema es **contra qué se mide**, no qué se mide: un servidor viejo en el puerto, una máquina rápida con la caché caliente, y ahora un límite de conexiones que no era el de producción.

### 2026-08-19 (10) — La carrera contada en dos gráficos, y cuatro piezas de movimiento ✅

Todo lo elegido por el usuario sobre el mockup, construido con lo que la investigación de los agentes había señalado.

**Los dos gráficos que faltaban salen de una línea.** `python-service/app/routes/laps.py` seleccionaba columnas a mano y **descartaba `Position`**, que FastF1 sí entrega — comprobado contra la sesión real: 31 columnas disponibles, y también `PitInTime`, `PitOutTime`, `TrackStatus` e `IsAccurate`, que igualmente se estaban tirando. Con ese campo aparecen **posiciones vuelta a vuelta** —los cruces son adelantamientos, las caídas en bloque son tandas de paradas— y la **traza de carrera**.

**La traza se rehizo antes de llegar a la app.** La primera versión usaba el ritmo mediano del ganador como referencia y salía ilegible: todas las líneas caían a la vez, porque con depósito lleno las primeras vueltas son más lentas que la mediana. Contra el tiempo acumulado del líder, su línea queda plana en cero y lo que se ve es la distancia real — de 0 a +93 s en Baréin 2024.

**Cada gráfico lleva su «cómo se lee»**, que la investigación señaló como la mejora de mejor retorno de toda la lista: The Field mantiene una página entera dedicada a explicar sus gráficos.

**Cuatro piezas de movimiento**, las cuatro respetando «reducir movimiento»:

- **Respuesta al pulsar** en tarjetas y filas (`scale` de 0,98 en 100 ms). La app desactivaba el resaltado gris de iOS sin poner nada en su lugar.
- **Marcador rodante** en los puntos de la clasificación. Dos detalles que costaron una corrección cada uno: la rueda debe pintarse **primero en la posición vieja** —puesta de una vez en su destino, el navegador no tiene desde dónde interpolar y el dígito cambia sin rodar—; y las ruedas **solo existen mientras algo se mueve**, porque montarlas siempre dejaba **770 nodos parados** en la clasificación. Medido después: 0 en reposo, 63 rodando, 0 al terminar.
- **FLIP al cambiar de temporada**: 22 filas animadas al pasar de 2024 a 2021. Se mide con `offsetTop` y no con `getBoundingClientRect`, porque la segunda es relativa a la ventana y un desplazamiento de la página entre pintados se colaría como un salto inventado.
- **Píldora deslizante** en la barra inferior, medida del DOM porque los anchos los reparte flex.

**Y un fallo que solo apareció midiendo**: la función que separa las etiquetas de las líneas comparaba contra el array original en vez de contra la etiqueta ya movida, así que dos que caían juntas quedaban a **5 px** de los 13 pedidos. Corregido y verificado: separación mínima de 13 px en los dos temas.

**Acción pendiente del usuario**: el cambio de `Position` está en `python-service/`, así que exige **pulsar Deploy a mano** otra vez.

### 2026-08-19 (9) — Las skills que no usé, y lo que escondían ✅

**El usuario señaló que su prompt pedía explícitamente agentes especializados y skills, y que no se habían usado.** Cierto: el método está escrito en dos documentos —`code-review` y `security-review` *antes de cada merge*, `dataviz` antes de tocar un gráfico— y en toda la jornada no se ejecutó ninguna, con **diez commits ya en producción**.

**`code-review` encontró diez defectos reales, todos introducidos ese mismo día.** Los cuatro que rompían uso:

1. **Desde `/results` no se podía llegar a `/calendar`.** El "volver arriba" al tocar la pestaña activa se disparaba también cuando la pestaña estaba marcada por pertenencia o por ruta hija, así que el toque se quedaba en un desplazamiento. Ahora exige estar exactamente en esa ruta.
2. **El velo del indicador podía quedarse puesto.** El oyente iba en captura, antes que el del enlace, así que un clic anulado por otro componente arrancaba la espera igualmente.
3. **Dos temporizadores sin cancelar** dejaban uno huérfano al pulsar dos veces: `stop()` solo alcanzaba al último.
4. **El enlace de la tarjeta de piloto no cubría su relleno**, porque el pseudoelemento se anclaba al envoltorio interno que existe para apilar contenido sobre el dorsal; la tarjeta de equipo, sin ese envoltorio, sí lo cubría. Dos tarjetas gemelas comportándose distinto. Ahora las dos usan una capa explícita.

Y seis más: `?lap=abc` se ignoraba en silencio devolviendo la vuelta rápida como si fuera la pedida; el estado vacío de `/analysis` se colaba bajo el mapa y la estrategia; la fecha de `/results` salía con un día distinto en escritorio y en móvil por no fijar la zona; el botón de reintentar de `/standings` navegaba a la misma URL y no hacía nada; `aria-controls` apuntaba a paneles inexistentes en las pestañas inactivas; y una vuelta de salida de boxes sin compuesto etiquetaba UNKNOWN el stint entero.

**El arreglo del punto 2 rompió lo que arreglaba, y lo cazó la prueba.** Pasar el oyente a burbuja descartaba *todas* las navegaciones, porque `Link` llama a `preventDefault()` para navegar del lado del cliente: un clic anulado y una navegación son indistinguibles desde el evento. Se vuelve a captura y se acota el daño — plazo de rendición de 10 s y cualquier toque posterior retira el indicador.

**`security-review`: sin hallazgos.** Comprobados el flujo de los parámetros de URL hasta la URL saliente del servicio (solo controlan la ruta, nunca el host ni el protocolo), `event_key` y la caché de disco —que hashea la clave antes de tocar el sistema de archivos—, los mensajes de error del servicio, `error.digest`, y la ausencia de sinks de XSS. Una nota: el job `e2e` expone los secrets de base de datos, pero el disparador es `pull_request` y GitHub no los entrega a PRs de forks; solo sería un problema si algún día se cambia a `pull_request_target`.

**`dataviz` destapó un fallo que ninguna captura muestra.** Su validador, ejecutado sobre los colores Pirelli, da **1,11:1 para el HARD** y 1,42:1 para el MEDIUM sobre la tarjeta clara: barras blancas sobre fondo blanco. Los colores son los que manda la convención del deporte y no se tocan, así que se añade el relieve que el propio método exige — aro por segmento y separación de 2 px—, y la identidad sigue estando en la inicial, la leyenda y la tabla equivalente.

**Y la rampa del mapa de velocidad estaba mal elegida.** La escogí a ojo con luminosidad HSL constante, y medida resultó que **en cada tema desaparecía un extremo**: el amarillo a 1,61:1 sobre blanco, el azul a 1,53:1 sobre carbón. La causa es que un barrido de tono a "L" constante no mantiene la luminancia: el verde y el amarillo son mucho más luminosos que el azul. Rehecha resolviendo una **luminancia objetivo por tono**, con una lista de paradas por tema —la oscura no es la clara invertida—: peor paso **3,39:1 en claro y 3,53:1 en oscuro**, medido después sobre el lienzo real (3,38 y 3,45), y luminancia creciente para que el orden se lea en escala de grises.

**El repo pasa a tener sus propias skills** en `.claude/skills/`: `verificar` (build como el CI sin base de datos, medir contra el proceso correcto, los cinco errores de medición ya cometidos), `desplegar` (cutover por `buildId`, nunca disparar el webhook a mano, y el Deploy manual del servicio) y `cerrar-sesion` (revisión antes de merge, qué debe contener la bitácora, y las reglas de trato acordadas). El método deja de depender de que alguien se acuerde.

### 2026-08-19 (8) — La ronda que cargaba otra carrera ✅

**El usuario reportó que en telemetría «a cada rato salía que no había información de Verstappen» y que comparar daba error.** No era un problema de datos: era un fallo de identificación de la sesión que llevaba ahí desde el principio.

`fastf1.get_session(year, gp, session)` decide **por el tipo** del segundo argumento: entero, número de ronda; texto, nombre de Gran Premio. La ronda llega por la URL, así que llegaba como **texto** — y FastF1, en vez de fallar, hacía coincidencia por parecido y lo registraba en su log: `Correcting user input '11' to 'Australian Grand Prix'`. Es decir: **al elegir Hungría, la app cargaba Australia**. Verificado en el propio intérprete: `get_session(2026, '11', 'Q')` → ronda 1, Australia; `get_session(2026, 11, 'Q')` → ronda 11, Hungría.

El síntoma no era un error, que se habría visto: eran **datos de otra carrera**. Verstappen «sin vueltas» en una sesión donde sí corrió, comparaciones imposibles, y tiempos que no eran los de la sesión elegida. Cualquiera de mis verificaciones anteriores pasó porque usé nombres —«Bahrain»—, no rondas.

Corregido en las **10 llamadas** del servicio con `event_key()`, que convierte a entero lo que son dígitos y deja el resto como texto, con dos tests. Comprobado después: la ronda 11 de 2026 carga el **Gran Premio de Hungría** y Verstappen aparece con su vuelta 14 en 1:17.725.

**Tres defectos visuales más, también del usuario:**

**El trazado del circuito no se veía.** 23 de los 36 archivos SVG vienen con `stroke="white"` —la variante blanca del repositorio del que se descargaron—, así que en tema claro eran blanco sobre blanco, y el `dark:invert` que llevaban los volvía **negros** sobre carbón. El comentario del código decía «son line art oscuro», dando por hecho lo contrario de lo que hay en disco. Ahora se fuerzan a silueta monocroma como los logos: negra en claro, blanca en oscuro, venga el archivo como venga.

**El marco de la foto del piloto era una cápsula** que ocupaba todo el ancho con la foto pegada a un lado: el contenedor era un `div` de bloque dentro de una columna flex, así que se estiraba, y `rounded-full` sobre una caja ancha da una píldora. Ceñido al tamaño del avatar: 192×192.

**El conmutador de tema nunca funcionaba al primer clic.** Comparaba `theme`, que vale `'system'` mientras el usuario no elige: con el sistema en oscuro, el primer clic ponía `'dark'` —lo que ya se veía— y solo el segundo hacía algo. Ahora lee `resolvedTheme`, que es el tema que se está viendo, y de paso la etiqueta dice a dónde va («Cambiar a tema claro»).

**Y la barra inferior**, revisada tras el aviso del usuario. Lo esencial estaba bien —pestaña activa correcta incluso en rutas profundas, objetivos de 79×47 px, sin solaparse con el footer— pero había dos cosas: en `/results`, `/circuits`, `/compare` y `/constructors` **no se marcaba ninguna pestaña**, y el toque **no producía ninguna señal**, porque la app desactiva el resaltado gris de iOS y no puso nada en su lugar. Ahora esas rutas marcan la pestaña a la que pertenecen, pulsar tiene estado de pulsación, y tocar la pestaña en la que ya estás vuelve arriba, como en cualquier app nativa.

### 2026-08-19 (7) — La primera prueba de navegador que falla en CI y no en local ✅

El CI tumbó el commit del mapa de velocidad, y **no por el código nuevo**: falló la prueba «una navegación rápida no interrumpe con el coche», que afirma que el indicador no aparece al ir a una ficha de piloto. En esta máquina esa navegación ronda los **70 ms**, con la página cacheada; en el runner, con caché fría y la base de datos a 500 ms por consulta, tarda **más de los 250 ms del umbral**, así que el coche aparece — correctamente— y la prueba falla.

**La prueba estaba escrita contra un entorno rápido, no contra la propiedad.** Lo que quiere comprobarse es «no aparece antes de 250 ms», y eso se mide mirando poco después de pulsar, no al terminar la navegación. Reescrita así, y **verificada en las dos condiciones**: con la navegación normal y con la respuesta frenada a propósito, donde a los 120 ms no hay nada y a los 520 ms el coche ya está cruzando.

Es la misma lección de la semana con otra cara: **medir contra el entorno equivocado**. Antes fue un servidor viejo en el puerto y un build sin base de datos; ahora, una máquina rápida con la caché caliente.

**De paso**, `actions/upload-artifact` sube a v5: el propio log del CI avisaba de que aún iba con Node 20.

**Nota de secuencia**: como el job de despliegue depende de las pruebas, la web **no llegó a desplegarse** con ese commit. El servicio de telemetría sí se desplegó a mano, así que durante un rato producción tuvo el servicio nuevo y la web antigua — inofensivo, porque la web vieja no llama a los endpoints nuevos.

### 2026-08-19 (6) — El mapa de velocidad y la estrategia de neumáticos ✅

Los dos arrastres del Sprint 4, que llevaban declarados como deuda desde el 16 de agosto. Ambos necesitaban datos que solo tiene FastF1, así que **el servicio Python crece por primera vez desde que está en producción**.

**Dos endpoints nuevos.** `/api/telemetry/{año}/{evento}/{sesión}/{piloto}/track` devuelve el trazado que recorrió el coche con la velocidad en cada punto, y `/api/laps/{año}/{evento}/{sesión}/stints`, los tramos de neumático de cada piloto. La lógica que convierte lo que da FastF1 —miles de muestras por vuelta, una fila por vuelta— en algo que quepa en una respuesta vive en `app/utils/track.py`, separada de las rutas **para poder probarla sin bajar una sesión entera de internet**: 10 tests nuevos (24 en total en Python).

**Tres decisiones dentro de esa conversión.** El trazado se **submuestrea a 600 puntos** conservando el primero y el último —a partir de ahí la línea no gana forma y sí peso, y ese peso viaja hasta el móvil: 29 KB para una vuelta de Baréin—; las coordenadas se devuelven **sin girar ni escalar**, con la rotación aparte, porque quien dibuja es el único que sabe el tamaño del lienzo; y los tramos se agrupan **en el orden de llegada**, no alfabético, porque una estrategia se lee comparando al ganador con los de atrás.

**El mapa, en canvas y con una escala de color que no depende de distinguir rojo y verde.** Va de azul frío a amarillo cálido y la luminosidad crece con la velocidad, así que el gradiente se sigue leyendo en escala de grises. El gráfico de estrategia tampoco codifica el compuesto solo con color: cada tramo lleva su inicial dentro, la leyenda los nombra y hay una tabla equivalente en `sr-only` — que era justo el defecto que la auditoría señaló en la tabla de vueltas.

**Verificado de punta a punta contra datos reales**, con el servicio corriendo en local: Verstappen, vuelta 16 de la Q de Baréin 2024 en **1:29.179** —el mismo tiempo con el que se validó el despliegue en agosto—, rotación 92°, de 71 a 322 km/h en 600 puntos; y la estrategia real de la carrera: **VER SOFT 1-17 | HARD 18-37 | SOFT 38-57**, 20 pilotos. En el navegador, el lienzo pinta 18.039 píxeles con 4.138 colores distintos: el gradiente existe, no es una línea de un solo tono.

**De paso**, el venv local queda creado desde `requirements-dev.txt` con **FastF1 3.8.3**, que era otra deuda anotada: la máquina tenía la 3.7.

**Acción pendiente del usuario**: el servicio de telemetría **no tiene despliegue automático**. Hasta que se pulse *Deploy* en el panel, los dos botones nuevos de `/analysis` responderán con error en producción, porque la web ya estará desplegada y el servicio no.

### 2026-08-19 (5) — Cierre del Sprint 6, contrastado punto por punto ✅

El método que exigió la auditoría de veracidad: **contrastar el cierre contra la lista de alcance original**, no contra lo que uno recuerda haber hecho. Esto es ese contraste.

**Informe 1 — retroalimentación: completo.** Selector de temporada con estado, los 8 `loading.tsx` que faltaban, `<Suspense>` en home, ficha de piloto y `/standings`, caché en las históricas, y los seis bugs funcionales: Favoritos más allá del piloto 50, la precedencia de `DriverSelector`, `/standings` distinguiendo fallo de vacío, la carrera sin resultados, las consultas sin `take` y `PageTransition`. Este último **se recorta con motivo**: se le atribuían 300 ms de retraso en los esqueletos y medidos son ~20 ms, con un arreglo que hace convivir en el flujo la página que sale y la que entra.

**Informe 2 — accesibilidad: completo salvo dos recortes.** Reducir movimiento, foco visible, zoom, tokens de timing, gráficos legibles en claro, tablas priority+, nombres accesibles, inputs a 16 px, objetivos táctiles, controles fuera de los enlaces, `aria-live` donde hacía falta, `scope` y `caption`, pestañas, combobox, compuesto de neumático, semántica de tiempos, contraste de tokens, bordes de control a 3:1, foco del menú del header, `overscroll-contain`, paneo del gráfico en móvil, reflow del canvas, idioma, `h1` estable, posición en las medallas, contraste del calendario, enlace para saltar al contenido y alternativa textual del gráfico del campeonato. **Se recortan**: la alternativa textual de `TelemetryChart` —una vuelta son miles de muestras por canal y una tabla equivalente no sería legible por nadie— y la «golden rule» de safe-area en `Header`, que se desvía de la receta del plan pero funciona por su altura fija.

**Lo último de este bloque**, hecho hoy: el `<button>` dentro del `<a>` en las tarjetas de piloto y equipo —HTML inválido y dos paradas de teclado por tarjeta— se resuelve con el enlace cubriendo la tarjeta por pseudoelemento y el favorito por encima; el menú del header cierra con Escape y devuelve el foco; el borde de los controles sube a **3,13:1 en claro y 3,73:1 en oscuro** —solo el de los controles: subir el de los separadores convertiría cada tarjeta y cada fila en una caja marcada—; `getComputedStyle` sale del bucle de dibujo del canvas, que era el único punto que forzaba reflow en cada movimiento del dedo; y el gráfico del campeonato gana una tabla equivalente en `sr-only`.

**Informe 3 — veracidad: sigue abierto, y se declara.** Quedan sin hacer: ~~personalización por equipo favorito~~ (hecha el 2026-08-20), ~~los primitivos Chip y Sheet~~ (hechos el 2026-08-20; Table ya existía como `PriorityRows`), ~~la ficha de circuito `/circuits/[circuitId]`~~ (hecha el 2026-08-19), la animación FLIP y el *number ticking* en standings, `seed:all` reproduciendo solo 4 de las 17 temporadas, y el código muerto sin limpiar. No desaparecen: están en la deuda técnica con su nombre.

**Verificación de cierre**: build reproduciendo el CI sin base de datos, 52 tests unitarios, 17 de navegador, y comprobación en ejecución de lo añadido hoy —bordes medidos en los dos temas, primer tabulador de la home, cero controles anidados en enlaces, y el menú cerrando con Escape con el foco de vuelta en su botón—.

### 2026-08-19 (4) — Las tablas, en un teléfono ✅

**Decidido sobre un mockup, no por escrito.** Cuatro tratamientos con los datos reales de Baréin 2024 dentro de un teléfono de 390 px y funcionando de verdad: expandir la fila, congelar las dos primeras columnas, una tarjeta por piloto, y como estaba. Cada uno con su medida honesta al pie —cuánto ancho ocupa y cuánto hay que arrastrar—. El usuario eligió **expandir la fila**, que es también lo que pide §6 del plan.

**Qué cambia.** En móvil, la fila enseña posición, piloto y tiempo, con la barra de color del equipo —que estas tablas no mostraban pese a estar en el sistema de diseño— y despliega equipo, dorsal, vueltas, puntos y parrilla al tocarla. A partir de `md` no cambia nada: la tabla de siete columnas cabe de sobra y ahí apunta un ratón.

**Un primitivo, cuatro tablas.** `PriorityRows` concentra el plegado, el `aria-expanded`, el foco y el detalle como lista de definiciones —cada dato con su etiqueta, que es lo que sustituye a la cabecera cuando esta ya no está a la vista—. Con él quedan cubiertas `/results`, las dos de la ficha de carrera y la de vueltas de `/analysis`. Es además el primero de los «primitivos Table/Chip/Sheet» que el informe 3 señalaba como prometidos y no hechos.

**Una restricción que decidió la forma del componente**: `/results` es una página de servidor y `PriorityRows` recibe funciones para pintar cada fila, que no cruzan la frontera servidor→cliente. De ahí `SeasonResultRows`, un componente de cliente al que solo llegan datos planos; la tabla de escritorio se queda en la página. Las otras tres tablas ya vivían en componentes de cliente y lo usan directamente.

**Y una regla dentro del primitivo que conviene no romper**: en la parte visible de la fila no van enlaces ni botones, porque es el contenido de un `<button>` y anidar controles produce HTML inválido y paradas de teclado duplicadas — el mismo defecto que la auditoría señaló en las tarjetas de piloto. Los enlaces viven en el detalle.

**Verificación**: el ancho del documento pasa de ~900 px a **390** en las dos rutas, en escritorio sigue habiendo una tabla con sus `scope`, y tres pruebas de navegador nuevas lo fijan (17 en total).

### 2026-08-19 (3) — Semántica, teclado, dedos e idioma ✅

**Las pestañas de sesión eran seis botones sueltos.** Un lector de pantalla los anunciaba sin decir que forman un grupo, cuál está activa ni qué cambian al pulsarlas. Ahora son `tablist`/`tab`/`tabpanel` con `aria-selected` y `aria-controls`, solo la activa recibe tabulación y las flechas recorren las pestañas, que es lo que espera quien navega con teclado.

**Cuarenta y tres cabeceras de tabla sin `scope` y ni una leyenda.** Con siete u ocho columnas, eso significa que VoiceOver no puede decir a qué cabecera pertenece la celda que está leyendo. Añadidos los `scope="col"` en las seis tablas y una `<caption>` en `sr-only` por tabla, describiendo lo que contiene. (Un tropiezo por el camino: el reemplazo automático también convirtió `<thead>` en `<th scope="col"ead>`; lo cazó el compilador al instante.)

**El buscador de `/compare` era un `div` con botones dentro**: sin `role="combobox"`, sin `aria-expanded`, sin decir qué opción está activa y sin flechas — solo se podía usar tabulando por cada resultado. Y el botón de quitar al piloto elegido no tenía nombre: se anunciaba como «botón» a secas. Como el marcado estaba **duplicado** para el piloto 1 y el 2, se extrajo un único componente: arreglar uno arregla los dos, y de paso desaparecen ~90 líneas repetidas. Lleva también el `overscroll-contain` que el plan pedía en §5 y no estaba.

**Objetivos táctiles: 44 px en móvil, densidad de escritorio a partir de `md`.** El plan pide ≥44 pt y había controles de 24, 28 y 36 px. Subirlos a secas habría engordado la interfaz de escritorio, donde apunta un ratón; con `min-h-11 md:min-h-0` se cumple donde importa sin tocar lo demás. Verificado con una prueba que recorre todos los botones visibles en un viewport de móvil y falla si alguno baja de 44.

**Idioma.** `GRAND PRIX`, `DATE`, `CAR`, `LAPS`, `TIME`, `Lap`, `Driver`, `Tyre`, `Max Speed`, `Toggle theme`, `Image not available`, `No lap data available` y las fechas en `en-US` convivían con una app declarada `lang="es"`. Un lector de pantalla en español las pronuncia mal. Traducidas.

**Cuatro pruebas de navegador nuevas** (14 en total): las pestañas con flechas, las tablas con `scope` y leyenda, el combobox con teclado, y que ningún control baje de 44 px en móvil.

**Y otra medición mal montada, la tercera de la jornada**: al comprobar los `scope` conté las cabeceras *después* de haber cambiado de pestaña con la flecha, y ese panel no tiene tabla. Salía «0 scope» con el HTML servido lleno de ellos.

### 2026-08-19 (2) — Los estados que no existían, y una auditoría desmentida ✅

**`global-error.tsx`, que no existía.** `error.tsx` vive *dentro* del layout raíz, así que no puede atrapar lo que rompa el layout mismo — `ThemeProvider`, `FavoritesProvider`, las fuentes—: eso daba la pantalla en blanco del navegador, sin una palabra ni forma de salir. Probado de verdad, rompiendo el layout a propósito con una variable de entorno para no dejar código de prueba en el build.

Y ahí aparecieron dos cosas que solo se ven ejecutándolo. La primera: como el fallo ocurre en el servidor, Next devuelve su documento mínimo de error y **la pantalla nuestra solo aparece tras la hidratación**, en el navegador; con `curl` no se ve. La segunda: la hoja de estilos de la app **sí** se carga ahí, y su regla `body { bg-background text-foreground }` pintaba la pantalla siempre en tema claro, porque el tema lo decide `ThemeProvider`, que es justo lo que no ha llegado a ejecutarse. Ahora esta pantalla trae sus propios colores con `prefers-color-scheme`, que además la salvan si el CSS de la app tampoco carga —escenario perfectamente posible cuando se llega hasta aquí—. Verificado en las dos preferencias: **18,04:1 en oscuro y 17,01:1 en claro**.

**`/standings` confundía un fallo de base de datos con una temporada vacía.** El `catch` devolvía listas vacías, indistinguibles de una temporada sin sembrar, y el usuario leía *«no hay datos de clasificación para 2024»* cuando lo cierto era que Supabase no respondía. Ahora son dos mensajes distintos, con reintento. Comprobado levantando el servidor contra una base de datos inexistente.

**Una carrera sin resultados pintaba una tabla fantasma**: cabeceras sin una sola fila, un «VUELTAS: 0» y un «Podio» con el título y nada debajo — el aspecto de un fallo, sin serlo. Ahora avisa de que aún no se ha disputado. Comprobado con el GP de Países Bajos de 2026, que está en el calendario y todavía no tiene resultados.

**Y una acusación de la auditoría que no se sostiene.** Decía que `PageTransition` retrasaba **300 ms** la aparición de todos los esqueletos, por su `mode="wait"`. Medido en navegador contra la alternativa: **96-123 ms antes y 81-85 ms después**. La penalización real es de ~20 ms. Además, quitar `mode="wait"` hace que la página que sale y la que entra convivan en el flujo del documento, con riesgo de duplicar el alto un instante. Veinte milisegundos no pagan eso: **el cambio se revierte** y el punto queda cerrado como medido, no como pendiente.

**Tres mediciones mal montadas antes de dar con la buena**, que conviene recordar porque las tres parecían razonables: (1) esperar `.animate-pulse` casaba con los esqueletos de las imágenes de la página en la que ya se estaba; (2) frenar la respuesta entera con Playwright impide que el servidor mande el esqueleto, así que jamás podía aparecer y salía «3.050 ms» en ambos casos; y (3) un `<a>` creado a mano provoca recarga completa, no navegación de cliente, y destruye el contexto. La medida válida usa lentitud real de base de datos, un enlace real de la cabecera y sondeo del DOM.

**Verificación**: build sin base de datos, 52 tests unitarios, 10 de navegador, y las cuatro pantallas nuevas vistas en ejecución —incluida la de fallo total, en sus dos temas—.

### 2026-08-19 — Las consultas encadenadas, desencadenadas ✅

**El bucle de `/standings` costaba 16 segundos.** Para poner el equipo al lado de cada piloto, la página pedía los resultados **ronda por ronda** hasta cubrirlos a todos: hasta 24 viajes en serie a una base que está a ~500 ms por consulta. Medido contra producción: la temporada **2015 tardaba 16,5 s** y la **2024, 10,0 s**.

El primer arreglo fue una sola consulta con toda la temporada, y **empeoró 2019**: el bucle terminaba en una o dos vueltas en las temporadas sin cambios de piloto, y traer 400 filas de golpe salía más caro que dos consultas pequeñas. La versión que quedó pide **la parrilla de la última ronda junto con las tablas** —así no cuesta un viaje aparte— y solo si falta alguien —un lesionado, un sustituto, alguien que se fue a mitad de año— hace una segunda consulta con el resto. Dos viajes en el peor caso. **2015: 16,5 s → 2,8 s. 2024: 10,0 s → 3,0 s. 2019: 3,0 s → 2,1 s.**

**La ficha de piloto encadenaba seis consultas antes de pintar nada**, y la primera de ellas ya traía todo lo necesario para la cabecera. Ahora el equipo y el color de acento salen del resultado más reciente, que ya venía en esa primera consulta, y las estadísticas, el cara a cara y la tabla por temporada viven en su propio `<Suspense>`. Medido en frío: **cabecera a los 514 ms, estadísticas a los 4.062 ms**. Antes no se veía nada hasta el final.

**La ficha de equipo pedía la historia entera para enseñar tres números.** Todos los resultados del equipo con su carrera, su circuito y su piloto anidados —676 filas en Ferrari— para calcular victorias, podios y puntos, y mostrar diez filas. Ahora se cuentan y se suman en la base de datos, y las filas se piden con `take`. Verificado que los contadores coinciden exactamente con el cálculo antiguo: 676 carreras, 40 victorias, 217 podios, 6.702,5 puntos. El tiempo apenas cambia —era un solo viaje— pero deja de arrastrar mil filas para nada, y con ello deja de escalar mal.

**Y en `/compare`, carga muerta pura**: la consulta traía la carrera, la temporada y el equipo de cada resultado de cada piloto, y **el comparador no lee ninguno de los tres**. Pedidos solo los campos que usa: **160-220 ms → 15-47 ms**. De regalo desaparece el apaño de `Result.milliseconds`, el `BigInt` que rompía la caché: si no se pide, no hay nada que descartar.

**Dos avisos sobre las mediciones**, porque casi me llevan a conclusiones falsas. El primero: **el TTFB dejó de servir** en cuanto hay streaming — mide el armazón, no los datos, y daba 20 ms en páginas que tardaban 4 segundos en estar completas; hay que medir el tiempo total. El segundo: **`connection_limit=1` en el `.env` local serializa las consultas**, así que las primeras comparaciones daban al código nuevo por más lento; producción usa 5, y midiendo con 5 se ve lo que de verdad pasa.

**Verificación**: build sin base de datos, 52 tests unitarios, 10 de navegador, y contraste de contenido página por página contra lo que mostraba antes — Rosberg con sus 136 carreras y 1.519 puntos, Ferrari con sus contadores idénticos, el gráfico del campeonato con sus cinco líneas y el comparador buscando.

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
