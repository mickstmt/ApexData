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

# REGISTRO DE AVANCE

> **GO dado por el usuario el 2026-09-11.** Orden confirmado por el: bugs primero.
> Cada linea de aqui abajo esta medida en el navegador y cubierta con prueba; el
> detalle largo vive en el mensaje de cada commit.

| Punto | Estado | Commit | Lo que quedo medido |
|---|---|---|---|
| **18** carrera de fuentes | HECHO, **sin verificar** | `1d2413b` + `432c669` | El segundo lo hizo otra sesion: el arreglo de la mañana seguia midiendo con sesgo. La prueba llega sola con la **FP3 del sabado 12, 10:30Z (05:30 en Lima)**: `firstProbe` cerca de `0m 00s` y `probes` mucho mayor que 1. |
| **7 + 16** (parte de bug) | HECHO | `4428cee` | El pie medía 553 px DENTRO del replay en iPhone 390, entre el mapa pegado y los mandos. Y la barra no publicaba su alto: cinco sitios lo adivinaban (`4rem`, `4.5rem`, `4.75rem`, `5rem`) y el real es 60 px + borde seguro. Rendija de 4 px -> 0. Scroll 2163 -> 1546 px. |
| **8** modo claro en el replay | HECHO | `9751d2d` | Decision del usuario contra mi recomendacion, y con razon: «si me das la opcion, damela bien». En claro el replay es `rgb(247,247,248)`, el mismo fondo que el cuerpo y las dos barras. En oscuro cada valor computado coincide uno a uno con el hex que estaba a fuego. |
| **10b** cursor del scrubber | HECHO | `e4d7771` | No era del tema claro: el riel es `absolute` y el `input` era estatico, asi que el riel pintaba ENCIMA y partia el cursor. Pasaba igual en oscuro desde siempre. |
| **21** cabecera del detalle | HECHO | `9a21a01` | Australia 2026 en Europe/Madrid: carrera 8 mar 05:00, clasi 7 mar 06:00, P1 6 mar 02:30, P2 6 mar 06:00, P3 7 mar 02:30. Antes las cinco decian lo mismo. |
| **16** pie en la PWA | HECHO | `1baf369` | Decision del usuario: el pie es de la web. Pero hacia dos trabajos: la atribucion a Jolpica y OpenF1 es **condicion de licencia** (las dos CC BY-NC-SA 4.0, verificado en sus terminos) y ese pie era el unico sitio de la app donde se las nombraba. Se muda a `/acerca`, en el menu «Mas». |

| **14** barra inferior flotante | HECHO | `2758640` | Afinada por el usuario sobre mockup contra SUS referencias (WhatsApp, Flashscore, Apple Music): alto 68, 10 a los lados, 16 abajo, pildora completa, icono 26, letra 11,5, `blur(2px) saturate(1.8)`. Lo que costo encontrar: **el desenfoque es lo que tapa, no la opacidad** — a la misma opacidad, con 0 se lee una fila entera por debajo y con 6 desaparece. Iconos nuevos: casco, podio y bandera a cuadros. |
| **6 + 15** el mapa se encoge | HECHO | `1cc677b` | De 300 a 108 px al desplazar; el hueco de la torre de 223 a 415; las filas enteras a la vista de **5 a 8**. La torre pasa a desplazarse en su propia caja y el mapa se encoge con `transform`, no cambiando el lienzo (4 MB de mapa de bits a 3x, reservarlo 60 veces por segundo es lo que produce tirones). Mandos flotando como el mini-reproductor de Apple Music. |
| **13** el boton «Ver la carrera» | HECHO | `6b100d7` | Era una pastilla de 147 px pegada a la izquierda entre dos piezas de 358. Ahora es el pie de la tarjeta del resumen, a su ancho (332 de 358) y con la junta a cero. |
| **1** los huecos en bandera roja | HECHO | `4b66c8e` | El desplazamiento de +1416 s ERA la parada, metida entera en el hueco de todos. El parche anterior no bastaba: al reanudar el estado ya es verde y la inflacion dura lo que mide el propio hueco. Se mide sobre `relojDeCarrera`, que solo corre cuando la carrera corre. El coche de seguridad y la amarilla SI cuentan. |
| **4** la previa repetida | HECHO | `d40f51f` | No fallo la marca: el grupo cambio de identidad. La marca lleva la clave de la PRIMERA sesion del grupo, y al filtrar solo lo que aun no ha empezado, el grupo del viernes paso de [FP1, FP2] a [FP2]. Arreglado mirando 30 h hacia atras al agrupar. |
| **9** los saltos dicen cuanto mueven | HECHO | (este commit) | Dos piezas, no una: el «10 s» fijo contesta antes de pulsar y el destello despues. El destello dice el salto REAL — a 2 s del final dice «+2 s», no «+10 s». Y `saltoReal` no redondea: con `Math.round`, medio segundo daba `-0` —igual a 0— y el boton de atras se apagaba a dos instantes del inicio, dejando esos 0,5 s fuera de su alcance. Zona muerta de medio paso, y solo hacia atras. |
| **10a** en que minuto estas | HECHO | (este commit) | Reloj y duracion pegados al scrubber, y burbuja con vuelta y minuto al arrastrar (tambien con las flechas). La vuelta NO va en la fila fija: la cabecera ya la lleva como titular y era decirla dos veces — mi mockup lo ocultaba porque ponia el nombre del GP en la cabecera, y ese fue un fallo de fidelidad mio. El reloj pasa a `1:18:42` cuando hay horas, con el hueco reservado en `ch` para que no salte al cruzarla. En escritorio los cuatro mandos van centrados y se quita el reloj del final de la fila: a 40 px del nuevo era decir la hora dos veces. Medido en los tres anchos y los dos temas: el «10 s» de 8,5 px da 6,47 en oscuro y 5,82 en claro, sobre un liston de 4,5. |
| **14-bis** la barra, corregida | HECHO | (este commit) | Cinco cosas que reporto el usuario sobre la barra ya rediseñada. **La que se movia al desplazar era `env(safe-area-inset-bottom)`**: iOS lo reevalua durante el gesto, asi que un `bottom` que dependiera de el se iba con la pagina y se quedaba donde lo dejaras. Se descubrio sin querer, al quitarlo de la maqueta para poder bajar la barra: dejo de moverse. El desenfoque quedo descartado antes — la barra y un contorno SIN desenfoque se movieron juntos. **Medidas elegidas por el usuario sobre maqueta instalada en su telefono**: 20 px desde el borde de verdad y 26 a los lados, contra WhatsApp y Flashscore, que dejan que el indicador del sistema les caiga encima. Los mandos del replay copian los 26, y hay una prueba que lo fija. **Etiquetas cortas**: «Clasificacion» ocupaba 71 px de texto en una casilla de 60 y se salia del realce; «Puntos» se queda en el 62 %. El nombre completo sigue anunciandose y contiene la palabra visible, que es lo que necesita quien maneja por voz. **El toque que no respondia**: `pathname` es la ruta YA cambiada, asi que tocar Pilotos y enseguida Inicio comparaba el segundo toque con la ruta vieja, se quedaba en un desplazamiento y no navegaba. **El realce que no recorria**: estaba atado al cambio de ruta, que en el telefono llega tarde; ahora arranca con el toque. Duracion 420 -> 720 ms, elegido por el usuario. |
| **2** el final de carrera | HECHO | (este commit) | El hallazgo del usuario era exacto y se midio: el orden del replay en el ULTIMO instante falla contra el oficial en **8 de 10** (Hungria), **5** (Paises Bajos) y **4** (Italia); en Italia el oficial daba ANT-RUS-VER-NOR y el replay, VER-NOR-ANT-RUS. La causa es que **la bandera cae 66-79 s ANTES del final de los datos** y ese minuto es la vuelta de celebracion. Ordenando por cruces de meta los fallos caen a **0, 0 y 2**; las dos de Hungria son HAM y LEC —HAM cruzo 4,3 s antes y es quinto, o sea **sancion posterior**—, asi que manda el **oficial** cuando la base lo tiene y los **cruces** cuando no. El tiempo tambien se congela, y se toma del oficial: con el hueco en vivo, la torre decia que el quinto llego antes que el cuarto. Tres cosas que solo aparecieron midiendo con datos reales: `parseFloat` de `+1:05.187` devuelve **1** y ponia al undecimo con `+1.0s` por delante del decimo; el decimoquinto cruza en **6754,37** y los datos acaban en **6754,25**, asi que su banderita no salia nunca; y los huecos se miden contra quien sigue rodando, no contra el ganador aparcado, que daba huecos **negativos**. A un doblado se le dicen vueltas. **Sin animacion de bandera y sin tarjeta de podio: decision del usuario.** La banderita va DETRAS del tiempo, tambien elegido por el. Verificado contra Italia y Hungria reales en el navegador: la torre coincide **fila a fila** con la clasificacion oficial. |

**Suites al cerrar el bloque de datos**: 408 unitarias, 121 e2e (26 nuevas en
total), tipos y lint limpios. Build igual que el CI.

**Suites tras la barra (14-bis)**: 417 unitarias, 134 e2e, tipos y lint limpios,
build igual que el CI. La revision de codigo saco cuatro cosas: dos reales —el
realce se medía sobre el enlace mientras `active:scale-[.92]` lo encogia, asi
que viajaba al 92 % de su ancho (184 px en vez de 200), y un respaldo de 84 px
que habia dejado de seguir a `--barra-inferior`— y dos que **no se sostuvieron**:
un desborde de los mandos del replay a 360 px que no se reproduce (medido: la
fila ocupa 274 de 274 y el ultimo boton acaba en 317 dentro de un cristal que
llega a 334) y un comentario que si estaba desactualizado. La prueba que se
escribio para el desborde resulto **vacua** —pasaba igual con los valores viejos,
comprobado revirtiendolos— y se reescribio comparando `scrollWidth` con
`clientWidth`, que es lo que si caza un desborde.

**Suites tras los mandos del replay (9 y 10a)**: 417 unitarias, 129 e2e, tipos y
lint limpios, build igual que el CI. La revision de codigo saco seis cosas y las
seis se arreglaron antes de commitear: el `-0` de arriba; que soltar el dedo
dejaba el scrubber enfocado pero sin burbuja, rompiendo el camino del teclado;
que `disabled` en los topes se llevaba el foco al cuerpo (ahora `aria-disabled`);
una prueba del destello que no podia recuperarse de una tanda lenta, porque el
elemento desaparece a los 900 ms y no vuelve; que las banderas del riel se
repartian sobre `count x paso` mientras el pulgar iba sobre `(count-1) x paso`;
y dos comentarios que justificaban decisiones con una etiqueta que ya no existe.

### Correccion a lo prometido en el mockup del 6

Ahi dije **11 filas** y la cifra real es **8**. La diferencia: aquel mockup, al
encender «cabecera compacta», tambien encogia los mandos de 119 a 76 px, y eso
no se puede hacer — dejaria los botones por debajo de los 44 px de zona tocable
minima, que es un limite del proyecto y no una preferencia. La cabecera si bajo
de 89 a 44 como se prometio. De 4 a 8 sigue siendo el doble.

## Hallazgos que NO estaban en la lista — los tres CERRADOS

Salieron trabajando. Los dos primeros se llevaron a mockup porque cambiaban el
aspecto del tema oscuro, y los decidio el usuario.

- **A. La pildora de bandera roja. HECHO** (`7d96eb2`). Texto blanco sobre
  `#FF4238` daba **3,45:1** y un texto pequeño pide 4,5. El usuario eligio
  oscurecer el rojo a `#D93830` (**4,61:1**); yo recomendaba conservar el rojo y
  pasar la tinta a negro.
- **B. El trazado en oscuro. HECHO** (`7d96eb2`). `#50505E` daba **2,48:1** y un
  grafico con significado pide 3. Ahora `#6B6B78`, **3,74:1**. El minimo que
  cumplia era `#5E5E6B` (3,08) y se descarto por no dejar margen.
- **C. `.claude/worktrees/` estaba sin ignorar. HECHO** (`9751d2d`). Un
  `git add -A` casi mete un worktree entero en un commit como repositorio
  embebido. No se ha borrado nada del disco.

### Y uno mas que salio al aplicar los anteriores, y era mio

**El «OUT» de la torre era ilegible en el tema claro.** `--replay-roja` no lo usa
solo la pildora: tambien la pista con bandera roja, el tramo del scrubber y el
«OUT». Los tres primeros son bloques o graficos y les basta 3:1; el «OUT» es
TINTA y necesita 4,5. Al estrenar el tema claro esta mañana le di el mismo
`#FF4238`, que sobre fondo claro da **3,22:1**. No hay un solo rojo que sirva de
fondo de pildora y de tinta sobre los dos fondos, asi que el token se partio en
dos: `--replay-roja` (bloque) y `--replay-roja-texto` (tinta, `#FF4238` en
oscuro y `#CC352D` en claro). Cerrado en `7d96eb2`.

**Prueba nueva**: `tests/contraste-replay.test.ts` lee los tokens de
`globals.css` y comprueba cada uno contra el umbral que le toca por lo que es,
en los dos temas. No fija una lista de hex, asi que no se queda desactualizada.

## Lo que queda, en el orden acordado

> **Orden confirmado por el usuario el 2026-09-11: por superficie, no por
> numero.** Cada mockup ensena una pieza coherente en vez de trocear la misma
> pantalla cuatro veces. Paso 1 (9 + 10a) HECHO.

> **2026-09-12, al probar lo desplegado**, entraron cuatro puntos nuevos: **23**
> (el realce no enciende las pestanas por las que pasa), **24** (decision del
> usuario: mandos minimos en vertical y replay a pantalla completa en
> horizontal), **25** (el delta sigue subiendo con todos parados — el arreglo
> del punto 1 no lo cubrio) y **26** (al encoger el circuito se pierden los
> primeros clasificados). El **25 y el 26 son fallos de cosas que dabamos por
> cerradas**, asi que van por delante de lo demas.
>
> **Pendiente de limpiar**: `public/maqueta/` —la maqueta de la barra y su
> manifest— se retira al cerrar el punto 14. Sigue servida en produccion.

4. **Replay**: ~~9 + 10a (mandos y linea de tiempo)~~ -> el circuito (11 + 12),
   el final de carrera (2), las radios (22, avisar por la CSP)
5. **Sesiones**: 3+20
6. **Cuentas**: 17, y 5

### Abierto, sin decidir

- **La barra flotante, sobre un titular.** Con el desenfoque tan bajo, un
  titular grande justo detras compite un poco con las etiquetas. Se probo una
  sombra en las etiquetas y **no sirve** —«sin sombra» y «con halo» salen
  indistinguibles, porque el velo de la propia barra se la traga—. Sobre
  contenido normal la barra se lee limpia. Si algun dia molesta, la palanca que
  si funciona es subir la opacidad de 34 % a ~45 %, no la sombra.
- **Los iconos propios.** Casco, podio y bandera a cuadros estan dibujados en
  `components/iconos/motor.tsx` porque `lucide` no los tiene. Si se quiere un
  juego completo y coherente para el resto de la app, es una pieza aparte.

---

# Mejoras del replay — acumulando hasta el GO del usuario (2026-09-11)

## 1. BUG · Los huecos se suman durante la bandera roja (y sobreviven al reinicio)

> **HECHO** (`4b66c8e`). El diagnostico de partida de este documento era
> correcto, incluido que el parche anterior no bastaba. Queda sin poder
> comprobar el sub-fallo de «la pildora dice PISTA LIBRE con los coches en fila
> en el pit lane»: eso es cosa de `track_status` y necesita la sesion real.

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

**RESUELTO.** Decidido con datos y con mockup (`mockups/05-final-de-carrera.html`):

- **Manda el resultado oficial** cuando la base lo tiene, porque es el unico que sabe de
  sanciones, y los **cruces de meta** cuando no. Medido: por metros el orden falla en 4 a
  8 de 10; por cruces, en 0 a 2.
- **Sin animacion de bandera y sin tarjeta de ganador ni de podio**: el usuario descarto
  las dos. «Es una repeticion, no tiene sentido darle tanta importancia.»
- Queda una **banderita detras del tiempo** de quien ya cruzo, elegida por el usuario
  contra mi recomendacion (yo proponia delante, por la columna de numeros).

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

> **HECHO** (`d40f51f`). Las tres preguntas contestadas en el mensaje del
> commit. La sospecha del documento —«dos sesiones del mismo dia cayendo en
> grupos distintos»— estaba cerca pero no era eso: es el MISMO grupo perdiendo
> a su primera sesion, y con ella su identidad.

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

> **HECHO** (`1cc677b`). Opcion B del mockup: el mapa se encoge al desplazar y
> nunca desaparece. De 4 filas a 8, no a las 11 que prometi — ver la correccion
> en el REGISTRO DE AVANCE.

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

> **HECHO** (`4428cee`). Eran dos fallos: el pie pintandose dentro del replay
> (553 px en iPhone 390) y una rendija de 4 px porque `4rem` no es el alto de la
> barra. Ver el REGISTRO DE AVANCE.

Bajando del todo, entre el menu del replay y la barra de pestañas de la app **se ve lo
que hay detras**. En la captura de las 8:29 se aprecia peor de lo que suena: bajo el
mapa aparece **otra vez el logo «ApexData»** y asoma la palabra «Pilotos» por debajo de
los mandos. No es solo un hueco: se esta colando la pagina de detras.

## 8. BUG · El modo claro no se interpreta bien dentro del replay

> **HECHO** (`9751d2d`). El usuario eligio la opcion B del mockup —replay claro
> de verdad— contra mi recomendacion de «modo cine», y el argumento era mejor
> que el mio. Ver el REGISTRO DE AVANCE.

Activando el tema claro **estando en el replay**, queda mal: «es como si el replay
quedara superpuesto». En la captura de las 8:26 se ve la cabecera y la barra de
pestañas en claro y el replay en oscuro, mezclados.

## 9. UX · Los botones de avance/retroceso no dicen cuanto mueven

Quiere un indicador al pulsar: algo tipo **«+10 seg» / «−10 seg»** en pantalla, segun lo
que salten. Texto del usuario: «ya tu conoces las mejores formas pero creo que me
entiendes lo que busco».

## 10. UX+BUG · La barra de progreso no dice en que minuto estas

> **10b HECHO** (`e4d7771`): el cursor se pintaba detras del riel. **10a SIGUE
> ABIERTO**: falta el indicador de tiempo, que es una funcion nueva y va a mockup.

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

> **HECHO** (`6b100d7`). Al pie de la tarjeta del resumen, a su ancho.

Se ve en la captura de la ficha: el boton azul «Ver la carrera» entre el resumen y la
lista de resultados. El usuario dice que **ademas de estar descuadrado, el sitio es
malo**. Pide expresamente: «me lo consultas con opciones o mockup».

---
# (marcador antiguo, ya superado: el GO se dio el 2026-09-11)


# ---- Segunda tanda: barra inferior, PWA y cuentas ----

## 14. UI · Rediseñar la barra inferior al estilo Flashscore (flotante)

> **HECHO** (`2758640`). Y se mantuvo lo decidido: NO se trato como excepcion,
> Android hace lo mismo. Los iconos los corrigio el usuario en revision — una
> carita feliz para «Pilotos» no se defiende.

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

> **HECHO** (`1cc677b`), aunque NO como lo propuso el usuario: apartarlas del
> todo era la opcion A y daba mas filas, pero quitaba de la vista el circuito,
> que es lo que mas le gusta. Eligio encogerlo.

Su propia propuesta, y es buena: al **scrollear hacia arriba**, que se aparte la
seccion de «Vuelta 53/53 + boton de volver»; al **scrollear hacia abajo**, que se
aparte la seccion de los mandos del replay. Asi la torre gana toda la pantalla.

Quiere **opciones en mockup** igualmente, no que lo implemente directo. Va junto al
punto 6.

## 16. ARQUITECTURA · ¿Pie de pagina en la PWA?

> **HECHO** (`4428cee` la parte de bug, `1baf369` la decision). Ver el REGISTRO
> DE AVANCE: la atribucion a las fuentes resulto ser condicion de licencia.

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
# ESTADO: lista CERRADA por el usuario («esto creo que seria todo jeje»).
# GO dado el 2026-09-11. El avance se lleva en el REGISTRO DE AVANCE de arriba.

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

> **HECHO** (`9a21a01`). Ver el REGISTRO DE AVANCE.

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
---
# ---- Tanda del 2026-09-12, probando la barra y el replay ya desplegados ----

## 23. UX · El realce pasa por encima de las pestanas sin encenderlas

**Lo que dice el usuario**: con Inicio marcado, el icono y la palabra van pintados.
Al tocar Pilotos, el realce se desliza de una a otra **pasando por Fechas y Puntos**, y
esas dos no se encienden al pasar. «Se que puede parecer algo estupido pero para mi es
el correcto flujo.» No lo es: el realce tarda 720 ms y durante ese viaje la unica
pestana coloreada es la de destino, asi que el recorrido se lee como un salto de color
aunque la forma si viaje.

**Lo que hay hoy**: el color lo pone `aria-current="page"`, que es **binario y salta de
golpe** al llegar la ruta. No sabe nada de por donde va el realce.

**Por donde iria** (sin decidir, y va a mockup porque es animacion):
- El realce es un `<li>` con `transform`, asi que **su posicion no se puede consultar
  desde CSS** para teñir lo que tiene debajo. No hay un selector «lo que esta bajo este
  elemento».
- La via realista es un **degradado que viaje con el realce** pintando el texto por
  `background-clip: text`, o una **segunda fila de pestañas ya coloreadas** recortada
  por el realce con `clip-path` y moviendose con el. La segunda es la que usan las apps
  que hacen esto bien, y no necesita JavaScript por fotograma.
- Coste real: duplicar el marcado de las cinco pestanas. Hay que medir que no rompa la
  accesibilidad —la copia va `aria-hidden`— ni el area tocable.

## 24. DECISION DEL USUARIO · Mandos minimos en vertical, y replay a pantalla completa

**Decidido por el usuario**, no propuesto por mi: el cuadro que contiene los mandos del
replay **ocupa demasiada pantalla** en vertical. Se reduce «al maximo posible», muy
minimalista, al estilo del mini-reproductor de Apple Music que el trajo como referencia.

Y el panel grande —que ya esta bien disenado— **no se tira: se muda** a una funcion
nueva: **expandir el replay a pantalla completa**, girando el telefono para verlo en
horizontal.

**Lo que el usuario nombro para el modo reducido**: retroceder, reproducir, avanzar y
velocidad.

**Preguntas abiertas, que son suyas y hay que hacerlas antes de tocar nada**:
1. **¿El scrubber se queda en vertical?** No lo nombro. Es la unica forma de saltar a un
   momento concreto, y sin el solo se puede avanzar de diez en diez segundos. Puede que
   lo diera por supuesto.
2. **¿Y el reloj y la vuelta** que se acaban de anadir en el punto 10a?
3. **¿Como se entra a pantalla completa?** ¿Un boton, o basta con girar el telefono?
4. **¿Y si el telefono tiene el giro bloqueado?** Mucha gente lo lleva asi; haria falta
   un boton de todas formas.

**Nota tecnica de partida**: el horizontal cambia el reparto entero —el mapa se puede
llevar la mitad izquierda y la torre la derecha, que es casi el diseno de escritorio que
ya existe—. Y `screen.orientation.lock()` **no funciona en Safari de iOS**, asi que no
se puede forzar el giro: hay que responder a el, no pedirlo.

## 25. BUG REABIERTO · El delta sigue subiendo con todos parados

**Sigue pasando despues del arreglo del punto 1** (`4b66c8e`). El usuario: «el tiempo en
el delta sigue subiendo aunque el lider y todos los demas esten en boxes por bandera
amarilla o roja».

**Lo que hace el codigo hoy** (`huecoEn`, `src/lib/replay/progreso.ts:198`): el hueco es
`entre(bajo + 1, k) * paso`, y `entre` cuenta sobre `relojDeCarrera`, que **solo avanza
cuando la carrera corre**. Eso deberia congelar el delta con bandera roja.

**Dos hipotesis, y hay que medir cual es** antes de tocar:
1. **Es la amarilla, y es por diseno.** La entrada del punto 1 dice explicitamente que
   «el coche de seguridad y la amarilla SI cuentan». Si lo que el usuario ve es con
   amarilla o coche de seguridad, el codigo hace lo que se decidio — y entonces la
   decision es la que hay que revisar, no el codigo. Bajo coche de seguridad los coches
   se agrupan, asi que un hueco que CRECE contradice lo que se ve en el mapa.
2. **Es la roja y `relojDeCarrera` no la esta viendo.** Entonces el arreglo no llego a
   cubrir este caso y hay que mirar como se construye ese reloj.

**Lo primero que hay que preguntarle al usuario**: en que sesion y en que minuto lo vio,
y si la pildora de estado decia ROJA o AMARILLA. Sin eso se arregla a ciegas.

## 26. BUG · Al encoger el circuito se pierden los primeros clasificados

**Lo que dice el usuario**: en vertical ve el circuito y debajo solo los tres primeros.
Si desplaza para que el circuito se achique y quepan mas pilotos, al llegar al maximo
encogido **ha perdido a los cinco primeros**, que se han ido detras del mapa. Para
volver a verlos tiene que agrandar el circuito otra vez.

**Por que pasa**: lo que encoge el mapa es **el propio desplazamiento de la torre**
(`ReplayClient.tsx`, el observador sobre `torreRef`). La torre es una caja con su propio
scroll, asi que desplazarla para encoger el mapa **sube sus primeras filas fuera de la
vista**. Las dos cosas van atadas al mismo gesto y se estorban: no hay forma de tener el
mapa pequeno Y P1 a la vista.

Es un efecto secundario del punto 6+15, que midio bien lo que buscaba —de 4 a 8 filas
enteras— pero no vio que esas 8 empiezan en la sexta.

**Salidas posibles** (a mockup, porque cambia el gesto):
- **Separar los dos gestos**: el mapa se encoge con un tirador o un boton, y la torre se
  desplaza aparte. Es lo mas predecible y lo que hace cualquier app con un mapa arriba.
- **Devolver la torre a cero** cuando el mapa termina de encogerse. Resuelve el sintoma
  pero se siente como un tiron y pelea con el dedo.
- **Fijar las primeras filas** con `position: sticky` mientras se desplaza. Se ve bien
  pero hay que decidir cuantas, y comerian el sitio que se acaba de ganar.

**Medir antes de elegir**: cuantas filas enteras se ven en cada combinacion, en los tres
anchos. La cifra que hay que batir es 8, que es lo que dio el 6+15.

---
## VERIFICACION PENDIENTE — FP3 del sabado 12, **10:30Z (05:30 en Lima)**

> **Corregido el 2026-09-11.** Aqui ponia «FP3 a las 11:30Z» y estaba mal: las
> 11:30Z son la **FP1**, que fue el viernes 11. Consultado en la base, GP de
> España ronda 14: FP1 `2026-09-11T11:30Z`, FP2 `15:00Z`, **FP3
> `2026-09-12T10:30Z`**, clasificacion `14:00Z`. La ventana es una hora MAS
> CORTA de lo que decia este documento, no mas larga.
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
