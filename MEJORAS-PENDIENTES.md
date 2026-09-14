# ApexData - 19 trabajos pendientes (lista cerrada por el usuario el 2026-09-11)

> ## ⚠️ ESTE DOCUMENTO NO ES LA FUENTE DE LA VERDAD
>
> **El registro que manda es `PROGRESO_RELANZAMIENTO_2026.md`** (la bitacora) y,
> por encima de el, el **codigo**. Este archivo son las notas de lo que el
> usuario reporto, y sus secciones **se quedan desactualizadas**: el trabajo se
> cierra en la bitacora y en un commit, y volver aqui a tachar cada seccion se
> olvida.
>
> **El 2026-09-14 eso costo caro**: se leyeron estas secciones como si fueran el
> estado actual y se le presentaron al usuario **seis puntos como pendientes
> cuando cinco estaban hechos** —11, 12, 25, 26 y 3+20—, ademas de dos ya
> cerrados (5 y 19) y de una verificacion que se anuncio como futura cuando la
> sesion que la cerraba habia corrido dos dias antes. Su respuesta: «me parece
> que no tienes la info al dia... no me des informacion falsa».
>
> **Antes de decir que algo esta pendiente: buscarlo en el codigo.** No basta
> con no encontrarlo aqui tachado.

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
| **18** carrera de fuentes | **VERIFICADO** (2026-09-14) | `1d2413b` + `432c669` | El segundo lo hizo otra sesion: el arreglo de la mañana seguia midiendo con sesgo. **Comprobado con el fin de semana de España ya corrido**, leyendo `/api/fuentes` en produccion. El arreglo entro el 11 a las 21:39Z, asi que las dos practicas del viernes (12:30Z y 16:00Z) son anteriores y salen con `probes: 1` y `firstProbe: null` — el sesgo de antes, y se nota: 1906 vs 1883 s y 1908 vs 1879 s, un empate que no significa nada. Desde la **FP3 del sabado** (11:30Z) manda el codigo nuevo: `probes` 22/13/4 en fastf1 y 50/31/47 en openf1, con `firstProbe` entre 45 y 61 s — no `0m 00s` como decia la nota, porque el primer sondeo cae en el primer tic del reloj y el reloj va cada minuto. **Veredicto, y con las tres sesiones limpias es mas claro que la media que publica el endpoint**: fastf1 1558 s de media (597 carrera, 1500 clasi, 2577 FP3) contra 2553 de openf1 (2804, 1859, 2996). Fastf1 publica antes, por unos 16 minutos. |
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
| **45 + 47** la web deja de ser la PWA estirada | HECHO | (este commit) | Mis tres maquetas anteriores movian la CABECERA de sitio sobre la misma pagina de siempre, y el usuario las corto: «tus sugerencias de diseño son de las peores que he visto». Tenia razon y el fallo era identificable: lo que hacen sus referencias (FotMob, Flashscore) no es decorar, es repartir. La cuarta maqueta copio su arquitectura y esa si la aprobo: «por fin entendiste la consigna». Lo que quedo: **el contenido se para en 1280** —de 1536, y no es estetica: 1280 es lo que decide si al lado de la tabla caben el rail (232) y una columna de contexto (320) sin bajar de los ~670 px en que una tabla deja de leerse— y **las nueve secciones bajan a un rail** a partir de `lg`, donde se ven todas a la vez y no hay nada que abrir. Desaparece la hoja modal de telefono en el monitor. Debajo de `lg` no cambia nada: manda la barra flotante, y entre `md` y `lg` el boton de la cabecera, que ahi sigue siendo la unica navegacion. El replay no lleva rail —de esa pantalla no se navega, se mira— y esa lista se comparte con la del pie en `lib/pantallas-completas`, porque ya estaba escrita en un sitio donde el rail no la veia. La cabecera se queda con la marca, «Acerca de» y el engranaje. Cae la marca `primary` de `navItems`: existia para repartir una fila que ya no existe. |
| **17** la cuenta, la parte visible | HECHO | (este commit) | Tambien salio de la correccion del usuario: «no me gusta el login dentro del mas, en cualquier app es tan simple como un boton con icono de persona al lado del toggle de modo oscuro» — y despues, viendo FotMob y Flashscore, que ni siquiera eso: **la cuenta es la primera fila de un panel de ajustes, y el tema es OTRA fila del mismo panel**. El interruptor de tema deja de ser un boton suelto en la cabecera. El panel es un menu anclado al engranaje y no una hoja modal, porque nace arriba a la derecha y vuelve ahi; eso obliga a escribir a mano lo que `<dialog>` regala, y esta escrito: `Escape`, cerrar al tocar fuera, cerrar al salir tabulando y el foco devuelto al boton. Quien ha entrado se resuelve en el servidor (`getServerSession`, que con sesion en cookie no consulta la base), asi que la cabecera se pinta ya sabiendo de quien es la cuenta en vez de decir «Entrar» y cambiarlo un instante despues. Sin credenciales de Google el panel sigue funcionando y la fila de la cuenta no sale. |
| **48** el grafico de Clasificacion | HECHO | (este commit) | Abria con 280 px de grafico antes de ver a nadie, en la pantalla a la que se entra para saber quien va primero. Ahora: pilotos arriba a todo el ancho de la columna, constructores en una columna de contexto de 320 a su derecha —diez filas de nombre y puntos, que es justo lo que cabe ahi— y el grafico DEBAJO de los pilotos. No va en la columna de la derecha aunque lo pidiera la simetria: su dibujo mide 720 px de ancho y rotularlo a 320 deja las cifras de los ejes ilegibles; debajo de los pilotos le quedan ~670, practicamente su tamaño natural. Antes las dos tablas se repartian el ancho a la mitad y la de pilotos —que lleva foto, bandera, equipo y puntos— tenia lo mismo que una lista de diez nombres. |
| **46** las tablas, una sola fila | HECHO | (este commit) | Cuatro maquetaciones distintas para lo mismo: una `<table>` de siete columnas en la carrera, tarjetas altas con medalla de emoji en el campeonato, y fichas en dos columnas sin cabeceras en practicas y clasificacion de sesion. Y una fila compartida, `TimingRow`, que **ninguna de las cuatro usaba**. Ahora las cuatro usan `TablaDeTiempos`. **La respuesta a la pregunta del usuario —por que en una hay foto y en otra no— no era estetica**: carrera y campeonato vienen de Jolpica, que manda la ficha completa del piloto; practicas y clasificacion de sesion vienen de FastF1, que manda **tres letras y el nombre del equipo, y nada mas**. De ahi que salieran pobres. `lib/parrilla` cruza ese codigo con nuestra ficha (dos fuentes: la propia carrera primero, la ultima ronda corrida despues, porque el viernes la carrera aun no ha corrido) y de ahi salen nombre completo, foto, dorsal y las dos banderas. **Los cuatro datos van juntos por decision del usuario sobre maqueta**: «el dorsal, la foto y la bandera son indispensables… y para los equipos, banderas de nacionalidad tambien». Comprobado antes de dibujarlo: `Team.nationality` esta en el esquema, las 25 escuderias la tienen y los 48 SVG ya estaban en el proyecto — no se enseñaban en ningun sitio. El dorsal es columna propia, en el color de marca; la tinta se elige **midiendo** los dos contrastes y quedandose con el mayor, y las once escuderias de 2026 pasan de 4,5:1. La celda del piloto va en dos lineas porque en una sola no cabe: la columna mide 672 px medidos y «Andrea Kimi Antonelli» con foto y bandera delante se cortaba. La fila pasa de 52 a 58 px. **La `<table>` de la carrera desaparece y la semantica se declara a mano** (`role="table"`, `row`, `columnheader`, `cell`): un `display: grid` sobre elementos de tabla les quita su papel en Chrome, y la prueba de accesibilidad que ya existia lo cazo al primer intento. El abandono se dice **DNF** y no «Abandono» —correccion del usuario—, con el motivo entero en el `title` y en lo que lee un lector de pantalla. Y la tarjeta de **«Proxima carrera» con cuenta atras**, que se prometio en la maqueta anterior y no se habia construido. |
| **17-bis** entrar con el correo | HECHO, **pendiente de la clave** | (este commit) | Segunda via de acceso, pedida al ver el login de Flashscore. Enlace por correo y sin contraseña: no hay secreto de nadie que custodiar. **No se usa `next-auth/providers/email`**: carga `nodemailer` en su primera linea y aqui no se habla SMTP —Resend tiene API de HTTP, asi que enviar es un `fetch`—, asi que el proveedor se declara a mano y no entra una dependencia mas en la imagen. Dominio `meeks.fun` verificado en Resend por auto-configuracion de Cloudflare; los tres registros comprobados contra el DNS publico antes de darlo por bueno: DKIM en `resend._domainkey`, SPF `v=spf1 include:amazonses.com ~all` y MX a `feedback-smtp.sa-east-1.amazonses.com`, que cuadra con la region de Sao Paulo. El aviso de «te hemos mandado el enlace» se resuelve DENTRO del panel (`redirect: false`): la pantalla de serie de next-auth dice «Check your email» en ingles. Y la de error se sustituye por una en español que distingue los cuatro motivos, porque un enlace caducado —llega al correo y se abre al dia siguiente— es lo mas normal del mundo. Falta solo `RESEND_API_KEY` en el entorno: sin ella la app arranca igual y el panel solo ofrece Google. |
| **17-ter** los favoritos viajan | HECHO | `b9b452d` | Lo que faltaba para que la cuenta sirviera de algo. Al abrir se piden los de la cuenta y se ponen de acuerdo con los del aparato; al cambiar algo se sube, con 800 ms de respiro. Quien gana lo decide `sincronizar`, puro y probado, porque es la unica parte capaz de perder lo que alguien marco a mano. El cuarto caso —el que `decidirFusion` llama «preguntar»— **junta las dos listas**: el usuario zanjo que no quiere esa pregunta, y de las salidas posibles la union es la unica que no borra a nadie. El acento, que es uno solo, lo gana el aparato: es el color que se esta viendo. Que falle la cuenta no deja a nadie sin favoritos. |
| **46-bis** las pestañas que faltaban | HECHO | `b9b452d` | Fallo mio: al cerrar el 46 dije «las cuatro tablas» y deje fuera la **clasificacion del fin de semana** y el **sprint**, que tenian su propia `<table>`, y la **portada**, que usaba la fila vieja. Lo vio el usuario a la primera. Las tres pasan a `TablaDeTiempos`. `TimingRow` sobrevive en un solo sitio y con el motivo escrito: «Ultimos resultados» de un piloto, donde cada fila es una CARRERA. `ListaDeFilas` es nueva y existe por accesibilidad: `role=row` y `role=cell` necesitan una tabla por encima, y en la portada no hay cabeceras que enseñar. |
| **20-bis** las practicas se piden cada vez | HECHO | `b9b452d` | Reportado por el usuario. Las cuatro rutas de cronometria no mandaban `Cache-Control` y las del replay si: cada visita volvia a pedirle la sesion al servicio, y la primera peticion de una sesion descarga su cronometria entera — ese era el minuto de espera. Ahora mandan `public, max-age=86400`, el mismo valor y la misma razon que las posiciones: una sesion corrida no cambia. La primera vez sigue tardando; las siguientes no. |
| **49** la casilla de sesion solo se pulsaba al 70 % | HECHO | `e773521` | Medido en produccion antes de tocarlo: casilla de 88 px, enlace de 61 — el 69 %, en las cuatro que no llevan cuenta atras. La casilla se estira a la altura de la fila y el enlace media lo que ocupaba su texto. Con la casilla como contenedor flex, el enlace se estira solo. La prueba compara contra `clientHeight` y no contra la caja: la casilla lleva borde abajo. |

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

**HECHO.** `SesionPendiente` se usa en cuatro sitios de la ficha de carrera, con
`ParrillaProvisional` para la parrilla reconstruida. Comprobado en el codigo el
2026-09-14.

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

## 5. CERRADO · Quitar «from ApexData» del aviso — **NO SE PUEDE, no es nuestro**

El usuario lo ve innecesario: con el logo en la notificacion basta.

**Ojo, probablemente no es nuestro.** `public/sw.js:265` llama a
`showNotification(aviso.titulo, { body, icon, badge, ... })` y **no** manda ningun
subtitulo; en `src/lib/push/` no aparece la cadena. Todo apunta a que **iOS lo añade
solo** en los avisos web push de una PWA, como fuente del aviso. Si es asi no se puede
quitar desde el codigo y hay que decirselo al usuario claramente en vez de prometerlo.

**VERIFICADO (2026-09-12). NO SE PUEDE QUITAR: no es nuestro.** Comprobado, no supuesto:

1. `public/sw.js:265` llama a `showNotification(aviso.titulo, { body, icon, badge, tag,
   data })`. **No hay ningun campo de subtitulo**, y el estandar de la Notification API
   tampoco tiene uno: no existe la opcion.
2. Lo que sale del servidor es `JSON.stringify(aviso)` (`src/lib/push.ts:117`), y `aviso`
   solo tiene `titulo`, `cuerpo`, `etiqueta` y `url` (`src/lib/push/redaccion.ts`).
3. La cadena **«from ApexData» no aparece en NINGUN archivo del repositorio** salvo en
   esta linea del plan.

Asi que lo pone iOS, como fuente del aviso, igual que hace con las apps nativas. La
unica palanca que existe es el **nombre de la PWA** (`public/manifest.webmanifest`:
`"name"` y `"short_name"`, hoy «ApexData»), que es de donde iOS saca ese texto — pero
cambiarlo cambia tambien el nombre del icono en la pantalla de inicio, asi que no es
«quitarlo», es «llamarse de otra forma».

**Decision pendiente del usuario**: dejarlo como esta (recomendado) o renombrar la app.

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

> **HECHO** (`d94ff58`), dentro del rediseno de los mandos (punto 40). NO
> lleva etiqueta fija: al pulsar, el destello del centro dice el salto
> **real** —a dos segundos del final dice «+2 s», no «+10 s»—, que es mas
> preciso que lo que se pidio. El nombre accesible si dice la cantidad.

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

**HECHO.** El aro del lider, por fuera del suyo propio, en
`MapaDeCarrera.tsx` (`El aro del líder`, sobre la linea 279), con `ultimoLider`
para que no salte entre fotogramas. Comprobado en el codigo el 2026-09-14.

Con la carrera avanzada, entre doblados y rezagados **confunde**: parece que un doblado
pelea con el de delante cuando en realidad ya le sacan mas de una vuelta. Quiere poder
**ubicar al lider de un vistazo**.

## 12. FEATURE · Los abandonos y las banderas no se notan

**HECHO** (bitacora 66, commit `5188644`). El abandono da **tres anillos
encadenados** y un aviso `DNF · LEC` que parpadea tres veces y **hace cola**
—dos coches pueden quedarse fuera a la vez—. Las banderas se ven en las bandas
de color del estado de pista, en el deslizador. Comprobado en el codigo el
2026-09-14.

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

> **VEREDICTO (2026-09-13): FastF1 publica antes, y por mucho.** Cinco medidas,
> tres de ellas limpias —`firstProbe` cerca de cero y varios sondeos—, todas del
> fin de semana de España:
>
> | Sesion | FastF1 | OpenF1 | Diferencia |
> |---|---|---|---|
> | **Carrera** | **9m 57s** | 46m 44s | **-36 min** |
> | Clasificacion | 25m 00s | 30m 59s | -6 min |
> | Practica 3 | 42m 57s | 49m 56s | -7 min |
>
> Media: FastF1 1698 s contra OpenF1 2284 s. El propio endpoint lo resume en
> «fastf1 publica antes».
>
> **El caso real que lo cierra**: la carrera termino a las 15:00 UTC y el aviso
> le llego al usuario a las **15:50:38 UTC** — cincuenta minutos. Se descompone
> exactamente: 35 de espera obligatoria + 12 hasta que OpenF1 publico + el
> barrido. Con FastF1 habrian sido unos **doce minutos**.
>
> **Por que existe la espera de 35 min**: OpenF1 considera «en directo» —y de
> pago— desde 30 min antes de empezar hasta 30 despues de terminar. FastF1 no
> tiene esa ventana, asi que la espera desaparece con el cambio.
>
> **Lo decidido con el usuario**: NO cambiar una por otra, sino **preguntar
> primero a FastF1 y dejar OpenF1 de respaldo**. Se lleva los 35 minutos de
> ganancia sin perder la red de seguridad.
>
> **Lo que hay que tener en cuenta al hacerlo**:
> - Sondear FastF1 obliga al servicio a cargar la sesion entera (36 s medidos) y
>   solo carga una a la vez: sondear desde el minuto 5 en vez del 35 multiplica
>   las veces. Hay que acotar la ventana y parar en cuanto conteste.
> - Los avisos pasarian a depender de nuestro propio servicio. Hoy, si se cae,
>   siguen llegando porque OpenF1 es ajeno. De ahi el respaldo.
> - Son tres medidas limpias de UN fin de semana y UN circuito.
>
> **HECHO A MEDIAS (2026-09-13), y a proposito.** Los avisos preguntan primero
> a FastF1 y dejan OpenF1 de respaldo, pero **solo para carrera, sprint y
> clasificacion**. Las practicas siguen por OpenF1, y no por pereza:
>
> **Hallazgo que corrige al propio experimento**: comprobado contra el servicio
> con la FP1 de España, en practicas FastF1 devuelve las 22 filas **con
> `Position` a nulo y sin tiempos**. No hay clasificacion que leer. La sonda
> contaba `results.length`, asi que su medida de las practicas decia «la sesion
> ya carga», no «ya hay clasificacion». La sonda queda corregida para exigir
> filas clasificadas, y a partir de ahora esa columna mide lo que dice.
>
> Verificado levantando el servicio de telemetria en local y pidiendole las tres
> sesiones de España. El texto que sale por el camino nuevo es **identico** al
> que le llego al usuario por OpenF1 —«Ganó Antonelli (Mercedes). Detrás,
> Verstappen y Norris.»— pero 37 minutos antes.
>
> Lo que NO se borra todavia: `carrera-de-fuentes.ts` sigue, porque las
> practicas siguen sin decidir y ahora la sonda por fin mide bien.

> Al cerrarlo se borra `src/lib/push/carrera-de-fuentes.ts` y su tabla, que se
> escribieron para desaparecer.


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

## 19. CERRADO · Navegador para la PWA en Android

> **CERRADO el 2026-09-14.** El usuario ya lo comprobo en su telefono. Queda
> sin anotar **cual fue el resultado** —si los avisos llegan en Brave o no—,
> que es lo unico que valdria la pena conservar de este punto. Si aparece, se
> escribe aqui.

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

**HECHO.** El mensaje explica que la primera consulta descarga la sesion entera
y que las siguientes son inmediatas. Y desde el 2026-09-14 eso es cierto: las
cuatro rutas de cronometria mandan `Cache-Control: public, max-age=86400` (ver
**20-bis** en el REGISTRO DE AVANCE).

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

> **ELEGIDO POR EL USUARIO (2026-09-13): la curva D, rebote suave**
> —`cubic-bezier(0.34, 1.15, 0.64, 1)`—. La tecnica es la de dos capas con
> recorte; lo que se elige es cuanto de los 720 ms es recorrido de verdad.
> Medido en la maqueta: B (la curva de hoy) 258 ms, **D 432 ms**, C (sin rebote)
> 609 ms. Con la D se conserva el muelle y el recorrido dura casi el doble que
> hoy, que es lo que hacia invisible el efecto.


**Lo que dice el usuario**: con Inicio marcado, el icono y la palabra van pintados.
Al tocar Pilotos, el realce se desliza de una a otra **pasando por Fechas y Puntos**, y
esas dos no se encienden al pasar. «Se que puede parecer algo estupido pero para mi es
el correcto flujo.» No lo es: el realce tarda 720 ms y durante ese viaje la unica
pestana coloreada es la de destino, asi que el recorrido se lee como un salto de color
aunque la forma si viaje.

**Lo que hay hoy**: el color lo pone `aria-current="page"`, que es **binario y salta de
golpe** al llegar la ruta. No sabe nada de por donde va el realce.

**HECHO (2026-09-13, `7c0929b`).** El usuario eligio la **opcion D, el rebote
suave**: «me gusta mas el rebote suave, osea opcion D». Implementado con la via
del `clip-path` —una segunda fila de pestanas ya coloreadas, `aria-hidden`,
recortada por el realce y moviendose con el— y la curva cambiada a
`cubic-bezier(0.34, 1.15, 0.64, 1)`, que es lo que hace que el recorrido dure
**432 ms de los 720** en vez de 258. Es casi el doble de tiempo encendiendo
pestanas, que era el problema real.

Y por el camino aparecio lo importante:

> Las tres primeras versiones **le parecieron identicas**, y tenia razon. Medido: con la
> curva de hoy —`cubic-bezier(0.34, 1.56, 0.64, 1)`— el recorte **cruza la barra entera
> en 268 ms**, y los otros 450 ms de los 720 son el rebote oscilando ya en el destino
> (87,7 % -> 80 %). Cada pestaña intermedia se enciende unos **80 ms**: no da tiempo a
> verla. **Lo que hay que elegir no es la tecnica, es la curva.**
>
> Medido en la maqueta nueva, cuanto dura el RECORRIDO de 720 ms:
> **B (la de hoy) 258 ms · D (rebote suave) 432 ms · C (sin rebote) 609 ms.**

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

## 14-ter. BUG · La barra se come toques (2026-09-13)

**Confirmado por el usuario probando lo desplegado**, de los tres sintomas que habia:

1. **Se despega al desplazar: CERRADO.** «Ahora que estoy probando no se esta moviendo,
   lo cual es raro ya que venia pasando bastante.» Era `env(safe-area-inset-bottom)`, y
   lo arreglo el 14-bis.
2. **Toda la barra reacciona al pulsar: NUNCA FUE.** «No, solo el boton.» Medido tambien
   aqui: pulsando una pestaña cambia su caja (162,762,65,56 -> 165,764,60,52) y la barra
   y las otras cuatro no se mueven un pixel.
3. **Se pierden toques: SIGUE ABIERTO.** Y ademas: «click en inicio y pilotos e inicio de
   nuevo se queda en pilotos».

**Lo que ya se descarto, con medida y no con opinion**:

- **No es el pulsado.** Maqueta `/maqueta/toques.html` con cuatro barras que solo se
  diferencian en eso —A `scale(.92)` como hoy, B el fondo se aclara, C solo encoge el
  icono, D sin cristal—. El usuario: «en todas va bien, ninguna se pega». O sea que ni
  el `transform` bajo el dedo ni el `backdrop-filter` tienen que ver.
- **No es la zona muerta**, aunque era real: el 25 % de la barra no respondia (el anillo
  de 6 px de `padding` y borde, mas los 20 px hasta el borde de la pantalla; 43 %
  contando esa franja). Arreglado y desplegado, y el usuario dice que **sigue igual**.
- **No es una carrera de navegaciones.** Si un toque se pierde, «inicio, pilotos, inicio
  se queda en pilotos» se explica sin inventar nada mas.
- **No se reproduce en Chromium**: nueve intentos con red lenta y toques sin pausa,
  todos correctos. El WebKit de Playwright de esta maquina **no sirve de control**: ahi
  no navega NINGUN enlace, ni la barra, ni uno normal, ni un `.click()` por JavaScript,
  por errores de SSL cargando recursos.

**Donde queda la culpa**: en la navegacion. En la maqueta el toque mueve el realce y
nunca falla; en la app el toque tiene que pasar por `<Link>` y el router del App Router.
La diferencia entre las dos es exactamente eso.

**Por donde seguir (2026-09-14)**: instrumentar la barra REAL en el telefono del usuario
—contar `touchstart` y `click` que llegan de verdad al enlace— en vez de seguir
adivinando. Si llegan los dos y no navega, es el router; si llega el `touchstart` y no el
`click`, es iOS descartando el toque por algo que todavia no hemos aislado.

## 24. DECISION DEL USUARIO · Mandos minimos en vertical, y replay a pantalla completa

> **HECHO**, en dos piezas: los mandos minimos en `d94ff58` (solo iconos, sin
> pastilla, con fondo translucido al pulsar) y la pantalla completa en
> `0b86143` (expandir de pie pide girar en vez de romperse).

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

**HECHO** (bitacora 66, commit `471303f`). Era la segunda hipotesis de las dos
que este punto planteaba: el cartel decia AMARILLA durante veinte minutos con
todos en el garaje porque el dato oficial declaraba 103 s de roja y la parada
real fueron **1819**. Se corrige sobre los tramos, alargando una roja **ya
declarada** y sin inventar ninguna, asi que el reloj de carrera —y con el, el
delta— se congela lo que de verdad duro la parada.

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

**HECHO.** Cuatro salidas a maqueta y el usuario eligio el **tirador**: encoger
el mapa deja de ser el mismo gesto que recorrer la lista. Medido y escrito en
`replay/ReplayClient.tsx`: el encogido costaba 220 px de desplazamiento y las
filas miden 44, o sea las cinco que el usuario reportaba. De regalo, el tamaño
del mapa **se queda** — antes volver arriba lo agrandaba sin querer.

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
## VERIFICACION HECHA (2026-09-14) — la FP3 del sabado 12 ya corrio

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

---
---
# ---- Tanda del 2026-09-13, probando el fin de semana de Espana ----

> Todo lo de aqui abajo sale de que el usuario uso la app durante el GP de
> Espana y mando capturas. Cada punto lleva **lo que se midio**, no lo que se
> supuso.

## 32. BUG+DECISION · La pantalla completa en vertical no lleva a ningun sitio

**Lo que reporta**: pulsar «expandir» sin girar el telefono deja el modo
horizontal metido en una pantalla vertical — torre cortada por la derecha,
circuito aplastado, barra de progreso escondida bajo el menu. Y el usuario
esperaba que el boton girase la pantalla solo.

**Correccion mia**: en iOS **no se puede girar la pantalla por codigo**.
`screen.orientation.lock()` no existe en Safari y el campo `orientation` del
manifest se ignora aunque la app este instalada. Si se dio a entender lo
contrario, fue un error.

**Las cinco situaciones, validadas**:

| Bloqueo de rotacion | Que hace el usuario | Que pasa hoy |
|---|---|---|
| Desactivado | Gira el telefono | OK, entra el modo que se diseño |
| Desactivado | Pulsa expandir en vertical | El modo horizontal en pantalla vertical |
| Desactivado | Sale del modo estando tumbado | Cae en el layout de ESCRITORIO (ver 34) |
| **Activado** | Pulsa expandir y gira | **Callejon sin salida**: el viewport nunca pasa a horizontal |
| Cualquiera | Intenta pulsar expandir | El boton queda bajo la barra de estado (ver 33) |

Y un limite duro: **desde la web no se puede leer si el bloqueo esta activado**.
Solo se infiere: «han pasado N segundos y sigue en vertical».

**Las tres salidas**:

1. **Solo el aviso de girar.** Simple, pero con el bloqueo activado deja tirado.
2. **Girar los componentes por CSS.** Lo unico que funciona con el bloqueo
   activado. El doble giro que temia el usuario **se resuelve solo**: las dos
   rotaciones dependen de la misma señal, asi que al pasar el viewport a
   horizontal se quita la nuestra. Cuesta: `position: fixed` dentro de algo
   rotado deja de anclarse a la pantalla —ya mordio con la barra—, los margenes
   de la muesca quedan del lado contrario, y una captura del usuario saldria
   girada.
3. **Las dos por pasos (recomendada).** Aviso animado al pulsar; si gira, entra
   el modo real; si pasan unos segundos y no cambia, aparece «Girar de todos
   modos» que aplica la rotacion por CSS. Opt-in explicito.

**El aviso lo eligio el usuario con una referencia**: telefono con flechas
girando, texto al lado, **animado** —las flechas parpadean unas cuatro veces y
el telefono gira—, ocupando la pantalla. Y el boton de expandir **se queda
visible** en vertical, pero tiene que ser pulsable.

**MAQUETA LISTA (2026-09-13)**: `/maqueta/girar.html`, instalable y sin
JavaScript. Trae las tres salidas y el aviso ya animado —el telefono con dos
flechas que parpadean cuatro veces y luego gira—, ademas del replay girado por
CSS para poder juzgar si se puede usar asi de verdad.

**Hay que probarla DOS VECES**: una con el bloqueo de rotacion apagado y otra
con el puesto. Con el bloqueo puesto es donde la opcion 1 deja tirado al
usuario, que es justo lo que hay que decidir. En la opcion 3, «Girar de todos
modos» aparece a los cuatro segundos de no girar.

**DECIDIDO Y HECHO (2026-09-13).** El usuario probo la maqueta instalada, las
dos veces —con el bloqueo de rotacion puesto y quitado— y descarto girar por
CSS: con el bloqueo quitado, al girar el movil el sistema gira la pantalla y la
rotacion propia se suma a la del sistema. «Se pone de cabeza. Inviable.»

**Correccion honesta**: ese doble giro es culpa de la MAQUETA, no del diseño.
Sin JavaScript, la rotacion por CSS no puede enterarse de que el movil ya giro;
en la app las dos rotaciones leerian la misma señal y no podrian sumarse. Se le
dijo. Aun asi eligio la opcion 1, y su razon vale: una capa que se puede sentir
al reves no compensa lo que resuelve.

**Lo implementado**, con lo que el pidio:

1. Pulsar expandir de pie NO entra en el modo roto: sale el aviso animado.
2. El aviso **se cierra solo al girar** —eso si se sabe detectar— y entra la
   pantalla completa. Nada de tener que darle a Salir despues de hacer lo que
   pedia.
3. A los cuatro segundos sin girar aparece **«¿No gira? Puede que tengas el
   bloqueo de rotacion puesto.»** La pista llega tarde a proposito: quien gira
   enseguida no necesita que le digan nada.
4. **Ligera transparencia**, tambien peticion suya: se ve por debajo que el
   replay sigue ahi, asi que el aviso se lee como un paso y no como otra
   pantalla.

Y la lista de pilotos cortada que quedaba (su ultima pega) **desaparece sola**:
ya no se entra nunca en ese reparto estando de pie.

**El boton se queda visible en vertical**, decision suya: escondido, nadie
descubriria que la pantalla completa existe.

## 33. BUG · Falta `env(safe-area-inset-top)` en la pantalla completa

> **HECHO** (`7c0929b`). El contenedor del modo completo lleva
> `pt-[env(safe-area-inset-top)]`, asi que la cabecera ya no se mete bajo la
> hora y el wifi y el boton de expandir se deja pulsar. Punto 3.4 de la guia.

El contenedor del modo completo reserva `env(safe-area-inset-left)`, `right` y
`bottom`, **pero no `top`**. Se diseño pensando en horizontal, donde la muesca
queda al lado; en vertical el hueco esta arriba y nadie lo reservo, asi que la
cabecera de 40 px se mete debajo de la hora, el wifi y la bateria — y el boton
de expandir **no se deja pulsar**.

## 34. BUG · El layout de escritorio en un movil tumbado

Un telefono tumbado mide 844 px de ancho y el punto `md` de Tailwind esta en
768. Al **salir** de la pantalla completa estando tumbado, la app se cree un
ordenador: cabecera del sitio, mapa pequeño. El usuario: «no entiendo que
version es esa». El arreglo natural es que el layout de escritorio no aplique a
un viewport de 390 px de alto.

**HECHO (2026-09-13).** Punto de corte nuevo, `pc`, que pide **ancho de
escritorio Y altura para usarlo**: `(min-width: 768px) and (min-height: 500px)`.
Lo usan las pantallas del replay, que son las que reparten en vertical.

**`md` no se toca a proposito**: en una tabla o una lista, mas ancho SI es mejor
aunque haya poca altura. El problema no era el ancho, era repartirlo en vertical
sin vertical que repartir.

Medido tumbado a 844x390, saliendo de la pantalla completa: la torre pasa de
**339 px de ancho y filas de 30** —la columna de escritorio— a ocupar los 844 y
filas de 44, que es la de tocar con el dedo. Y a 1280x900 sigue siendo la de
escritorio, que es el contrapeso: esto no puede arreglar el telefono rompiendo
el ordenador. Las dos cosas tienen prueba, y la primera se comprobo fallando con
el corte saboteado a solo ancho: 339 px.

## 35. BUG · La barra de progreso queda bajo el menu

> **HECHO** (`999eed9`). El deslizador vuelve a la vertical, fino y **encima**
> de los botones, dentro de la caja de mandos — que es lo que lo saca de
> debajo de la barra de pestanas. Punto 2.2 de la guia.

En esa misma pantalla en vertical, el scrubber cae detras de la barra de
pestañas. Va aunque el modo completo no llegue a abrirse nunca en vertical.

## 36. TEXTO · El aviso de abandono dice `DNF`, y debe decir `DNF · LEC`

> **HECHO** (`7c0929b` el texto, `5188644` lo demas). Dice `DNF · LEC` con su
> codigo, parpadea **tres veces** en vez de una y **hace cola**: dos coches
> pueden quedarse fuera a la vez y con un solo hueco el segundo pisaba al
> primero. Y la lista dice `DNF`, no `OUT`.

Malentendido mio: el usuario dijo «en lugar de LEC - abandona debe ser DNF» y se
leyo como sustituir el rotulo entero, cuando queria cambiar solo la palabra y
conservar el codigo del piloto.

## 37. BUG · El indicador miente durante una parada larga

**Medido en Italia 2026**, tramos de `track_status`:

```
   252s ->  355s  ( 103s)  ROJA
   355s ->  371s  (  16s)  verde
   371s -> 1578s  (1208s)  AMARILLA
```

La roja **declarada** dura 103 s. Despues hay **1208 s de amarilla** — veinte
minutos— mientras los coches estan en el garaje: la detencion real fue de
1819 s (medida en el punto 25). La app se pasa veinte minutos diciendo
«amarilla» y pintando el circuito de naranja. Por una amarilla nadie va al
garaje.

**Ya existe la señal**: el «nadie avanza» que se calculo para `relojDeCarrera`
en el punto 25. Hoy solo lo usa el reloj.

**DECIDIDO POR EL USUARIO (2026-09-13), contra mi recomendacion y con razon**:
«BANDERA ROJA ES BANDERA ROJA, asi como BANDERA AMARILLA ES BANDERA AMARILLA,
respetemos esto». Nada de inventar un estado nuevo: se respeta el vocabulario de
banderas y lo unico que se corrige es **cuanto dura la roja**.

**HECHO.** Se corrige sobre los TRAMOS y no en cada sitio que los lee, asi que
el cartel, el color del circuito y las bandas de la barra de progreso dicen lo
mismo sin tener que acordarse de nada. En Italia la roja pasa de **103 s
declarados a 1879**, que es lo que duro la parada.

**Y solo se ALARGA una roja ya declarada, nunca se inventa una.** Es lo que
separa una bandera roja de una parada de parrilla: en Italia se detectan TRES
detenciones —4:12, 37:49 y 41:08— y solo la primera cae sobre una roja
declarada. Las otras dos son las dos paradas de parrilla del relanzamiento, y
ahi no hay ninguna bandera que enseñar.

## 38. BUG DE PRODUCTO · La portada contradice a la notificacion

> **HECHO** (`0f22ead`). La portada dice «ya se corrio, los resultados todavia
> no han llegado» en vez de ensenar la carrera anterior. **Pendiente de
> verlo en vivo** justo despues de la proxima carrera: punto 7 de la guia.

A las cuatro horas de acabar el GP de España, la portada decia «proxima carrera:
Azerbaiyan» (correcto) y «ultimo resultado: **Italian Grand Prix**». Comprobado:

- Ronda 14 existe en la base con **0 resultados**
- La ultima con resultados es la 13
- **Jolpica no publicaba nada** a las 4 h (con Italia tardo entre 6 y 8)

No es un fallo nuestro: son **tres fuentes a tres velocidades** y se enseñan
juntas. El calendario al instante, la notificacion a los 46 min por OpenF1, y
los resultados de la base sin llegar.

**Dos tamaños**: el cartel honesto —«Spanish Grand Prix · resultados en camino»,
con el lenguaje de sesion pendiente que la app ya usa— y llenar la base desde
FastF1 marcando provisional, que va con el punto 18.

## 39. BUG · Veintiun abandonos falsos al relanzar tras la bandera roja

> **HECHO** (`7c0929b`). De 21+5+2 falsos a **cero**, con LEC, ALO y STR
> saliendo en 4:42, 70:12 y 75:03, que es cuando de verdad se quedan fuera.
> Punto 1.2 de la guia.

**Medido en Italia 2026**, contando quien pasa de «dentro» a «fuera» en cada
instante:

```
  cuando          cuantos  quienes
     4:49           1      LEC                      <- el abandono de verdad
    35:32          21      ANT VER NOR PIA HAM ...  <- LA PARRILLA ENTERA
    38:60-39:05     5      VER GAS COL LEC NOR      <- el relanzamiento
    42:14           2      GAS LEC
    70:11           1      ALO                      <- de verdad
    74:57           1      STR                      <- de verdad
```

**La causa**: `estaFuera` exige «60 s quieto **mientras el lider avanza**».
Durante la media hora de parada no se mueve nadie, lider incluido, asi que no
salta nada. Pero en cuanto el lider arranca la vuelta de formacion, el ya avanza
y los demas siguen con el progreso plano de los 60 s anteriores, que eran de
parada: los veintiuno cumplen la condicion a la vez. Y se repite en la parada de
la parrilla del relanzamiento.

**Es el tercer bug de la misma familia** —el delta que se inflaba, el reloj que
seguia corriendo, y esto—: se miden **60 segundos de reloj de pared donde habia
que medir 60 segundos de carrera**. Con `relojDeCarrera` la ventana se salta la
parada entera.

## 40. UI · Rediseñar los mandos del replay

> **HECHO** (`d94ff58`). El usuario eligio la **familia A** —«me quedo con la
> A creo. Si, la A»— y pidio ademas un fondo al pulsar, «que no sea tan
> intenso, un poco traslucido». Punto 2.1 de la guia.

**Lo que dice el usuario**: «estos botones expandidos son horripilantes», y que
en el modo normal tambien se pueden mejorar. Y quiere **quitar el «10 s»**.

Quitarlo es correcto y no se pierde nada: al pulsar ya sale en el centro el
salto REAL —a dos segundos del final dice «+2 s», no «+10 s»—, asi que la
etiqueta fija dice algo MENOS preciso que lo que se ve. El nombre accesible si
sigue diciendo la cantidad.

Maqueta en `/maqueta/mandos.html` con cuatro familias, cada una en sus dos
formas —riel vertical y fila— y con su pulsado: **A** solo iconos, **B** un solo
bloque con separadores, **C** con relieve, **D** una capsula (recomendada, es la
forma que ya tiene la barra de abajo de la app). Comprobado que **ningun boton
baja de 44 px** en ninguna familia.

**PENDIENTE**: que el usuario elija una letra.

## 41. BUG · Quien sale desde el pit lane figuraba lider

> **HECHO** (`cd3b4f2`). BEA aparece el ultimo desde el instante cero. El
> mismo fallo existia en Italia, Paises Bajos y Hungria durante un instante.
> Punto 1.4 de la guia.

**Lo que vio el usuario** en la repeticion del GP de España 2026: BEA salio
desde el pit lane y **el replay lo daba por lider desde el primer segundo**.

**No era un fallo de la proyeccion.** El pit lane esta fisicamente por delante
de la linea de meta, asi que proyectar ese coche sobre el trazado da un numero
mayor que el de toda la parrilla. Medido: BEA proyectaba en el metro **549** con
la parrilla entre el **23 y el 170**, y figuraba primero **doce segundos**,
hasta que el resto le pasaba por encima.

**Y ya pasaba antes, solo que un instante**, con el coche que arrancaba mas
tarde: LAW en Italia, PER en Paises Bajos y Hungria. Por eso no se habia notado.

**Lo que se descarto, con medida**:

- **La parrilla oficial no lo dice**: en la base BEA tiene `grid = 22`, no el
  `0` con el que otras fuentes marcan una salida desde el pit lane.
- **Lo geometrico separa poco**: BEA estaba a **63 m** de la linea de carrera,
  pero el peor caso normal de Italia estaba a **24 m**. Demasiado cerca para
  fiarse de un umbral con una sola muestra.

**Lo que si distingue** a ese coche no es donde esta, es que **no se ha movido**:
espera en el pit lane a que pase la carrera. Y eso vale igual de bien para el que
se cala en la parrilla, sin tener que saber de donde salio.

Con una holgura de cinco segundos, porque en el instante cero no se ha movido
nadie: quien arranca dentro de los cinco segundos del primero esta en la
carrera, quien tarda veinte no. Medido en España, la parrilla se pone en marcha
entre **1,3 y 3,0 s** y el del pit lane a los **20**.

**Resultado**: BEA pasa de figurar lider doce segundos a salir **22.º desde el
instante cero**, y su carrera no cambia — termina 16.º en el replay, que es su
puesto oficial. En las otras tres carreras desaparece el falso lider del primer
instante y nada mas cambia.

## 42. UI · La proporcion del replay en escritorio

**Lo que dice el usuario**: «siento que el circuito o el area que abarca es muy
grande con respecto a lo demas, ya que la lista de pilotos se ve muy pequena».
Y la palabra que buscaba era **proporcion**.

**Medido con la carrera real**, antes del arreglo:

| pantalla | mapa | torre | torre / ancho |
|---|---|---|---|
| 1280 |  940 | 339 | 26 % |
| 1600 | 1260 | 339 | 21 % |
| 1920 | 1580 | 339 | 18 % |
| 2560 | 2220 | 339 | **13 %** |

La torre estaba **clavada en 339 px** y el mapa era elastico: uno crecia sin
limite y la otra no.

**Y lo que se llevaba el sitio no lo aprovechaba.** El trazado si crece —usa el
95 % de su caja a 2560— pero el radio de los coches era `w < 480 ? 5 : 6`, o
sea **6 px siempre**. En un mapa de 940 un coche ocupa el 0,6 % del ancho; en
uno de 2220, el **0,27 %**. Al agrandar el circuito los coches se vuelven
proporcionalmente mas pequenos y cuesta MAS seguir a alguien, no menos.

**HECHO**, tres cosas:

1. La torre en proporcion: `clamp(340px, 26%, 520px)`. El suelo son los 340 de
   siempre —a 1280 sale exactamente igual, sin regresion— y el techo evita que
   la fila se quede con un hueco en medio.
2. Tope al conjunto en **1536 px, que es el de toda la app**: medido, la
   cabecera y el contenido de la portada, los resultados, la clasificacion y
   los pilotos se paran ahi en cualquier pantalla. El replay era el unico que
   seguia estirandose.
3. El radio de los coches crece con el mapa: `w < 480 ? 5 : clamp(6, w/150, 11)`.
   El suelo mantiene igual todo lo que ya funcionaba —de 480 a 900 px sale el
   mismo 6— y el techo evita que los veintidos puntos se solapen en la recta.

## 43. UI · La lista de pilotos deja media columna muerta (2026-09-14)

**Lo que dice el usuario**: «en el modo web mira todo el espacio que consumimos
para el circuito y los mandos, es desproporcional con la lista de pilotos, creo
que deberias de agrandar para que cubra todo el ancho al menos tambien».

Es el hermano del punto 42. Aquel repartia el **ancho**; este es el **alto**:
arreglado el ancho, la lista seguia siendo una banda corta arriba de una
columna larga.

**Medido**, con la carrera real y una pantalla de 1440x1250:

```
22 pilotos x 30 px = 660 px  en una columna de ~1085
                              -> 425 px muertos debajo del ultimo
```

La prueba nueva reproduce exactamente ese numero antes del arreglo:
`sobran 425 px debajo del ultimo de 22 pilotos`.

**HECHO**. La lista llena su columna con flex —`pc:flex pc:min-h-full
pc:flex-col` en el `<ol>`, `pc:flex-1` en cada fila— y en la pantalla del
usuario las filas pasan de 30 a **52 px**. Tres detalles que no son adorno:

1. **Suelo de 30 px**: si la columna es mas corta que las filas, el `min-h`
   gana y la caja se desplaza como siempre. Estirar no puede volverse encoger.
2. **Techo de 56 px**: sin el, en un monitor de 4K la columna pasa de 2000 px y
   cada fila se iria a ~95. Deja de parecer una lista y parece un error.
3. **Solo en `pc:`**: en el movil la fila sigue en sus 44 px tocables.

Cuatro pruebas de navegador: la que reproduce el hueco, y tres guardias —la
columna corta, el monitor enorme y el movil— que valen justo por lo que
impiden, no por lo que reproducen.

**Nota de metodo**: la primera sonda que escribi para medir el recorte de los
nombres usaba `scrollWidth` y daba **cero en todo**, incluido un caso que se
veia cortado en la captura. Con `text-overflow` el navegador recorta el
contenido al hueco y `scrollWidth` no lo delata; hay que medir el texto con un
`Range`. Queda escrito porque es una trampa que se repite.


---

# ---- Tanda del 2026-09-14: la web deja de ser la PWA estirada ----

> **El diagnostico es suyo y es el correcto**: la app esta construida como una
> PWA de telefono a la que se le ha estirado el ancho, no como una web. Los
> cuatro puntos de abajo son caras de lo mismo.
>
> Su encuadre, literal: «no es que todo esto este mal, si no que creo que hemos
> llegado a un punto en el cual debemos buscar la perfeccion o lo mas cerca
> posible». Y: «ya dejamos de ser simplemente unos entusiastas del motor sport y
> pasamos a ser obsesivos con ofrecer lo mejor en informacion y experiencia de
> usuario».
>
> Los cuatro van a **maqueta**, y los cuatro se miran juntos: comparten la misma
> causa y arreglarlos por separado es rehacer el mismo trabajo cuatro veces.

## 45. WEB · El menu de secciones es una hoja de telefono en una pantalla grande

**HECHO** (2026-09-14). Decidido sobre maqueta aprobada por el usuario: en escritorio
el menu desaparece y las nueve secciones viven en un rail a la izquierda. Ver el
REGISTRO DE AVANCE.

**Lo que se ve** (captura suya, escritorio): al pulsar el menu de la cabecera se
abre la MISMA hoja modal que en el movil —una rejilla de nueve casillas
centrada, con su tirador y su boton de cerrar— en una ventana de 1900 px. Detras
hay sitio de sobra y no se usa.

**Medido**: `RejillaDeSecciones` se pinta identica en los dos sitios; lo unico
que cambia es QUE secciones entran (`FUERA_DE_LA_BARRA` en el movil, las nueve
en tableta y escritorio). El contenedor es `Sheet` con `forma="panel"`.

**A decidir en la maqueta**: si en escritorio las secciones dejan de estar tras
un menu —hay hueco en la cabecera para mas de seis— o si el menu se queda pero
con forma de web (desplegable anclado al boton, no hoja modal centrada).

## 46. WEB · Las tablas de resultados no se parecen entre si, y en web son pobres

**HECHO** (2026-09-14). Una sola fila para las cuatro, con dorsal, foto y las dos
banderas. Ver el REGISTRO DE AVANCE.

**Lo que dice el usuario**: la carrera se ve bien en la PWA pero no tanto en web;
la clasificacion igual; **las practicas libres son «bastante pobres para todos
los dispositivos»**. Y pregunta por que en una hay foto y en otra no.

**La respuesta a su pregunta, leida del codigo — y no es la que yo suponia**:
nadie eligio iniciales para la web. La tabla de escritorio de
`RaceDetailClient` pinta a mano un circulo de 40 px con el **codigo de tres
letras** sobre `bg-primary/20`, y **nunca pide la foto**. El podio, en esa misma
pantalla y justo encima, si usa la foto de verdad. Son dos componentes escritos
en momentos distintos que nunca se reconciliaron.

(`DriverAvatar` de `OptimizedImage.tsx` tambien tiene un respaldo de iniciales,
pero solo salta cuando falta `src`. No es lo que se ve en la tabla.)

**Lo que hay que resolver, y va junto**:
- Que las cuatro pantallas de sesion —carrera, clasificacion, sprint y las tres
  practicas— **se lean como la misma familia**.
- Que en escritorio se use el sitio que hay: hoy la tabla de practicas son dos
  columnas de tarjetas con codigo, equipo y tiempo, y poco mas.
- Que enriquecerlas tenga sentido por sesion: una practica NO es un resultado
  —eso ya se dice en pantalla— asi que lo que se añada no puede sugerir que lo
  sea.

## 47. WEB · Ocupamos mas ancho del que usa este tipo de aplicacion

**HECHO** (2026-09-14). Uno solo para toda la app: **1280**. Ver el REGISTRO DE
AVANCE.

**Lo que dice el usuario**: navegando otras webs del ramo ve que ApexData ocupa
mucho mas ancho del habitual.

**Medido**: `tailwind.config.ts` **no configura `container`**, asi que se usa el
de serie: ancho maximo el del punto de ruptura, o sea **1536 px** a partir de
`2xl`. Se usa `container mx-auto` en 32 sitios del arbol de paginas. Los sitios
de datos deportivos suelen quedarse entre 1200 y 1280.

**A decidir**: el ancho maximo, y si es uno solo para toda la app o depende de
la pantalla —una tabla de resultados aguanta mas ancho que un texto—. Se cambia
en un sitio (`theme.container`), asi que lo caro no es hacerlo sino elegirlo.

## 48. UI · En Clasificacion, el grafico gigante va antes que los pilotos

**HECHO** (2026-09-14). Pilotos primero, constructores en columna de contexto y el
grafico debajo. Ver el REGISTRO DE AVANCE.

**Lo que dice el usuario**: «lo que uno quiere ver principalmente cuando entra en
este apartado son los pilotos y no un grafico gigante», y da igual el
dispositivo.

**Medido**: en `src/app/standings/page.tsx` la «Evolucion del campeonato» se
pinta sobre la linea 187 y los campeonatos de Pilotos y Constructores sobre la
277. O sea: el grafico primero, las tablas despues.

**A decidir**: el orden, y si el grafico se queda entero, se encoge, o se pliega.
Y el usuario pide ademas **una propuesta para enriquecerlo**.

---

## 44. CONSULTA RESUELTA · Que lleva la fila, y si cambia al girar (2026-09-14)

**Lo que pregunta el usuario**: «para el modo vertical solo mostrar los
compuestos de llantas, y cuando este girada la pantalla si muestre todo, o en
web tambien se podria?».

**Primero, una correccion al modelo mental**: en la app **un telefono tumbado no
es escritorio**. El `pc:` pide `min-height: 500px` y tumbado el iPhone mide 390
de alto — se puso a proposito, es el punto 34. Girado se usa el reparto de
movil con la fila a lo ancho de toda la pantalla.

**Medido**: holgura que le queda al nombre del equipo en cada sitio real, con
el peor caso posible (los 22 con tres paradas):

| sitio | ancho de fila | B | C | D |
|---|---|---|---|---|
| iPhone de pie | 358 | 109 px | 77 px | 46 px |
| Android de pie | 328 | 79 px | 47 px | 16 px |
| iPhone tumbado (pantalla completa) | 812 | 563 px | 531 px | 500 px |
| escritorio 1180 (torre en el suelo de 340) | 312 | 63 px | 31 px | **0 px** |
| escritorio 1920 (torre en 399) | 371 | 122 px | 90 px | 59 px |

**Nada se recorta en ningun sitio**, ni siquiera la D. Y el caso apretado **no
es el movil de pie: es el escritorio a 1180**, donde la torre se queda en el
suelo del `clamp`. Girado es el sitio con MAS espacio de los cinco.

O sea que esconder columnas en vertical no compra sitio donde hace falta, lo
compra donde sobra. Y una fila que cambia de contenido al girar es una fila que
hay que aprenderse dos veces.

**Recomendado**: la misma fila en los tres sitios. Si ademas se quiere el
contador de paradas, que sea un numero (`2`) y no los puntitos: no crece con
cada parada, y ese 0 px de la tabla deja de ser un 0.

**DECIDIDO POR EL USUARIO (2026-09-14): NO se integra, la fila se queda como
esta.** Y no por sitio, que ya vimos que sobra, sino por valor:

> «no me gusta C porque no me da todo lo que me gusta, ya que necesito toda la
> informacion no solo algunas [...] evaluando bien he decidido que por el
> momento ya no integrar mas, porque si bien es info valiosa, **al ser una
> repeticion le quita peso; sin embargo si fuese en vivo ahi si que seria info
> crucial**».

Es un criterio de producto, no de diseno, y conviene no perderlo: **el
neumatico, las paradas y el «en boxes» valen lo que valen porque no sabes lo
que va a pasar**. En una repeticion el final ya esta escrito, asi que el dato
que anticipa una parada no anticipa nada.

**GUARDADO COMO PASO FINAL**, listo para retomar sin repetir trabajo:

- La maqueta con las cuatro opciones: `mockups/09-la-fila-y-el-alto.html`.
- El dato ya comprobado contra produccion: el servicio sirve por vuelta
  `Compound`, `TyreLife`, `Stint`, `PitInTime` y `PitOutTime`, o sea que «en
  boxes» **no hay que adivinarlo por geometria** — se sabe entre el PitIn y el
  PitOut. Endpoint: `/api/laps/{year}/{round}/R/stints`.
- La paleta ya existe: `COMPOUND_COLORS` en `src/lib/team-colors.ts`.
- La tabla de holguras de arriba, para no volver a medirla.

**Cuando se retome**: el disparador natural es el dia que haya **timing en
vivo**. Ahi esto deja de ser adorno. Y si se retoma antes, que el contador de
paradas sea un numero y no puntitos, por el 0 px del escritorio a 1180.
