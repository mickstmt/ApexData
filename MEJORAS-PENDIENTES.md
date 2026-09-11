# ApexData - 19 trabajos pendientes (lista cerrada por el usuario el 2026-09-11)

> **Estas son notas de trabajo tomadas mientras el usuario revisaba el replay recien
> desplegado en su iPhone.** Estan en el orden en que el las dijo, no por prioridad.
> Incluyen correcciones marcadas donde una primera lectura mia fue falsa: **hacer caso a
> la correccion, no a lo que corrige**.

## Reglas del usuario que aplican a TODO lo de abajo

- **Tres entornos siempre**: iPhone 390, Android 360, escritorio >=1100. «Prioridad
  iPhone» NO es solo iPhone. El ancho se decide al empezar a medir, no al presentar.
- **Interfaz y animaciones -> mockup navegable**, con varias opciones y una
  recomendacion explicita. Nunca elegirlas por escrito.
- **Paso a paso**, confirmando antes de avanzar. No adelantar pasos ni registrar
  decisiones que no se han tomado.
- **Medir en el navegador** antes de dar nada por bueno: el compilador no ve el layout.

## Orden propuesto (el usuario aun no lo ha confirmado)

1. **Bugs de cada uso**, sin decisiones suyas: 7+16, 8, 10b, 21
2. **Mockup del layout movil**, los cuatro juntos: 6, 15, 14, 13
3. **Datos**: 1, 4
4. **Replay**: 9, 10a, 11, 2, 12, 22
5. **Sesiones**: 3+20
6. **Cuentas**: 17, y 5

## Avisar antes de tocar
- El **22** abre la CSP a un dominio de la F1.
- El **14** cambia la barra inferior de **toda la app**, no solo del replay.

---

# Mejoras del replay — acumulando hasta el GO del usuario (2026-09-11)

## 1. BUG · Los huecos se suman durante la bandera roja (y sobreviven al reinicio)

**Lo que se ve** (captura del usuario, en produccion): la pildora dice **PISTA LIBRE**
y sin embargo toda la parrilla marca +1416,8s ... +1431,3s. Veinte coches metidos en
un rango de solo ~15 s, con un desplazamiento constante de ~1416 s (23,6 min) sobre
todos.

**Diagnostico de partida** (por confirmar contra los datos reales):
- El desplazamiento constante ~1416 s = la duracion de la parada por bandera roja.
- El rango de ~15 s = los huecos REALES de antes de la parada (campo agrupado, tipico
  de coche de seguridad justo antes del rojo). O sea: la cuenta no esta rota, esta
  respondiendo a otra pregunta.
- `huecoEn` responde «cuanto hace que el lider paso por aqui». Con todos parados la
  historia del lider es plana, asi que la respuesta se traga la parada entera. Ya esta
  escrito en el comentario de la funcion y en la prueba
  `con la carrera parada el hueco crece, y por eso la pantalla lo oculta`.
- **Mi parche de ayer no basta**: solo oculta el hueco cuando `estado === 'roja'`.
  Aqui el estado ya es verde y la inflacion sigue, porque los coches todavia no han
  pasado del progreso que el lider tenia al pararse. Ese es el agujero.

**A investigar en el GO**:
- Que carrera es (el usuario menciona que gana ANT; la captura NO es necesariamente
  Zandvoort). Sacar su `track_status` real y ver si el instante de la captura es rojo,
  verde o el hueco entre ambos.
- Si la pildora dice PISTA LIBRE mientras los coches siguen en fila en el pit lane,
  hay un segundo sub-fallo: el estado que se pinta no cuadra con lo que se ve.

**Direccion probable del arreglo** (no decidida): que el hueco no cuente el tiempo en
que el lider no avanzaba — medir sobre un reloj que solo corre cuando la carrera
corre, en vez de taparlo con «—».

## 2. FEATURE · Final de carrera: bandera a cuadros, celebracion y parrilla congelada

**El hallazgo del usuario, que es correcto y fino**: el replay va con datos de
posicion, y cuando ANT gana **levanta el pie para celebrar**. RUS tambien afloja, y en
esos metros de mas RUS y VER le pasan fisicamente. El replay, que solo mira metros
recorridos, los pone delante — y termina con un orden que NO es el de la carrera. El
usuario primero penso que estaba mal hecho, y luego entendio que el replay esta
diciendo la verdad de los datos; lo que falta es marcar el final.

**Lo que pide**:
1. **Congelar la parrilla** en el orden real en que cada piloto cruza la bandera a
   cuadros. Despues de esa linea, el orden ya no se recalcula.
2. Una **animacion de final**: bandera a cuadros y algo de celebracion, mostrando al
   ganador.
3. Si se puede, **luego los otros dos del podio**.

**Nota tecnica de partida**: el orden oficial ya lo tenemos en la base (`race.results`),
que es la fuente autoritativa; y el instante del cruce final se puede sacar del propio
progreso. Hay que decidir cual manda.

**Pendiente de decidir con mockup** (regla del proyecto: nada de elegir animaciones por
escrito), y **en los tres anchos**: iPhone 390, Android 360, escritorio >=1100.

## 3. FEATURE · Sesiones que aun no se han corrido: nunca vacias, y encadenadas

**Referencia**: Flashscore (captura del usuario, «Spanish Grand Prix-Madrid ·
Clasificacion», 12.09.2026, aun sin correr). En vez de una sesion vacia enseñan **la
lista de pilotos en orden alfabetico** por apellido, con bandera y equipo.

**Lo que pide el usuario, en dos niveles**:

1. **Suelo**: una sesion futura **nunca se enseña vacia**. Si no hay nada mejor, la
   parrilla de pilotos en orden alfabetico.
2. **El encadenado, que es lo importante**: si el orden de una sesion **se deriva de
   otra que ya se corrio**, hay que enseñarlo ya, sin esperar a que llegue su turno.
   - Corrida la **clasificacion del sabado**, la carrera del domingo ya tiene orden:
     se enseña como **«orden de salida»**, aunque siga siendo sabado.
   - Cuando la carrera termina, esa misma pantalla **se actualiza al orden de llegada**.
   - Igual para las **sprint** y las demas: *si un orden depende de otro y ese otro ya
     se ejecuto, el que dependia deberia actualizarse*.

**Estados que salen de ahi** (nombres provisionales): `alfabetico` (nada corrido aun) →
`orden de salida` (la fuente ya corrio) → `resultado final` (la propia sesion corrio).
La etiqueta tiene que decir **cual de los tres se esta viendo**, o se confunde una
previsión con un resultado.

**Arruga real a resolver, no bloqueante**: la parrilla de salida **no siempre es el
orden de la clasificacion** — hay sanciones, salidas desde el pit lane, cambios de
motor. Jolpica da el `grid` de verdad pero solo dentro del resultado de carrera, que
justo todavia no existe cuando queremos enseñarlo. Hay que decidir si se enseña la
clasificacion como aproximacion (y se dice que lo es) o si hay otra fuente.

**A verificar en el GO**: que tenemos ya en base (`qualifyingResults`, `sprintResults`,
`results.grid`) y que pantallas enseñan hoy una sesion vacia.

## 4. BUG · Llego una SEGUNDA previa, solo de la FP2, y encima decia «mañana»

**CORREGIDO por el usuario. Mi primera lectura era falsa**: supuse que la previa diaria
habia salido 12 h tarde, sin comprobar que hay un solo emisor. No fue eso.

**Los hechos, ya confirmados por el usuario**:
- **Jueves 20:00 — correcto.** Llego la previa del dia, y cubria **las dos** sesiones
  del viernes. Ese aviso esta bien y no se toca.
- **Viernes ~08:01 — sobra.** Llego un **segundo** aviso, «Spanish Grand Prix · mañana /
  Mañana empieza: Práctica 2 10:00.», mencionando **solo la FP2**, que era ese mismo
  dia dos horas despues.
- El usuario no recuerda que se acordara nunca un aviso propio y exclusivo para una
  sesion suelta. **Hay que comprobar si ese emisor deberia existir siquiera.**

**Lo que ya se ha mirado**: solo hay un mecanismo de previa. `previa.ts` redacta y
agrupa por dia local (20:00 de la vispera); `previas-de-sesion.ts` —nombre confuso, no
es por sesion— es quien **envia**, recorriendo suscripciones cada 5 min, con
`tocaLaPrevia` y una tabla de marcas cuya clave lleva el id de la suscripcion.

**Las tres preguntas a responder en el GO** (sin teoria previa, que ya me equivoque una
vez):
1. Por que salio un **segundo** envio si el del jueves ya estaba marcado. ¿Fallo la
   marca, o se creo un grupo-dia distinto con su propia marca?
2. Por que ese grupo contenia **solo la FP2** y no [FP1, FP2] como el del jueves. Eso
   es lo que mas apunta al origen: dos sesiones del mismo dia cayendo en grupos
   distintos.
3. Si el aviso hubiera salido a su hora, ¿de que dia habria sido la vispera? Ahi se ve
   si el fallo es de agrupacion o de programacion.

**Donde mirar**: `previa.ts` (`diasDeCarrera`, `diaLocal`, `diaAnterior`, `tocaLaPrevia`),
`previas-de-sesion.ts`, `zona.ts`, la tabla de marcas y el cron que lo dispara.

## 5. TEXTO · Quitar «from ApexData» del aviso

El usuario lo ve innecesario: con el logo en la notificacion basta.

**Ojo, probablemente no es nuestro.** `public/sw.js:265` llama a
`showNotification(aviso.titulo, { body, icon, badge, ... })` y **no** manda ningun
subtitulo; en `src/lib/push/` no aparece la cadena. Todo apunta a que **iOS lo añade
solo** en los avisos web push de una PWA, como fuente del aviso. Si es asi no se puede
quitar desde el codigo y hay que decirselo al usuario claramente en vez de prometerlo.

**A verificar en el GO**: confirmar que ningun payload nuestro lleva subtitulo y que es
iOS quien lo pone.

# ---- Tanda del replay en el telefono (iOS y Android) ----
# Referencias: capturas del usuario, GP de Italia 2026, vuelta 53/53, 8:26-8:30.

## 6. LAYOUT · El circuito se come la pantalla: solo caben 3 pilotos

**Lo que dice el usuario**: le gusta como se ve, pero con el circuito siempre en pantalla
queda muy poco sitio para lo demas y **la navegacion se hace rara**. En las capturas
solo se ven **tres filas** (15/16/17, o 3/4/5): el resto queda tapado entre el mapa
arriba y los mandos abajo.

**Esto es MI fallo de diseño, no un detalle.** Ayer medi que la fila 18 fuera tocable y
di el layout por bueno; lo que no medi es **cuantas filas se ven a la vez**. Tres de
veinte es inservible para seguir una carrera.

**Pide ideas explicitamente**: «no se si se te ocurre algo para mejorar esto».
→ Va a **mockup con varias opciones y una recomendacion**, en los tres anchos.
Esta ligado a los puntos 7 y 13: es el mismo layout.

## 7. BUG · Hueco feo en el pie, entre los mandos y la barra de menu

Bajando del todo, entre el menu del replay y la barra de pestañas de la app **se ve lo
que hay detras**. En la captura de las 8:29 se aprecia peor de lo que suena: bajo el
mapa aparece **otra vez el logo «ApexData»** y asoma la palabra «Pilotos» por debajo de
los mandos. No es solo un hueco: se esta colando la pagina de detras.

## 8. BUG · El modo claro no se interpreta bien dentro del replay

Activando el tema claro **estando en el replay**, queda mal: «es como si el replay
quedara superpuesto». En la captura de las 8:26 se ve la cabecera y la barra de
pestañas en claro y el replay en oscuro, mezclados.

## 9. UX · Los botones de avance/retroceso no dicen cuanto mueven

Quiere un indicador al pulsar: algo tipo **«+10 seg» / «−10 seg»** en pantalla, segun lo
que salten. Texto del usuario: «ya tu conoces las mejores formas pero creo que me
entiendes lo que busco».

## 10. UX+BUG · La barra de progreso no dice en que minuto estas

Dos cosas en una:
- **Falta el indicador de tiempo**: ni donde estas ahora, ni a donde vas mientras
  arrastras el cursor.
- **El cursor se pinta DETRAS de la linea de tiempo en vez de encima.** Se ve en los
  recortes. Es concreto y va aparte del resto.

## 11. FEATURE · Un distintivo para el lider en el circuito

Con la carrera avanzada, entre doblados y rezagados **confunde**: parece que un doblado
pelea con el de delante cuando en realidad ya le sacan mas de una vuelta. Quiere poder
**ubicar al lider de un vistazo**.

## 12. FEATURE · Los abandonos y las banderas no se notan

En esta carrera **Leclerc abandona en la vuelta 3 y no se aprecia**: el punto se queda
parado y ya. Pide una animacion para el abandono, y algo mas llamativo tambien para las
banderas — **aclarando que lo de pintar el circuito le gusta mucho** y no hay que
quitarlo. Literal: «Considerar algo, sino no hay problema». O sea: deseable, no
obligatorio.

## 13. UI · El boton «Ver la carrera» esta descuadrado y mal ubicado

Se ve en la captura de la ficha: el boton azul «Ver la carrera» entre el resumen y la
lista de resultados. El usuario dice que **ademas de estar descuadrado, el sitio es
malo**. Pide expresamente: «me lo consultas con opciones o mockup».

---
# (marcador antiguo)
# ESTADO-VIEJO: lista cerrada por el usuario («esto seria todo por el momento»).
# FALTA EL GO. No tocar codigo hasta entonces.


# ---- Segunda tanda: barra inferior, PWA y cuentas ----

## 14. UI · Rediseñar la barra inferior al estilo Flashscore (flotante)

**Referencia**: capturas de Flashscore. Su menu inferior es **mas bajo que el nuestro**,
**flotante** (una pildora despegada de los bordes) y **translucido**, al estilo del iOS
actual. Efecto: da sensacion de mas espacio **sin tener que esconder las barras al
hacer scroll**.

**Lo que pide el usuario, con prioridades explicitas**:
- En **iPhone**: que sea **identico al de Flashscore**. Lo dijo asi de claro.
- En **Android**: si no se puede igual, **una version que funcione** — pero que funcione
  bien, no un apaño.
- Es un cambio **de toda la app**, no solo del replay.

**CORREGIDO tras preguntarme el usuario.** Lo apunte como «el usuario levanta la regla
[[todas-las-plataformas]]», y me pase. El usuario dijo «si para Android no se puede...»,
o sea concedio de antemano — pero **esa premisa es probablemente falsa**: una barra
flotante, translucida y mas baja se puede hacer igual en Android (`backdrop-filter`
funciona en Chrome de Android). Las diferencias reales son pequeñas: como reserva cada
sistema el espacio del indicador de gestos.

**Decision: NO se trata como excepcion.** Va a mockup en los tres entornos. Si al
medirlo aparece algo que de verdad solo se puede en iOS, se le enseña concretamente y
decide el. No se da por bueno un Android peor sin haberlo intentado.

## 15. LAYOUT · En el replay, que las secciones se aparten al hacer scroll

Su propia propuesta, y es buena: al **scrollear hacia arriba**, que se aparte la
seccion de «Vuelta 53/53 + boton de volver»; al **scrollear hacia abajo**, que se
aparte la seccion de los mandos del replay. Asi la torre gana toda la pantalla.

Quiere **opciones en mockup** igualmente, no que lo implemente directo. Va junto al
punto 6.

## 16. ARQUITECTURA · ¿Pie de pagina en la PWA?

Le hace ruido que la PWA (iOS y Android) lleve **pie de pagina**, sobre todo **la
navegacion** que ya esta en la barra inferior. Entiende que en la **web** si tenga
sentido. Propone mover los datos del proyecto a otro sitio. Pide **analisis y
recomendacion**.

**HALLAZGO QUE CONECTA CON EL PUNTO 7**: en la ultima captura se ve el pie completo
—«ApexData», «Navegacion: Pilotos, Equipos, Calendario, Standings», «Proyecto: GitHub,
Jolpica F1 API, OpenF1 API»— **asomando por detras de los mandos fijos del replay**. O
sea: **el hueco feo del punto 7 ES el pie de pagina**. La pantalla del replay no lo
suprime y los mandos fijos se le montan encima. Un solo arreglo cubre los dos puntos.

## 17. ARQUITECTURA · Favoritos entre dispositivos, y cuentas de usuario

**Pregunta del usuario**: si tiene favoritos en el iPhone, ¿como los ve en el navegador?
¿Como no perderlos? ¿Va por IP, por dispositivo? ¿Es viable y escalable meter cuentas
por Gmail o cuenta propia?

**Lo ya comprobado (hecho, no supuesto)**:
- Los favoritos viven **solo en `localStorage`**: `src/contexts/FavoritesContext.tsx`,
  claves `STORAGE_KEY_DRIVERS` / `STORAGE_KEY_CONSTRUCTORS` / `STORAGE_KEY_ACENTO`.
- En `prisma/schema.prisma` **no hay ningun modelo de usuario**. Los modelos son Driver,
  Team, Circuit, Season, Race, Result, Qualifying, SprintResult, standings,
  PushSubscription, NotifiedSession, SourceProbe, SentPreview.
- Conclusion: **no se sincroniza nada**. Ni por IP ni por cuenta. Es por navegador.
- **Dato importante para el usuario**: en iOS, la **PWA instalada y Safari tienen
  almacenamiento separado**. Asi que ni siquiera en el mismo iPhone comparten favoritos.
  Y `localStorage` se puede **borrar** si el sistema recupera espacio: hoy los favoritos
  **se pueden perder sin avisar**.

**A preparar para el GO**: opciones con recomendacion (desde un codigo de
sincronizacion sin cuentas, hasta cuentas de verdad), con coste y con lo que implica en
privacidad y despliegue.

---
# ESTADO: lista CERRADA por el usuario («esto creo que seria todo jeje»). 17 puntos.
# FALTA EL GO. No se toca codigo hasta entonces.

## 17-bis. ACLARACION DEL USUARIO
La pregunta del punto 17 es concretamente: **¿es viable un modulo de login?** — por
Gmail, por Apple, o login propio. No es solo «como sincronizo»: quiere saber si merece
la pena montarlo.

**Respuesta corta dada al usuario**: si, viable, y con Google como unico proveedor al
principio. Apple exige el Apple Developer Program (99 USD/año) y **no es obligatorio**
para una PWA (esa regla es de apps nativas en la App Store). Login propio =
contraseñas, recuperacion y correo transaccional: mas trabajo y mas riesgo para una app
de uso personal.
**Efecto colateral bueno**: con usuario, las suscripciones push (`PushSubscription`) se
pueden atar a la persona y no al navegador, y los avisos dejan de depender del
dispositivo.

## 18. EXPERIMENTO · La carrera de fuentes empata por construccion

**Estado real, consultado en produccion (`/api/fuentes`, 2026-09-11)**: el experimento
esta vivo y tiene sus dos primeras medidas (P1 y P2 de Madrid). OpenF1 31 min, FastF1
32 min en las dos — **pero `probes: 1` en las cuatro filas**.

**Lectura correcta**: el primer sondeo ya encontro datos en ambas. Solo sabemos «las dos
tenian datos antes del minuto 31»; **no sabemos cual llego primero**. El minuto de
diferencia es el orden de consulta dentro del mismo barrido, no señal.

**Lo que no cuadra**: `instrumentation.ts` tiene `CADA_MINUTOS = 5`, asi que el primer
sondeo deberia caer sobre el minuto 5, no sobre el 31. Tal como esta, **el experimento
empata siempre**. Hay que arreglar el arranque del sondeo antes de concluir nada.

**Lead**: mirarlo junto al punto 4 (la previa de mas). Los dos huelen a los tiempos del
barrido. No es una conclusion, es por donde empezar.

## 19. RECOMENDACION DADA · Navegador para la PWA en Android

Pregunta del usuario: ¿por que Chrome? ¿Y si usa Brave?

- **Aspecto**: identico. Brave es Chromium, mismo motor. Sin ventaja para ninguno.
- **Notificaciones**: ahi esta la diferencia. Brave desactiva por defecto los servicios
  de Google para mensajeria push, que es el canal del push web en Android.
  Historicamente habia que activarlo a mano. **NO verificado — hay que probarlo en su
  telefono.**
- **Recomendado**: instalar la PWA desde **Chrome** en Android, porque los avisos son
  parte central de la app. Puede seguir navegando con Brave.
- **Conecta con el 17**: en Android cada navegador guarda lo suyo, igual que PWA vs
  Safari en iOS. Con login deja de importar en todas partes.

## >>> PRIORIDAD 1 (dicho por el usuario): arreglar la carrera de fuentes <<<
El usuario: «no tiene sentido que lo hayas construido asi... este fix es prioridad 1 y
esta vez hazlo bien para ver quien responde primero».

**Los dos fallos, separados**:
1. **El primer sondeo llega tarde** (minuto 31, con `CADA_MINUTOS = 5` deberia ser ~5).
   Sin sondeos tempranos no hay nada que comparar.
2. **Aunque llegara pronto, la medida es gruesa**: 5 min de resolucion y se anota solo
   el primer «si». Si las dos contestan en el mismo sondeo, empatan por definicion.

**Que significa hacerlo bien**: sondear desde el minuto 0, denso al principio (donde
esta la diferencia) y espaciado despues; y guardar el instante real de cada respuesta,
no el numero de sondeo, para que la diferencia se pueda leer en segundos.

**FECHA LIMITE REAL**: GP de España (Madring) — carrera el **domingo 13 sep 2026 08:00**;
FP3 y Clasificacion el **sabado 12**. Si el arreglo no esta desplegado antes de la FP3,
se pierde el fin de semana entero de medidas y hay que esperar al siguiente GP.

## 20. UX · El mensaje de carga de los tiempos de sesion

`src/app/results/[year]/[round]/TiemposDeSesion.tsx:55-66`, componente `Cargando`:
«Pidiendo los tiempos de La práctica libre 1… / La primera consulta de una sesión
descarga su cronometría entera y puede tardar cerca de un minuto. Las siguientes son
inmediatas.»

**Opinion dada al usuario**:
- Avisar de que puede tardar un minuto **esta bien**: un minuto de rueda girando sin
  explicacion es peor.
- El **contenido** no: «descarga su cronometria entera» y «las siguientes son
  inmediatas» son nuestro problema y nuestra cache, no cosa suya.
- **Fallo de mayusculas**: «de **La** práctica libre 1» en mitad de la frase.
- **Lo de fondo**: llego ahi desde un aviso que decia que los resultados YA estaban. Si
  se lo hemos dicho, deberia estar. El aviso es el momento perfecto para **precalentar
  la cache** — los datos ya se piden para redactar el aviso.

**Recomendacion**: precalentar al enviar el aviso (camino comun, instantaneo) + dejar un
mensaje corto y humano para el camino frio.

## >>> FUSION: los puntos 3 y 20 son el mismo diseño <<<
Idea del usuario, mejor que la mia: **nunca una rueda girando ni una sesion vacia**. La
lista de pilotos siempre esta; lo que cambia es **su orden y su etiqueta**.

| Situacion | Que se ve | Etiqueta |
|---|---|---|
| Sesion sin correr | Pilotos alfabeticamente | «Aun no se ha corrido» |
| Se corrio la que manda (clasificacion -> carrera) | Orden de salida | «Orden de salida» |
| Cargando los resultados | Alfabetico, reordenandose al llegar | — |
| Ya estan | Resultado final | «Resultado» |

**RIESGO A EVITAR (unico pero serio)**: si el estado alfabetico lleva **numeros de
posicion y tiempos**, se lee como un resultado y parecera que gano Albon. En ese estado:
sin puestos y sin tiempos, solo piloto + equipo, mas el aviso. Tiene que **parecer**
provisional, no solo decirlo.

La animacion del reordenamiento -> a mockup, no se decide por escrito.

## 21. UX · La cabecera del detalle enseña la hora de la CARRERA en todas las pestañas

En la tarjeta del calendario, «PRÁCTICA 1 · vie, 11 sept, 06:30». Al entrar en el
detalle y estar en la pestaña «Práctica Libre 1», la cabecera dice
«13 de septiembre de 2026 · 08:00» — que es la carrera, no la sesion que estas viendo.

**Como lo lee un usuario**: que la P1 fue a las 08:00. El usuario lo dedujo solo, pero
dice que quien no lo sepa se confunde. **Pasa en todas las pestañas de sesion.**

Arreglo previsible: que la cabecera siga a la pestaña elegida, o que diga
explicitamente que esa fecha es la de la carrera.

**CONFIRMADO por el usuario (2026-09-11)**: en el estado alfabetico se quitan los
numeros de posicion y los tiempos. Decision suya, no interpretacion mia.

## 22. FEATURE · Radios de equipo en el replay (OpenF1 `/v1/team_radio`)

**Es cierto: existe y funciona.** Comprobado, no supuesto:

| Sesion | Radios | Pilotos |
|---|---|---|
| Carrera de Monza 2026 (11361) | 24 | 9 de 20 |
| Carrera de España junio (11307) | 40 | 10 |
| P1 Madrid, hoy (11362) | 11 | — |
| Clasificacion de mañana (11365) | **404** | aun no corrida |

**Campos**: `driver_number`, `date` (marca de tiempo absoluta) y `recording_url`,
un mp3 en `livetiming.formula1.com`. Medido: `audio/mpeg`, ~22 KB por clip,
`Cache-Control: max-age=3600`.

**Encaja muy bien con el replay**: el `date` es absoluto y nuestra linea de tiempo se
construye con instantes absolutos, asi que **cada radio cae en un punto exacto del
scrubber**. Marcas en la barra + tocar para oir + resaltar al piloto, que es justo el
gesto que ya existe.

**Dos obstaculos reales, los dos salvables**:
1. **CSP**: `src/lib/csp.ts` tiene `media-src 'self'`. Habria que añadir
   `livetiming.formula1.com`. Es una linea, pero **abre nuestra CSP a un tercero** y eso
   se dice, no se hace a escondidas.
2. **El mp3 no manda `Access-Control-Allow-Origin`**. Da igual para un `<audio>`
   normal —reproducir no necesita CORS—, pero **no se puede procesar ni descargar**.
   Solo reproducir. Es todo lo que hace falta.

**Avisos honestos**:
- **Es escaso**: 24 clips en dos horas y 9 pilotos de 20. Es la seleccion que emite la
  F1, no todas las radios. Sirve como adorno bien puesto, **no como columna vertebral**.
- Hay clips **antes del inicio** de la sesion (12:55 frente a 13:00 en Monza): vuelta de
  formacion. Hay que decidir que hacer con los que caen fuera de la linea de tiempo.
- El audio es de la F1. Misma fuente que el resto de lo que consumimos, pero
  **reproducir su audio es un paso mas que leer cronometria**, y el usuario piensa
  compartir la app con familia y amigos. Merece una frase, no un veto.

**Recomendacion**: si, merece la pena. Marcas en el scrubber + tocar para oir.

---
## VERIFICACION PENDIENTE (mañana, FP3 a las 11:30Z)
El lado web del fix esta confirmado en produccion. **El del servicio Python no se puede
comprobar desde fuera** (no tiene dominio publico y ninguna ruta nuestra expone
`sondeo`). La prueba llega sola con la FP3:
- `firstProbe` debe salir cerca de `0m 00s`. Si vuelve a salir ~31 min, el problema no
  era la cadencia y hay que mirar el arranque del barrido.
- `probes` debe ser mucho mayor que 1.
- Si FastF1 baja respecto a OpenF1, el sesgo de los cinco minutos era real y el
  despliegue del servicio entro.

## DECISION CERRADA (2026-09-11): el servicio sigue cargando UNA sesion a la vez

**Qué se exploró**: subir `_una_carga_a_la_vez` de 1 a 2, para que el sondeo de doce
segundos dejara de bloquear a quien pide telemetria y poder medir cada minuto.

**Lo que SÍ quedó medido** (con datos del usuario desde EasyPanel):
- El contenedor **no tiene límites**: los cuatro campos a 0, `memory.max: max`,
  `cpu.max: max`, 6 núcleos visibles. En reposo, 91 MB.
- **VPS: 16 GB en total, 9 GB disponibles.**
- **Coste de una carga de carrera**: pico de 379 MB (base 81 MB, 258 MB ya cargada,
  93 MB al soltarla). Dos a la vez serían ~680 MB. **Cabe de sobra.**
- **Dos descargas en frío a la vez**, dos Grandes Premios distintos, sin caché:
  34 s, las dos completas, ningún bloqueo de SQLite.

**Por qué NO se cambió, pese a que los números dan**: la prueba
`test_las_cargas_no_se_solapan` fija la serialización como invariante, y su motivo es
otro distinto del que dice el comentario del código. El comentario habla de seguir
respondiendo; **la prueba dice «FastF1 no promete ser seguro entre hilos»**. Eso no lo
refuta una ejecución con éxito: las carreras de datos son intermitentes por definición.

Es una decisión cerrada con motivo escrito, y una sola prueba favorable no la reabre —
menos aún la víspera de un fin de semana de carreras del que dependen las medidas.

**Condición para reabrirla**: una prueba de esfuerzo de concurrencia de verdad (muchas
cargas simultáneas, repetidas, con sesiones distintas y comprobando los datos, no solo
que no lance), o que la documentación de FastF1 diga explícitamente que es seguro entre
hilos. Con eso, subir a dos está justificado y el resto de números ya están tomados.

**Lo que sí se gana igualmente**: ahora se sabe que **el cuello de botella no es el
servidor**. Si algún día estorba, el problema a resolver es la seguridad entre hilos de
FastF1, no la RAM. Eso ahorra la investigación entera.

**Discrepancia a corregir algún día**: el comentario de `loading.py` da una razón
(seguir vivo) y la prueba da otra (hilos). Las dos importan, pero el código debería
decir las dos.
