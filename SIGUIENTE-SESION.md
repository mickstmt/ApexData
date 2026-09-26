# Para la siguiente sesión — al 2026-09-26

> ## 🔴 LO PRIMERO DE MAÑANA: él da el GO y se empieza
>
> La noche del 25 se hizo el **análisis completo** del encargo
> `TRABAJO-CALENDARIO-OPENF1.md` y **él contestó sus tres decisiones**. No hay
> nada que volver a preguntarle ni que volver a medir: está todo en las
> **secciones 5, 6 y 7** de ese documento.
>
> Sus palabras al despedirse: «guarda estas decisiones para mañana que ya me voy
> a dormir; lo primero que haré mañana será darte el go».
>
> **Lo decidido:**
>
> | # | Decisión | Respuesta |
> |---|---|---|
> | 1 | Retirar el experimento de la carrera de fuentes | **SÍ** |
> | 2 | Cada cuánto refrescar el horario futuro | **Delegada en la sesión** → 1/día la temporada entera, +1 al empezar un día con sesión, y al fallar no antes de 30 min, persistido en la base |
> | 3 | Sembrar hacia atrás | **NO** — OpenF1 empieza en 2023 |
>
> **El orden acordado** (sección 7 del encargo):
>
> 1. **El freno de los reintentos** — el 83 % del tráfico con 401, y no depende
>    de ninguna decisión. La línea de `pedidoEn` en `calendario.ts:67-74`, y un
>    freno en los avisos, que hoy reintentan cada 5 min durante 48 h a 8
>    peticiones por intento.
> 2. **Retirar el experimento**: módulo, tabla `source_probes`, ruta
>    `/api/fuentes` y el reloj de un minuto de `instrumentation.ts`.
> 3. **La tabla de llaves de OpenF1**, sembrada de temporada completa en una
>    petición.
>
> Con medida antes y después en cada paso: sin el número, la bitácora no vale.
>
> **Y una corrección que hay que respetar**: la sección 1 del encargo dice que
> OpenF1 rechaza «la IP de producción». **Es falso como bloqueo permanente** —
> producción habló con OpenF1 durante todo Bakú con el código viejo—. Los 401
> vienen de las IP compartidas de los runners de GitHub y son intermitentes. Ver
> la sección 5.0.
> **Trampa de Windows, comprobada el 26**: en esta máquina
> `npx vitest run tests/estado.test.ts` sale **en rojo sin que nada esté mal**.
> El repositorio no tiene `.gitattributes` y `core.autocrlf` está en `true`, así
> que git deja `ESTADO.md` con CRLF mientras `npm run estado` lo escribe con LF,
> y la prueba compara el texto tal cual. En el CI (Linux) siempre es LF y sale
> verde. **No es que el estado esté viejo**: se arregla con un `.gitattributes`
> o normalizando en la prueba, y no se tocó porque no había GO.

---

> **Corregido el 15 desde casa.** La sección 2 daba por terminada la lista
> («queda uno: el 22») y no lo estaba. La cuenta buena está en
> **«LO QUE QUEDA DE VERDAD»**, al final de la sección 2. El resto del
> documento —el mapa commit → punto, y el método— sigue siendo bueno.

---

## 0 · ⚠️ LO PRIMERO: no leas para saber qué falta. Ejecútalo.

```bash
git status && git pull --ff-only && npm ci
npm run estado
```

`npm run estado` imprime **`ESTADO.md`**, y es el único documento del proyecto
que **no puede quedarse viejo**: no lo escribe nadie. Cada línea es una sonda
sobre el repositorio (`scripts/estado.ts`) y `tests/estado.test.ts` compara el
fichero con lo que sale al ejecutarlo, así que si el código cambia y no se
regenera, **el CI se pone en rojo**. Comprobado que muerde en los dos sentidos.

La skill **`empezar-sesion`** lleva el procedimiento completo. Úsala.

### Por qué existe todo esto

El 14 y el 15 de septiembre de 2026 se le dijeron al usuario **cuatro cosas
falsas seguidas**, todas por leer un documento en vez de el código:

1. Que quedaban **seis puntos pendientes**, cuando cinco estaban hechos.
2. Que había que **esperar al siguiente fin de semana** para una verificación
   cuya sesión había corrido dos días antes.
3. Que **quedaba un solo punto**, contando sobre un índice con agujeros.
4. Que había que **pulsar Deploy a mano** en el servicio de telemetría, que se
   despliega solo desde el 2026-08-24.

Ninguna fue git: la rama siempre coincidió con `origin`. Se escribieron avisos
en los tres documentos y **la cuarta vez volvió a pasar igual**. Por eso ahora
hay barreras que fallan, no párrafos que avisan:

| Barrera | Qué impide |
|---|---|
| `ESTADO.md` + `tests/estado.test.ts` | Que el estado del proyecto se quede viejo sin que nadie lo note |
| Job `bitacora` en el CI | Que se trabaje sin dejar rastro: un push que toca `src/`, `python-service/app/` o `prisma/` y no toca la bitácora **falla**, y el despliegue depende de él |
| Skill `empezar-sesion` | Llegar de la otra máquina y opinar sin reconciliar |

### Qué documento sirve para qué

| Documento | Para qué | Para qué NO |
|---|---|---|
| **`ESTADO.md`** | Saber **cómo está el código ahora**. Generado | — |
| `PROGRESO_RELANZAMIENTO_2026.md` | Saber **qué se hizo y por qué**. Entradas nuevas **arriba** | Saber si algo sigue pendiente: también se olvida. Los puntos 11 y 26 se construyeron el 12 y no aparecían en ninguna entrada |
| `MEJORAS-PENDIENTES.md` | Saber **qué reportó el usuario**, con sus palabras | Saber si está resuelto. **Nunca** |
| Este fichero | El traspaso y lo que un script no puede saber: decisiones suyas pendientes, cosas aplazadas | La lista de pendientes: esa la da `npm run estado` |

### Y mirar la fecha

Una condición escrita en futuro («la prueba llega con la FP3 del sábado»)
caduca sola. Comparar su fecha con hoy antes de repetirla.

---

## 1 · Dónde estamos

Producción: <https://apexdata.meeks.fun> · 532 pruebas unitarias y 187 de
navegador en verde · CI verde en `b9b452d`.

**Todo lo de hoy está subido y desplegado.** Cinco commits de trabajo y tres de
documentación.

### Lo que se hizo hoy (14 de septiembre, oficina)

- **Puntos 45 y 47 · la web deja de ser la PWA estirada** (`8fe22c5`). El
  contenido se para en **1280** y las nueve secciones bajan a un **raíl** a la
  izquierda desde `lg`. Desaparece la hoja modal de teléfono en el monitor. El
  replay no lleva raíl: la lista de pantallas completas se comparte con la del
  pie en `lib/pantallas-completas`.
- **Punto 17 · la cuenta, la parte visible** (`8fe22c5`). Panel de ajustes
  detrás de un engranaje, con la cuenta como primera fila y **el tema dentro**.
  El interruptor de tema deja de estar suelto en la cabecera.
- **Punto 49 · la casilla de sesión solo se pulsaba al 70 %** (`e773521`).
  Medido en producción antes de tocarlo: 61 px de enlace en 88 de casilla.
- **Punto 46 · una sola fila para todas las tablas** (`45537c2` + `b9b452d`).
  Dorsal, foto, bandera del piloto y **bandera de la escudería**, que estaba en
  la base desde siempre y no se enseñaba en ningún sitio. Carrera,
  clasificación del fin de semana, sprint, prácticas, campeonato y portada.
  `lib/parrilla` cruza las tres letras de FastF1 con nuestra ficha: por eso las
  prácticas dejan de decir «VER».
- **Punto 48 · el gráfico de Clasificación** (`45537c2`). Pilotos primero,
  constructores en columna de contexto, gráfico debajo. Y la tarjeta de
  **próxima carrera** con cuenta atrás.
- **Punto 17-bis · entrar con el correo** (`7bce630`). Enlace por correo vía
  Resend, sin `nodemailer`. Dominio `meeks.fun` verificado. Pantalla de error
  propia en español.
- **Punto 17-ter · los favoritos ya viajan** (`b9b452d`). `sincronizar` decide
  qué queda; el caso de conflicto **junta** las dos listas.
- **Punto 20-bis · las prácticas dejan de pedirse cada vez** (`b9b452d`). Las
  cuatro rutas de cronometría mandan `Cache-Control: public, max-age=86400`.
- **Punto 18 · verificado** (`ead8161`). Leído `/api/fuentes` con el fin de
  semana de España ya corrido: fastf1 publica **16 minutos antes** que openf1.

---

## 2 · EL ESTADO REAL, reconciliado commit por commit

**Cómo se hizo esto, y cómo hay que rehacerlo cada vez que se vuelve de la otra
máquina** (es el paso que hoy no se dio, y por eso salió mal):

```
git log --format="%h|%ad|%s" --date=short --since="<último día que conozco>" \
  | grep -E "\|(feat|fix|perf)"
```

Y mapear **cada línea** a su punto antes de decir nada. No es opcional: hoy
habían entrado **51 commits funcionales desde el 10 de septiembre**, 28 de ellos
el 13 y el 14, y la sesión de la oficina no reconcilió ninguno — se limitó a
leer un documento viejo y a comprobar seis puntos sueltos cuando el usuario la
corrigió.

### El mapa completo (2026-09-10 → 2026-09-14)

| Commit | Punto que cierra |
|---|---|
| `82a039c` `5e054ee` | El replay entero, coche a coche |
| `debdc19` `60baeac` `1803007` `a937692` | Navegación: parpadeo, entrada desde la derecha, rebote |
| `1d2413b` `432c669` `426bc62` | **18** la carrera de fuentes (**verificado el 14**) |
| `4428cee` | **7 + 16** el pie en el replay y el alto de la barra |
| `9751d2d` `704c4aa` | **8** el modo claro en el replay, y sus contrastes |
| `e4d7771` | **10b** el cursor del scrubber |
| `9a21a01` | **21** la cabecera del detalle |
| `794a3f5` | **16** el pie es de la web, y `/acerca` |
| `2758640` | **14** la barra inferior flotante |
| `1cc677b` | **6 + 15** el mapa se encoge |
| `6b100d7` | **13** el botón «Ver la carrera» |
| `4b66c8e` | **1** los huecos en bandera roja |
| `d40f51f` | **4** la previa repetida |
| `0a3183b` | **9 + 10a** cuánto mueven los saltos, y en qué minuto estás |
| `d583991` `e134104` `c913d6b` `d3848e1` | **14-bis** la barra corregida sobre maqueta |
| `b935adb` `3a12035` `3a29370` | Avisos: el 401 de OpenF1, la pestaña correcta, el «a las» |
| `ba416c5` `471303f` | **25** el delta con todos parados (dos commits, dos días) |
| `581b4b5` | **26** los cinco primeros al encoger |
| `2ee07cd` `0b86143` | **24 + 32** mandos en vertical y pantalla completa |
| `3e422eb` | **11** el aro del líder · **12** el abandono se nota |
| `9fcab8e` | **2** el final de carrera |
| `ecc0709` | **28** el doble toque |
| `73152c7` | Una consulta menos por visita al replay |
| `b72ed48` | **14-ter** la barra se comía toques |
| `7c0929b` | **39** abandonos falsos · **36** DNF con nombre · **23** el realce |
| `d94ff58` `999eed9` | **40** los mandos del replay, y el deslizador |
| `426bc62` | **18** FastF1 primero — 37 minutos antes |
| `0f22ead` | **38** la portada contradecía al aviso |
| `69204b4` | **34** un teléfono tumbado no es un ordenador |
| `cd3b4f2` | **41** quien sale del pit lane |
| `d221934` | **42** la proporción en escritorio |
| `5188644` | **36 / 12** el aviso parpadea tres veces y hace cola |
| `7f51418` | **43** la lista llena su columna |
| `81b9e50` `2a2d9b6` `698ec24` | **17** las cuentas: modelo, sesión y favoritos |
| `8fe22c5` | **45 + 47** el armazón de escritorio · **17** el panel de ajustes |
| `e773521` | **49** la casilla pulsable · el botón dice a dónde lleva |
| `45537c2` `b9b452d` | **46** una sola fila para todas las tablas · **48** · **20-bis** · **17-ter** |
| `7bce630` | **17-bis** entrar con el correo |
| `92866a9` (21 ago) | **3 + 20** sesiones nunca vacías |

### ⚠️ Conclusión CORREGIDA el 2026-09-15 (casa)

**Aquí decía «de los 49 puntos queda uno: el 22». Era falso, y costó caro**: al
pedir el listado de pendientes, al usuario se le dijo que solo faltaban las
radios. Él sabía que no y tuvo que volver a preguntar dos veces.

**Por qué falló**: la cuenta se hizo sobre los puntos NUMERADOS de
`MEJORAS-PENDIENTES.md`, y ese índice **no es completo**. Comprobado el 15:

| Agujero | Detalle |
|---|---|
| Faltan números enteros | **27, 29, 30 y 31 no existen en ningún documento.** No se puede saber si se perdió algo o si nunca se usaron |
| El **28** | Solo vive en la bitácora (el doble toque). No tiene sección propia |
| El **49** | Igual: citado en la bitácora y aquí, sin sección en `MEJORAS-PENDIENTES.md` |
| Lo que nunca llevó número | Limpiezas, decisiones aplazadas e ideas suyas viven en prosa, en tres ficheros distintos. **Contar puntos numerados se las salta todas** |

**Regla que sale de esto**: no contar puntos. Enumerar lo abierto una cosa por
fila, buscando en los tres sitios —`MEJORAS-PENDIENTES.md`, la bitácora y el
«Lo que NO está hecho» de `GUIA-DE-PRUEBAS-2026-09.md`— y comprobando cada una
**en el código**.

### LO QUE QUEDA DE VERDAD

**No se mantiene aquí a mano: lo da `npm run estado`.** Esta sección lo listaba
y duraba un día. Lo que sigue es lo que un script no puede saber —decisiones
suyas y cosas aplazadas por él—, y eso sí vive aquí.

**Esperando una decisión o una prueba suya**

| Qué | Qué hace falta de él |
|---|---|
| **19 · ¿En Brave llegan los avisos?** | Que instale la PWA en Brave **en su teléfono** y mire si llega uno. Brave desactiva por defecto los servicios de Google para push |
| **La foto de la cuenta de Google sale rota** | Decidir: abrir la CSP a `lh3.googleusercontent.com` (una imagen de Google en cada página) o quedarse con la inicial |
| **La barra flotante sobre un titular** | Sin decidir. Si algún día molesta, la palanca que funciona es subir la opacidad del 34 % a ~45 %, **no** la sombra (probado, no sirve) |
| **Los iconos propios** | Casco, podio y bandera están dibujados a mano en `components/iconos/motor.tsx` porque `lucide` no los tiene. Un juego completo y coherente es una pieza aparte, sin decidir |

**Aplazado a propósito — no es deuda, es decisión suya**

| Qué | Cuándo se retoma |
|---|---|
| **44 · Neumático, paradas y «en boxes» en la fila** | Decidido el 14: no se integra. Motivo de producto, no de sitio: «al ser una repetición le quita peso; **sin embargo si fuese en vivo ahí sí que sería info crucial**». El disparador es el día que haya **timing en vivo**. Guardado: `mockups/09-la-fila-y-el-alto.html`, la tabla de holguras medida, y el dato ya comprobado (`Compound`, `TyreLife`, `Stint`, `PitInTime`, `PitOutTime` en `/api/laps/{year}/{round}/R/stints`) |
| **El mini-reproductor del replay**, tipo imagen en imagen | Idea suya, apuntada, **sin evaluar** |
| **Etiquetar las marcas del deslizador** (cada 10 vueltas) | Apuntado, no acordado |

**Lo que NO hay que volver a decir que está pendiente** (comprobado en el
código, con su commit): el aro del líder (**11**, `3e422eb`), el tirador del
mapa (**26**, `581b4b5`), las sesiones vacías (**3 + 20**, `92866a9`, del 21 de
agosto), en qué minuto estás (**10a**, `0a3183b`), el delta con todos parados
(**25**, `ba416c5` + `471303f`) y que el abandono se note (**12**, `3e422eb` +
`5188644`).

---

## 3 · Dos cosas que el usuario dejó pendientes de contestar

1. **¿En Brave llegan los avisos?** Es lo único del punto 19 que vale la pena
   conservar, y se dejó sin anotar en vez de inventarlo.
2. **La foto de la cuenta de Google sale rota**, y es una decisión suya: la CSP
   declara `img-src 'self' data: blob:`, así que `lh3.googleusercontent.com`
   está bloqueado. Enseñarla significa **abrirle la política a un dominio de
   Google** y pedirle una imagen en cada página. Mientras tanto va la inicial.

---

## 4 · Reglas de trabajo (no negociables)

- **Tres entornos siempre**: iPhone 390, Android 360, escritorio ≥1100. El ancho
  se decide **al empezar a medir**, no al presentar.
- **Nada de interfaz ni animación decidido por escrito**: maqueta navegable, con
  opciones y una recomendación explícita.
- **Lo que se enseña en una maqueta es lo que se entrega.** Si algo no va a
  entrar, se marca **dentro de la maqueta**, no en el mensaje de después. Ya
  falló dos veces: el usuario compara con la imagen, no con el texto.
- **Ante una referencia, copiar su arquitectura de información**, no decorar la
  estructura que ya existe.
- **Medir en el navegador** antes de dar nada por bueno.
- **Cada prueba nueva tiene que fallar sin el arreglo**, comprobado, no supuesto.
- **Un solo paso por mensaje** cuando el usuario ejecuta algo a mano. Nunca una
  lista.
- **Desplegar antes de pedirle que pruebe.**
- **Avisar antes de abrir la CSP.**
- Nunca proponer parar: eso lo decide él.

---

## 5 · Por dónde empezaría

**No es el 22.** El 22 necesita su permiso antes de tocarlo (abre la CSP), así
que no se puede empezar por ahí sin preguntar.

1. **Retirar `public/maqueta/`.** Es lo único que no necesita decisión de nadie:
   se dijo que salía al cerrar el punto 14, el 14 está cerrado, y esas tres
   páginas siguen servidas en producción. Diez minutos.
2. **Las prácticas por FastF1 (18-bis).** Es la que más le afecta a diario —los
   avisos de práctica siguen llegando a los ~50 minutos— y tiene una decisión
   real detrás: FastF1 no publica clasificación de prácticas, así que hay que
   elegir entre avisar sin clasificación antes, o seguir esperando a OpenF1.
   Llevarle las opciones medidas, no la pregunta a secas.
3. **Preguntarle por el 22 y por la foto de Google**, que son las dos aperturas
   de CSP pendientes. Las dos en el mismo mensaje, porque son la misma decisión
   de fondo.

Y **antes de decirle a él que algo está pendiente, buscarlo en el código**.

---

## 6 · Cosas del entorno que ahorran media hora

- El servicio de telemetría en local va en **el puerto 8099**, no el 8000, que
  está ocupado por otra app suya:
  `PORT=8099 ./venv/Scripts/python.exe run.py`
- En local **no hay `FASTF1_SERVICE_URL`**; los datos del replay se pueden traer
  de producción con `page.route('**/api/positions/**')`.
- Los **heredocs de bash fallan** con este contenido (acentos, comillas
  angulares), y la consola de Windows revienta al imprimir UTF-8 sin
  `PYTHONIOENCODING=utf-8`. Para editar archivos: script de Python escrito con
  la herramienta de escritura.
- Las **pruebas de navegador con un solo proceso** (`--workers=1`): la base
  comparte una conexión y en paralelo las páginas de datos salen vacías.
- El CI **no despliega si algún job falla**. Verde o nada.
- Para medir texto recortado, **`scrollWidth` no sirve**: con `text-overflow` el
  navegador recorta el contenido al hueco y siempre da cero. Hay que medir con
  un `Range`.
- `npx next start` avisa de que no va con `output: standalone`. **Funciona
  igual** y es lo que usa Playwright; no es el error que parece.
- En el registro de EasyPanel salen seis `Ecmascript file had an error` de
  `src/instrumentation.ts`. **Son avisos del Edge Runtime, el build termina en
  `### Success`** y llevan ahí desde siempre.
