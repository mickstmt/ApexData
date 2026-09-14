# Guía de pruebas — lo hecho el 12 y 13 de septiembre de 2026

> Escrita para el usuario, para probar en su iPhone y en el navegador. Cada
> punto dice **qué tocar**, **qué tiene que pasar** y **qué se medía antes**, que
> es lo que permite saber si algo sigue mal en vez de fiarse de la impresión.
>
> Todo lo de aquí está en producción: **apexdata.meeks.fun**. Si algo no cuadra,
> lo primero es cerrar la app instalada y volver a abrirla — el trabajador de
> servicio puede estar sirviendo la versión anterior.

---

## Cómo usar esta guía

Cada bloque es independiente. No hace falta hacerlos en orden ni de una vez.

- ✅ significa **lo que tiene que pasar**
- ❌ significa **lo que pasaba antes**, para reconocerlo si vuelve

Donde hay un número medido, está puesto. Si ves algo distinto a lo que dice
aquí, es un fallo nuevo y merece la pena contarlo.

---

# 1 · El replay: el final de una carrera

**Dónde**: `Resultados` → un Gran Premio → `Ver la carrera`.
**Con qué carreras**: Italia y España son las buenas para esto.

### 1.1 · El orden se congela al caer la bandera

**Qué tocar**: lleva el deslizador **hasta el final del todo**.

✅ La clasificación **ya no cambia** aunque los coches sigan rodando la vuelta
de celebración, y coincide **fila a fila** con el resultado oficial.
✅ Cada piloto lleva una **banderita a cuadros detrás de su tiempo** en cuanto
cruza la meta. Aparecen **una a una**, no todas de golpe.
✅ A los doblados les dice **«+1 vuelta»**, no segundos.
✅ Los retirados siguen con **OUT** y sin banderita.

❌ Antes el replay terminaba con un orden que no era el de la carrera. Medido
contra el resultado oficial: **8 fallos de 10 en Hungría, 5 en Países Bajos, 4
en Italia**. En Italia el podio oficial era ANT-RUS-VER y el replay daba
VER-NOR-ANT.

### 1.2 · Los abandonos falsos al relanzar

**Dónde**: **Italia**, que tuvo bandera roja.
**Qué tocar**: lleva el deslizador al **minuto 35** y déjalo correr hasta el 40.

✅ No sale **ningún** aviso de abandono ahí, y la lista no se llena de OUT.
✅ El aviso de LEC sale en el **minuto 4:42**, que es cuando de verdad se queda
fuera, y dice **`DNF · LEC`** con su código.

❌ Antes, en el 35:32 salían **veintiún avisos de golpe** —la parrilla entera— y
otros cinco al relanzar. La torre se llenaba de OUT.

### 1.3 · La bandera roja dura lo que dura

**Dónde**: **Italia**, entre el minuto 4 y el 35.

✅ El cartel de arriba dice **BANDERA ROJA** durante toda la parada, el circuito
se pinta de rojo, y la barra de progreso enseña esa franja roja entera.

❌ Antes decía **BANDERA AMARILLA** durante **veinte minutos** con todos los
coches en el garaje. El dato oficial declara sólo 103 segundos de roja; la
parada real fueron 1819.

### 1.4 · Quien sale desde el pit lane

**Dónde**: **España**, donde BEA salió del pit lane.
**Qué tocar**: ponte al **principio del todo** y mira la lista.

✅ BEA aparece **el último**, no primero.

❌ Antes figuraba **líder durante doce segundos**. El pit lane está por delante
de la línea de meta, así que proyectado sobre el circuito salía por delante de
toda la parrilla.

---

# 2 · Los mandos del replay

### 2.1 · Los botones

**Dónde**: el replay en el teléfono, de pie.

✅ Los mandos son **sólo iconos**, sin pastilla de fondo. El de reproducir es el
único con color.
✅ Al pulsar uno aparece **un fondo translúcido** detrás, y se va al soltar.
✅ Ya **no pone «10 s»** escrito. Al pulsar, el destello del centro dice el salto
real — a dos segundos del final dice «+2 s», no «+10 s».

### 2.2 · El deslizador fino

**Qué tocar**: arrástralo.

✅ Está **encima de los botones**, muy fino, y se puede arrastrar con el pulgar
aunque se vea delgado.
✅ Tiene las **bandas de color** del estado de pista: rojo donde hubo bandera
roja, naranja donde hubo coche de seguridad.

❌ Antes no había ninguno en vertical: la única forma de moverse era de diez en
diez segundos.

---

# 3 · La pantalla completa

**Dónde**: el replay en el teléfono, de pie. El botón de expandir está **arriba
a la derecha del circuito**.

### 3.1 · Con el giro automático ACTIVADO

**Qué tocar**: pulsa expandir y **gira el teléfono**.

✅ Sale el aviso animado —el teléfono con las flechas— y **se cierra solo** en
cuanto giras. No hay que darle a Salir.
✅ Entra la pantalla completa con el circuito grande.

### 3.2 · Con el giro automático BLOQUEADO

**Qué tocar**: pulsa expandir y **espera sin girar**.

✅ A los **cuatro segundos** aparece: «¿No gira? Puede que tengas el bloqueo de
rotación puesto.»
✅ El aviso es **translúcido** — se ve el replay por detrás.
✅ Con «Salir» vuelves al replay normal.

❌ Antes, pulsar expandir de pie metía el reparto horizontal en una pantalla
vertical: la lista cortada por la derecha, el circuito aplastado y la barra de
progreso escondida bajo el menú.

### 3.3 · Salir estando tumbado

**Qué tocar**: con el teléfono girado, sal de la pantalla completa.

✅ Queda el replay **de móvil**, con la lista a lo ancho y las filas grandes.

❌ Antes aparecía la **versión de escritorio** —con la cabecera del sitio y el
mapa diminuto— porque un teléfono tumbado mide 844 px y la app se creía un
ordenador.

### 3.4 · El botón se deja pulsar

✅ El botón de expandir **responde**, no se queda debajo de la hora y el wifi.

❌ Antes la cabecera del modo completo se metía bajo la barra de estado del
iPhone y el botón no se podía tocar.

---

# 4 · La barra de abajo

### 4.1 · El realce enciende lo que pisa

**Qué tocar**: desde **Inicio**, pulsa **Más** — es el viaje más largo.

✅ Las pestañas por las que pasa el realce **se van encendiendo** mientras las
cruza, y se apagan al salir.
✅ El viaje dura lo suficiente para verse: con la curva elegida, el recorrido
ocupa **432 ms de los 720**, casi el doble que antes.

### 4.2 · Los toques

**Qué tocar**: toca rápido, y también cerca del borde de la barra.

✅ El borde de la píldora y la franja hasta el borde de la pantalla **también
responden**.

❌ Medido antes: **el 25 % de la barra no respondía**, y contando la franja de
abajo, el 43 %. Era justo donde cae el pulgar.

### 4.3 · El doble toque

**Qué tocar**: toca dos veces seguidas cualquier botón de la app.

✅ **No se amplía** la página, y el botón responde al instante.

❌ Antes iOS reservaba el doble toque para ampliar y esperaba ~300 ms en cada
botón.

---

# 5 · El escritorio

**Dónde**: el replay en el navegador del ordenador.

✅ La lista de pilotos ocupa **una cuarta parte** del ancho, no una columna
estrecha perdida al lado de un mapa enorme.
✅ El conjunto **se para donde se para el resto de la app** (1536 px) y queda
centrado.
✅ Los coches **se ven más grandes** en pantallas grandes.

❌ Medido antes: la lista estaba clavada en 339 px pasara lo que pasara, así que
en una pantalla de 2560 se quedaba en el **13 %** del ancho. Y los coches medían
6 px siempre, o sea que cuanto más grande el mapa, más pequeños se veían.

---

# 6 · Los avisos

### 6.1 · Cuándo llegan

**Cuándo probarlo**: el próximo fin de semana de carrera — **Azerbaiyán**.

✅ El aviso de **la carrera** debería llegar en unos **doce minutos** desde la
bandera a cuadros.

❌ El del GP de España llegó **cincuenta minutos** después: 35 de espera
obligatoria por OpenF1, 12 hasta que publicaron, y el barrido.

Ojo: **las prácticas siguen como antes**, sobre los 50 minutos. FastF1 no
publica clasificación de prácticas —devuelve las filas con la posición vacía— y
eso está pendiente de decidir con una medida honesta.

### 6.2 · El «from ApexData»

**No se puede quitar.** Lo pone iOS como fuente del aviso, igual que con
cualquier app nativa. Comprobado: no hay ningún campo de subtítulo en lo que
enviamos, y la cadena no aparece en ningún archivo del proyecto.

---

# 7 · La portada

**Cuándo probarlo**: justo después de la próxima carrera.

✅ Si los resultados oficiales tardan, la portada dice **«Spanish Grand Prix ·
ya se corrió, los resultados todavía no han llegado»** en vez de enseñar la
carrera anterior.

❌ A las cuatro horas del GP de España decía «próxima carrera: Azerbaiyán» y
justo debajo «último resultado: **Italian Grand Prix**», mientras el teléfono ya
tenía un aviso nuestro diciendo quién había ganado en España.

---

# Lo que NO está hecho, y por qué

- **Las radios de equipo** (punto 22). Abre la CSP a un dominio de la F1 y no se
  ha tocado: hay que avisar antes.
- **Cuentas y favoritos entre dispositivos** (punto 17). Es lo más grande de
  todo lo que queda.
- **Las prácticas por FastF1** (punto 18). Esperando un fin de semana con la
  sonda ya corregida.
- **El mini-reproductor del replay**, tipo imagen en imagen. Idea del usuario,
  apuntada, sin evaluar.
- **Pruebas de componente** con jsdom. Decisión suya: al final de todo.
