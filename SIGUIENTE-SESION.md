# Para la siguiente sesión (casa) — al 2026-09-14, noche

---

## 0 · ⚠️ LO PRIMERO: el descuadre de documentos, y cómo no repetirlo

Hoy pasó, y costó una bronca merecida del usuario: se le presentaron **seis
puntos como pendientes cuando cinco estaban hechos**. La causa está
identificada y no es git.

**No falta nada por bajar.** Comprobado hoy: `git fetch` no trae nada y la rama
local coincide con `origin/main`. Lo que se hizo en casa el 13 y el 14 —incluida
la bitácora— está en el repositorio.

**Lo que falla es cuál documento se lee.** `MEJORAS-PENDIENTES.md` son las
**notas de lo que el usuario reportó**, y sus secciones se quedan
desactualizadas: el trabajo se cierra en la bitácora y en un commit, y volver
ahí a tachar cada sección se olvida. Leerlo como si fuera el estado actual da
una foto de hace días.

**El orden correcto para saber si algo está hecho:**

1. **El código.** Buscar la cosa concreta. Si el aro del líder está pintado en
   `MapaDeCarrera.tsx`, el punto 11 está hecho, diga lo que diga el otro
   archivo.
2. **`PROGRESO_RELANZAMIENTO_2026.md`** (la bitácora). Entradas en orden
   inverso: la más nueva **arriba**, no al final. Hoy se leyó el final y salieron
   las entradas de agosto.
3. **El registro de avance de `MEJORAS-PENDIENTES.md`**, que sí se mantiene.
4. Las secciones sueltas de `MEJORAS-PENDIENTES.md`, solo para leer **qué
   reportó el usuario**, nunca para saber si está resuelto.

**Y mirar la fecha.** Una condición de reapertura escrita en futuro («la prueba
llega con la FP3 del sábado») caduca sola. Hoy se anunció como espera algo que
había corrido dos días antes y que se cerró leyendo `/api/fuentes` en un minuto.

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

## 2 · LO QUE QUEDA: un punto, y son las radios

**Verificado el 2026-09-14 buscando cada cosa en el código**, no leyendo el
documento de notas.

### 22 · Radios de equipo en el replay (OpenF1 `/v1/team_radio`)

Es lo único abierto de toda la lista. ⚠️ **Abre la CSP a
`livetiming.formula1.com`**, así que hay que avisar al usuario **antes** de
tocar nada — es una regla suya, no una cortesía.

### Cerrados hoy tras comprobarlos en el código (estaban marcados como abiertos)

| Punto | Dónde está la prueba de que está hecho |
|---|---|
| **11** aro del líder | `MapaDeCarrera.tsx`, «El aro del líder», sobre la línea 279 |
| **12** abandonos y banderas | `MapaDeCarrera.tsx`: tres anillos encadenados y cola de `DNF · LEC` (`5188644`); bandas de estado en el deslizador |
| **25** el delta con todos parados | `471303f`: la roja dura lo que duró la parada real (1819 s contra los 103 declarados) |
| **26** los cinco primeros al encoger | `replay/ReplayClient.tsx`: el tirador, elegido por el usuario sobre maqueta |
| **3 + 20** sesiones nunca vacías | `SesionPendiente` usado en cuatro sitios + `ParrillaProvisional` |
| **5** «from ApexData» | Cerrado el 12: lo añade iOS, no existe la opción en la Notification API |
| **19** Brave en Android | El usuario ya lo comprobó. **Falta anotar el resultado** — si los avisos llegan o no |

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
