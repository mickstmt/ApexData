# Dejar de depender de OpenF1 para saber qué sesiones existen

> **Para la sesión que lo vaya a hacer.** Este documento tiene dos partes y hay
> que respetar el orden: **primero se analiza y se le contesta al usuario**, y
> solo después se construye. La propuesta que hay al final es la de la sesión de
> la oficina del 2026-09-25; está escrita a propósito para que se pueda
> contradecir con datos, no para que se copie.

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
