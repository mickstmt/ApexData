# Para la siguiente sesión (casa) — al 2026-09-14, noche

---

## 0 · ⚠️ LO PRIMERO: ningún documento tiene el estado completo. Solo el código.

Hoy costó una bronca merecida: se le presentaron al usuario **seis puntos como
pendientes cuando cinco estaban hechos**. La causa está identificada y **no es
git**.

**No falta nada por bajar.** Comprobado: `git fetch` no trae nada y la rama
local coincide con `origin/main`. Lo hecho en casa el 13 y el 14 está en el
repositorio.

### El problema de verdad: los dos documentos tienen agujeros

- **`MEJORAS-PENDIENTES.md`** son las **notas de lo que el usuario reportó**.
  Sus secciones se quedan viejas: el cierre se escribe en la bitácora y en el
  commit, y volver ahí a tachar se olvida. **Nunca sirve para saber si algo está
  resuelto.**
- **`PROGRESO_RELANZAMIENTO_2026.md`** (la bitácora) es mejor, pero **también se
  olvida**. Rastreado el 2026-09-14: los puntos **11** (aro del líder, `3e422eb`)
  y **26** (el tirador del mapa, `581b4b5`) se construyeron el 12 de septiembre y
  **no aparecen en ninguna entrada**; el **3** se cerró el 21 de agosto y
  tampoco; y el **12** y el **25** sí están, pero archivados con OTRO número
  (como 36 y como 37). Están anotados desde hoy, pero la lección queda: la
  bitácora se escribe a mano y por eso falla.

### El orden correcto para saber si algo está hecho

1. **El código, y `git log --grep`.** Buscar la cosa concreta. Si el aro del
   líder está pintado en `MapaDeCarrera.tsx`, el punto 11 está hecho, diga lo
   que diga cualquier documento. **Este es el único registro completo.**
2. **La bitácora**, para el porqué y lo medido. Entradas en orden inverso: la
   más nueva **arriba**, no al final. Hoy se leyó el final y salieron las
   entradas de agosto.
3. El **registro de avance** de `MEJORAS-PENDIENTES.md`, que sí se mantiene.
4. Las secciones sueltas de `MEJORAS-PENDIENTES.md`, solo para leer **qué
   reportó el usuario**.

**Y mirar la fecha de hoy.** Una condición de reapertura escrita en futuro («la
prueba llega con la FP3 del sábado») caduca sola. Hoy se anunció como espera
algo que había corrido dos días antes y que se cerró leyendo `/api/fuentes` en
un minuto.

### Y el paso que hoy NO se dio

Al empezar la sesión habían entrado **51 commits funcionales desde el 10 de
septiembre**, 28 de ellos el 13 y el 14. **Ninguno se reconcilió.** Se leyó un
documento viejo y se dieron seis puntos por pendientes; solo al ser corregido se
comprobaron uno a uno.

**Lo primero de cada sesión que vuelve de la otra máquina es esto:**

```
git log --format="%h|%ad|%s" --date=short --since="<último día que conozco>"   | grep -E "\|(feat|fix|perf)"
```

y mapear **cada línea** a su punto. El mapa completo del 10 al 14 está en la
sección 2; se amplía, no se rehace.

**Regla práctica**: antes de decirle al usuario que algo está pendiente, buscarlo
en el código. No basta con no encontrarlo tachado en un documento.

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

### Conclusión

**De los 49 puntos de la lista, queda uno: el 22.** Todo lo demás está cerrado,
y cada cierre tiene su commit arriba.

### 22 · Radios de equipo en el replay (OpenF1 `/v1/team_radio`)

⚠️ **Abre la CSP a `livetiming.formula1.com`**, así que hay que avisar al
usuario **antes** de tocar nada — es una regla suya, no una cortesía.

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

Con el **22**, que es lo único que queda — y **preguntándole primero** por la
apertura de la CSP, que es la condición que él puso.

Si prefiere no abrirla, lo siguiente honesto es decirle que la lista está
terminada y preguntarle qué quiere construir, en vez de inventar deuda.

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
