# Dejar de depender de OpenF1 para saber qué sesiones existen

> **Para la sesión que lo vaya a hacer.** Este documento tiene dos partes y hay
> que respetar el orden: **primero se analiza y se le contesta al usuario**, y
> solo después se construye. La propuesta que hay al final es la de la sesión de
> la oficina del 2026-09-25; está escrita a propósito para que se pueda
> contradecir con datos, no para que se copie.

> ✅ **CERRADO el 2026-09-26. Este documento es ya un registro, no un encargo.**
> El análisis está en la sección 5 —y una premisa de la sección 1 quedó
> **DESMENTIDA**, ver 5.0—, las tres decisiones del usuario en la 6, y lo que
> se hizo, con sus commits y sus medidas, en la 7. **No queda nada pendiente
> aquí.**

---

## 0 · Antes de leer nada más

```bash
git status                       # ¿hay trabajo local sin subir? Preguntar antes de descartarlo
git pull --ff-only && npm ci
npm run estado                   # el estado real, leído del código
```

La copia local de la otra máquina está atrasada casi siempre. Usa la skill
**`empezar-sesion`**, que lleva el procedimiento entero, incluida la
reconciliación de los commits que entraron desde la última vez.

Dos reglas del proyecto que afectan a este trabajo:

- **Un push que toca `src/`, `python-service/app/` o `prisma/` sin tocar
  `PROGRESO_RELANZAMIENTO_2026.md` falla el CI** y no despliega. La bitácora no
  es opcional.
- Si se toca lo que miran las sondas, **`npm run estado` y commitear
  `ESTADO.md`**: hay una prueba que lo compara.

---

## 1 · De dónde sale esto

El 2026-09-25 el usuario mandó el registro de producción. Desde el **2026-09-20**
se repetía, cada vuelta del reloj:

```
[avisos] La vuelta falló: Error [OpenF1NoDisponibleError]:
         OpenF1 no contestó tras 4 intentos: HTTP 401
```

**Lo comprobado ese día, no supuesto:**

- OpenF1 **no ha cerrado la API**. Desde una conexión doméstica,
  `sessions?year=2026`, `sessions?year=2025`, `session_result?session_key=latest`
  y `drivers?session_key=latest` devuelven **200**, y doce peticiones seguidas al
  mismo endpoint dan doce 200. No hay cabeceras de límite de ritmo.
- Lo que rechazan es **la IP de producción**. Es la misma hipótesis que ya quedó
  escrita el 2026-09-12 en `src/services/openf1/client.ts`, y por la que el 401
  está entre los estados reintentables.
- El fallo caía en el **primer paso** de `darUnaVuelta`, así que se llevaba por
  delante la vuelta completa: ni avisos, ni previas, ni sondeo.

**Ya arreglado ese mismo día** (`2c42d02`), como parche: `openf1/calendario` pide
el calendario **cada seis horas** en vez de cada cinco minutos, y si OpenF1 falla
sigue con el último calendario bueno. De ~288 peticiones diarias a 4.

**Por qué el parche no basta, y por eso existe este documento.** La pregunta del
usuario fue directa: «no entiendo por qué pedir el calendario completo a cada
rato; si al obtenerlo una vez no debería quedar guardado ya en nuestra db, y
luego solo pedir cada vez lo nuevo o lo que no tengamos». Tiene razón, y el
caché de seis horas **vive en memoria**: cada despliegue lo borra, así que la
primera vuelta tras arrancar vuelve a depender de que OpenF1 conteste. En un día
con varios despliegues, eso es varias veces.

---

## 2 · Lo que hay que ANALIZAR, y contestarle al usuario antes de tocar código

No empieces a construir. Contesta estas preguntas **con lo medido**, y pásale a
él las respuestas; él decide.

### 2.1 · ¿Qué le pedimos de verdad a OpenF1, y cuánto?

Recorre los tres sitios que lo llaman y cuenta las peticiones por día, con y sin
fin de semana:

- `src/lib/push/vuelta.ts` → `calendarioDeTemporada` (ya cacheado).
- `src/lib/push/avisos-de-sesion.ts` → `clasificacionDeSesion(session_key)`.
- `src/lib/push/carrera-de-fuentes.ts` → `clasificacionDeSesion` en cada sondeo.
- `src/instrumentation.ts` → **dos relojes**: uno cada `CADA_MINUTOS = 5` para
  los avisos, y otro **cada minuto** (`arrancarSondeo`) solo para el experimento.

**Dato ya medido que hay que confirmar o desmentir**: el sondeo deja de
preguntar cuando la fuente contesta. Con los 401 no contesta nunca, así que cada
sesión sigue preguntando durante las `VENTANA_HORAS = 8` de su ventana. Con
varias sesiones solapadas son varias peticiones por minuto. **Si eso es cierto,
el límite de ritmo se alimenta a sí mismo** y hay que decir el número.

### 2.2 · ¿Qué de lo que pedimos NO está ya en nuestra base?

Está comprobado que el modelo `Race` guarda `fp1Date`, `fp2Date`, `fp3Date`,
`qualiDate`, `sprintDate`, `date` y `time`. O sea, **las fechas ya las tenemos**.

Lo que **no** tenemos, y es lo que obliga a preguntar:

| Campo de OpenF1 | Para qué se usa | ¿Está en nuestra base? |
|---|---|---|
| `session_key` | `clasificacionDeSesion(session_key)`; clave primaria de `notified_sessions`; clave de `sourceProbe` | **No** |
| `date_end` | Desde ahí se cuentan los `ESPERA_MINUTOS = 35` antes de pedirle nada a OpenF1 | **No**: guardamos el inicio y deducimos el final con una tabla de duraciones |
| `is_cancelled` | Filtrar sesiones anuladas | **No** |

Confírmalo leyendo `prisma/schema.prisma` y `src/services/openf1/tipos.ts`
(`SesionOpenF1`), no este documento.

### 2.3 · ¿Cómo se cruza hoy una sesión de OpenF1 con una carrera nuestra?

Mira `src/lib/push/gran-premio.ts`. **Por cercanía de fechas**, no por
identificador: OpenF1 numera sus reuniones con `meeting_key`, que no existe en
nuestra base. El comentario dice que añadirlo «obligaría a resembrar diecisiete
temporadas para ganar nada».

**Pregunta a contestar**: si se van a guardar las `session_key`, ¿esa
correspondencia por cercanía sigue valiendo para sembrarla, o hace falta algo
más firme? Un fin de semana cabe en cuatro días y el margen actual es de cinco,
así que probablemente sí — **pero hay que comprobarlo contra un fin de semana
con sprint**, que es donde más sesiones se apelotonan.

### 2.4 · ¿Cada cuánto cambia lo que guardaríamos?

Esto decide si la idea funciona o no:

- **Lo pasado no cambia**: una sesión corrida tiene su `session_key` y su
  `date_end` para siempre.
- **Lo futuro sí**: la FIA mueve horarios. Si guardamos y no volvemos a mirar,
  nos quedamos con el horario viejo y los avisos salen a destiempo.

**Pregunta a contestar**: ¿cada cuánto hay que refrescar lo futuro, y hasta qué
distancia? Propón un número y **di de dónde sale**.

### 2.5 · ¿Aparecen las `session_key` antes de que la sesión corra?

Es la pregunta que decide si el sembrado puede ser perezoso o tiene que ser
anticipado. **Compruébalo**: pídele a OpenF1 las sesiones de un gran premio que
todavía no ha corrido y mira si ya traen `session_key` y `date_end`, o si
aparecen solo después.

### 2.6 · ¿Y las temporadas viejas?

Tenemos 2010-2026 en la base. OpenF1 **no** cubre todo eso. **Comprueba desde
qué año hay datos en OpenF1** y decide si se siembra hacia atrás o solo de ahora
en adelante. Para los avisos solo importa la temporada en curso, así que
probablemente no haga falta — pero dilo, no lo dejes implícito.

### 2.7 · El experimento de la carrera de fuentes

`src/lib/push/carrera-de-fuentes.ts` dice desde el primer día: «Es un
experimento con fecha de caducidad, no una pieza del producto. Cuando haya un
fin de semana medido y se decida, este archivo y su tabla se van juntos.»

Esa condición **ya se cumplió**: siete medidas, veredicto establecido, y el
18-bis cerrado el 2026-09-24 con los datos de Bakú —FP1 empate a 30m 14s, FP2
dos minutos más tarde que OpenF1, o sea que FastF1 **no** publica antes en
prácticas—.

**Está pendiente de la decisión del usuario**, y sale en `ESTADO.md` arriba del
todo. No lo retires por tu cuenta. Lo que sí hay que hacer es **decirle cuánto
tráfico a OpenF1 se ahorraría**, medido, para que decida con un número.

---

## 3 · Lo que propone la sesión de la oficina

> Esto es una propuesta, no un encargo. Si el análisis dice otra cosa, **gana el
> análisis**; dilo y explica por qué.

### 3.1 · Una tabla propia con las llaves de OpenF1

Una fila por sesión, sembrada la primera vez que se ve y actualizada solo
mientras la sesión esté en el futuro. Algo del estilo:

| Campo | De dónde |
|---|---|
| `sessionKey` (clave) | OpenF1 |
| `year`, `round` | Nuestra base, resolviendo con `granPremioDe` |
| `sessionName`, `sessionType` | OpenF1 |
| `dateStart`, `dateEnd` | OpenF1 — `dateEnd` es lo que hoy no tenemos |
| `isCancelled` | OpenF1 |
| `vistaEn` | Cuándo se sembró, para saber qué refrescar |

Con eso, el reloj de avisos lee **de nuestra base** y solo toca OpenF1 para dos
cosas: refrescar lo futuro de vez en cuando, y pedir la clasificación de una
sesión que acaba de terminar — que es lo único que de verdad hay que pedirle en
vivo.

### 3.2 · Por qué esto y no solo el caché

- **Sobrevive a un reinicio.** El caché de hoy vive en memoria y se pierde en
  cada despliegue; las llaves en la base, no.
- **Convierte una dependencia dura en una blanda.** Hoy, sin OpenF1 no sabemos
  ni qué sesiones existen. Con la tabla, sin OpenF1 seguimos sabiéndolo y solo
  perdemos el resultado de la última sesión.
- **Baja el tráfico a lo que de verdad hace falta**, que es la mejor defensa
  contra un límite de ritmo que ya nos está pegando.

### 3.3 · Lo que NO propone

- **No tocar `granPremioDe`.** La correspondencia por cercanía de fechas
  funciona y cambiarla no resuelve nada de esto.
- **No sembrar hacia atrás** hasta saber desde qué año cubre OpenF1 y si a
  alguien le sirve.
- **No retirar el experimento** sin que el usuario lo decida, aunque sea lo que
  yo recomendaría.

### 3.4 · Cómo verificarlo, porque el proyecto lo exige

- Cada prueba nueva **tiene que fallar sin el arreglo**, comprobado, no supuesto.
- La cuenta de peticiones a OpenF1, **medida antes y después**, es el número que
  demuestra que esto sirvió. Sin ese número la entrada de bitácora no vale.
- Y comprobarlo en producción después de desplegar, no solo en local.

---

## 4 · Lo que el usuario tiene que decidir

Estas van con él, no con quien programe. Tráeselas **antes** de construir:

1. **¿Se retira el experimento de la carrera de fuentes?** Con el número de
   peticiones que ahorra.
2. **Cada cuánto se refresca el horario futuro**, con la propuesta ya razonada.
3. **Si se siembra hacia atrás** o solo de ahora en adelante.

Y las dos que ya están abiertas en `ESTADO.md` y no son de esto: la CSP para las
radios de equipo, y la CSP para la foto de la cuenta de Google.

---

## 5 · El análisis, medido (sesión de casa, 2026-09-26)

Todo lo de aquí está medido la noche del 2026-09-25 y la madrugada del 26,
contra OpenF1 y contra producción. Lo que sale de leer el código va marcado
como tal.

### 5.0 · ⚠️ La premisa de la sección 1 que NO se sostiene

La sección 1 dice «lo que rechazan es **la IP de producción**». **Falso como
bloqueo permanente.** Producción habló con OpenF1 durante todo el fin de semana
de Bakú, **con el código viejo** —el que pedía el calendario cada cinco
minutos—: el parche `2c42d02` se subió a las 23:11Z del 25, y las medidas son
de las 10:00Z y las 13:30Z del 24 y del 25.

Leído de `/api/fuentes` en producción:

| Sesión de Bakú | Fin | OpenF1 contestó | Sondeos |
|---|---|---|---|
| Práctica 1 | 24-09 09:30Z | 30m 14s | 31, uno por minuto |
| Práctica 2 | 24-09 13:00Z | 30m 18s | 31 |
| Práctica 3 | 25-09 09:30Z | 30m 10s | 31 |
| Clasificación | 25-09 13:00Z | 30m 12s | 31 |

El primer sondeo de cada sesión salió entre 10 y 17 s después del final, y para
eso el reloj necesitaba el calendario cargado: **la llamada del paso 1
funcionó**. Además, el comentario del propio cliente desde el 2026-09-12
(`src/services/openf1/client.ts:60-77`) atribuye los 401 a **las IP compartidas
de los runners de GitHub**, y hay un cron horario que llama a `darUnaVuelta`
desde ahí (`.github/workflows/refresco.yml:15`).

**Conclusión: los 401 son intermitentes y compatibles con un limitador de
ritmo, no con una puerta cerrada.** Importa porque un limitador se alimenta del
propio tráfico.

### 5.1 · Qué le pedimos a OpenF1, y cuánto

El amplificador: cada petición lógica son **4 HTTP** con 401 (esperas 1+3+7 s,
`client.ts:55` y `:87`), y `clasificacionDeSesion` son **dos** lógicas en
paralelo que no se cancelan entre sí → **2 HTTP sano, 8 con 401**.

| Origen | Cada cuánto | Sano | Con 401 |
|---|---|---|---|
| Calendario, `vuelta.ts:39` | Caché de 6 h | 4 HTTP/día | **1 152 HTTP/día** |
| Avisos, `avisos-de-sesion.ts:194` | Cada 5 min por sesión, hasta 48 h | ~2 por sesión | ~4 552 por sesión |
| Sondeo, `carrera-de-fuentes.ts:147` | Cada minuto la 1ª hora, ventana de 8 h | 62 por sesión (medido) | ~1 160 por sesión |
| Cron de GitHub, `refresco.yml:15` | Cada hora | hasta 24 | ~96 |

**Fallo verificado línea a línea**: el camino de fallo de `calendario.ts:67-74`
devuelve el calendario viejo pero **no actualiza `pedidoEn`**, así que `sirve`
se queda en falso y vuelve a preguntar en las 288 vueltas del día. **La caché
de seis horas se desactiva sola justo cuando OpenF1 falla.**

| Escenario | Sano | Con 401 permanente |
|---|---|---|
| Día sin sesiones | **4** | **1 152** |
| Fin de semana | **~332** (medido) | **~34 000** (derivado del código) |

Reparto con 401: **avisos 66 %, calendario 17 %, experimento 17 %**.

### 5.2 · Qué no está en nuestra base

No están `session_key`, `date_end`, `is_cancelled` ni `meeting_key`. `Race`
guarda solo **inicios** y **ningún final**.

El final se deduce con la tabla de `src/lib/sesiones.ts:55-65`, que **no
coincide con la realidad en 3 de 7 tipos** (medido sobre las 115 sesiones de
2026 en OpenF1):

| Tipo | Nuestra tabla | Real |
|---|---|---|
| Carrera | 150 min | **120** |
| Sprint | 45 min | **60** |
| Clasif. sprint | 45 min | **44** |
| Prácticas / Clasificación | 60 min | 60 (una FP1 de 90: Miami) |

Hoy solo afecta a la presentación —los avisos usan el `date_end` de OpenF1—,
pero es justo el dato a guardar si se deja de preguntar.

### 5.3 · El cruce por cercanía de fechas: sirve

Simulado el algoritmo de `gran-premio.ts:13-36` sobre las **115 sesiones de
2026**: las 115 se asignan a su ronda correcta y **ninguna produce dos
candidatas**.

| Medida | Valor |
|---|---|
| Separación mínima entre carreras consecutivas | **7 días** (diez parejas) |
| Caso más apretado | FP1 de China: 1,854 d de la suya, 5,146 d de Australia |
| Holgura contra el margen de 5 días | 3 h 30 min |
| Holgura del desempate por cercanía | **3,29 días** |

El fin de semana con sprint **no aprieta**: en 2026 **todos** los GP tienen
exactamente **5 sesiones**, con sprint o sin él. Pero ojo: el cruce va de
OpenF1 hacia nuestra carrera; para sembrar hace falta además emparejar sesión
con sesión por `session_name`, y **eso no existe todavía**.

### 5.4 · Cada cuánto cambia lo futuro

Una sola petición trae la temporada entera: **131 sesiones, 48 KB, 0,9 s**. El
horizonte deja de ser una pregunta.

Nuestra base y OpenF1 coinciden **al minuto en 114 de 115 sesiones** (la única
discrepancia es la carrera de Miami, 3 h, y es de nuestro lado). Pero la
temporada sí cambió de verdad: **dos grandes premios anulados** —Baréin y
Arabia Saudí de abril, 10 sesiones con `is_cancelled`—.

Detalle útil: esas dos anuladas **no tienen carrera equivalente en nuestra
base**, así que `granPremioDe` ya devuelve `null` para ellas. `is_cancelled`
haría falta solo si se siembra directamente desde OpenF1 sin pasar por ese
cruce.

### 5.5 · Las llaves existen ANTES de que la sesión corra

**Sí.** El 2026-09-25 OpenF1 ya publicaba **41 sesiones futuras** hasta Abu
Dabi, todas con `session_key`, `date_start`, `date_end` e `is_cancelled`:

```
11727 Bahrain    Practice 1  2026-10-02T04:30Z -> 05:30Z
11379 Singapore  Sprint Qual 2026-10-09T12:30Z -> 13:14Z
11388 Singapore  Race        2026-10-11T12:00Z -> 14:00Z
```

**El sembrado puede ser anticipado y de temporada completa, en una petición.**
No hace falta sembrado perezoso.

### 5.6 · Temporadas viejas: OpenF1 empieza en 2023

| Año | Respuesta |
|---|---|
| 2018-2022 | **404** |
| 2023 | 200 — 118 sesiones |
| 2024 | 200 — 123 sesiones |
| 2026 | 200 — 131 sesiones |

Nuestra base tiene 2010-2026, así que hacia atrás no hay nada que sembrar
aunque se quisiera.

### 5.7 · Cuánto tráfico es el experimento

| Escenario | Del experimento | Del total |
|---|---|---|
| Fin de semana sano | **310 HTTP** de ~332 | **93 %** |
| Con 401 permanente | ~5 800 de ~34 000 | 17 % |
| Día sin sesiones | 0 | 0 % |

Los 310 son medidos: 31 sondeos por sesión × 2 peticiones × 5 sesiones,
contados en las filas de Bakú. Y el experimento tiene ya **9 medidas**, no
siete.

### 5.8 · Dónde se contradice la propuesta de la oficina

Se coincide en el fondo: guardar llaves y finales es lo correcto, y 5.5 lo
refuerza más de lo que la propuesta suponía. También en no tocar `granPremioDe`
y en no sembrar hacia atrás.

| # | La propuesta dice | El análisis dice |
|---|---|---|
| 1 | La IP de producción está rechazada | Intermitente. Ver 5.0 |
| 2 | La tabla «baja el tráfico a lo que hace falta» | La tabla quita el **17 %**. El **66 %** son los avisos reintentando cada 5 min durante 48 h a 8 peticiones por intento, y eso no lo toca |
| 3 | El parche de 6 h deja el calendario en 4/día | Solo si OpenF1 responde. Al fallar vuelve a 1 152 (ver 5.1) |

**Lo que el análisis añade**: el 83 % del tráfico con 401 es tormenta de
reintentos, y se corta con dos arreglos pequeños. La tabla es correcta, pero es
**resistencia a caídas, no el arreglo del tráfico**.

---

## 6 · Las tres decisiones, ya contestadas por el usuario (2026-09-26)

| # | Decisión | Respuesta |
|---|---|---|
| 1 | ¿Se retira el experimento de la carrera de fuentes? | **SÍ, se retira.** Sus palabras: «si consideras que ya tenemos lo suficiente para retirarlo entonces hay que hacerlo». Se van el módulo, su tabla `source_probes`, la ruta `/api/fuentes` y el reloj de un minuto de `instrumentation.ts` |
| 2 | Cada cuánto se refresca el horario futuro | **Delegada en la sesión.** Sus palabras: «creo que lo que corresponde sería que lo decidas tú ya que tienes más conocimientos». Decidida abajo |
| 3 | ¿Se siembra hacia atrás? | **NO.** Sigue la recomendación: OpenF1 empieza en 2023 y los avisos solo usan la temporada en curso |

### 6.1 · La decisión 2, tomada y razonada

Tres refrescos, y cada número sale de una medida:

| Cuándo | Cuánto cuesta | De dónde sale el número |
|---|---|---|
| **Una vez al día**, la temporada entera | 1 petición | Una sola petición trae las 131 sesiones con sus finales (48 KB, 0,9 s), así que limitar el horizonte no ahorra nada. Acota lo viejo a 24 h, y los cambios de calendario se anuncian con días |
| **Al empezar un día con sesión**, otra vez | +1 ese día | Lo único que 24 h no cubre son los retrasos del mismo día, y `date_end` es de donde se cuentan los `ESPERA_MINUTOS = 35` |
| **Al fallar, no antes de 30 min** | tope de 48/día | Hoy un fallo devuelve a 288 vueltas diarias (5.1). Un calendario de horas sigue siendo correcto; insistir cada 5 min con un limitador delante es lo que lo empeora |

Resultado: **1-2 peticiones al día en marcha normal**, con un techo de 48 en el
peor caso, frente a las 4/día de hoy —o 1 152 cuando falla—.

Y **persistido en la base**, que es lo que pidió el usuario: un despliegue deja
de borrar el calendario.

---

## 7 · El orden de trabajo — ✅ HECHO el 2026-09-26

El usuario dio el go con «igual vamos a hacer todo pero en el orden
correspondiente», y se hizo entero ese mismo día. **Este documento queda como
registro; no hay nada pendiente en él.**

El orden se alteró sobre lo escrito arriba por una razón: al abrir la sesión, el
flujo horario llevaba toda la tarde fallando y la portada de producción
devolvía 500. Eso iba primero.

| # | Qué | Commit | Efecto comprobado |
|---|---|---|---|
| 0 | La portada devolvía 500 | `ce6ea40` | `ultimaCorrida` volvía de la caché con la fecha en texto. Dos visitas seguidas a 200, la segunda desde caché |
| 1 | El sembrado roto | `e5d367a` | `grid: NaN` porque Jolpica publica los resultados antes que la parrilla. **R15 sembrada, 22 pilotos** |
| 2 | El freno de los reintentos | `7ec0314` | Calendario con 401: de 1 152 peticiones/día a **48** de techo. Avisos: de ~4 552 por sesión a ~770 |
| 3 | Retirar el experimento | `e6590da` | **93 %** del tráfico de un fin de semana sano. `/api/fuentes` da 404 y la base sigue en pie |
| 4 | La tabla de llaves | `7dff710` | Un arranque tras despliegue deja de costar una petición, y un OpenF1 caído ya no mata la vuelta |
| 4-bis | `storedCalendar` en `/api/health` | `c0874a5` | Sin esto, que la tabla no se sembrara **no se notaría** |

Las diez medidas del experimento quedaron escritas en la bitácora (entrada 77)
**antes** de borrar su tabla, porque eso no tiene vuelta atrás.

### Lo que este documento proponía y no se hizo, con su motivo

- **Guardar la ronda junto a la llave.** No se guarda: `granPremioDe` ya cruza
  por cercanía de fechas y está comprobado sobre las 115 sesiones de 2026 —las
  115 caen en su ronda correcta, 3,29 días de holgura en el desempate—.
  Guardarla añadiría un dato que puede quedarse viejo, y los dos grandes
  premios anulados de abril no tienen ronda nuestra que asignarles.
- **Refrescar «una vez al día más otra al empezar un día con sesión»**, como
  decía la sección 6.1. Se quedó en las **seis horas** que ya había: son 4
  peticiones diarias, cubren solas el caso del día de sesión y evitan un caso
  especial. Menos código por la misma frescura.

### La lección de la sesión, que vale más que el código

**Subir no es terminar.** El día empezó con un CI en rojo que la sesión
anterior había dado por bueno sin abrirlo, y con el despliegue **saltado** por
eso mismo. Desde ahí, cada commit fue con lint, tipos, suite y build, y
esperando el verde del anterior antes de apilar el siguiente.
