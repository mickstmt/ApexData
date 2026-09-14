# Para la sesión de mañana (oficina) — al 2026-09-14

> **Cómo usar esto**: abre Claude Code en la carpeta del proyecto y dile
> *«lee SIGUIENTE-SESION.md y seguimos»*. Todo lo que necesita saber está aquí
> o enlazado desde aquí.

---

## 1 · Dónde estamos

**Todo lo del 12, 13 y 14 está en producción y verde.** Último commit de
trabajo: la lista de pilotos que llena su columna en escritorio. CI en verde y
desplegado en **apexdata.meeks.fun**.

```
497 pruebas unitarias        verde
168 pruebas de navegador     verde (1 saltada)
tipos y lint                 limpios
```

Los tres documentos que cuentan la historia:

- **`MEJORAS-PENDIENTES.md`** — los 44 puntos, con su estado y lo medido en cada
  uno. Es la fuente de verdad.
- **`PROGRESO_RELANZAMIENTO_2026.md`** — la bitácora, día a día. Las entradas
  66 y 67 son las de ayer y hoy.
- **`GUIA-DE-PRUEBAS-2026-09.md`** — qué tocar y qué tiene que pasar, para
  probar en el teléfono.

---

## 2 · Reglas de trabajo (no negociables)

Estas no son preferencias, son cómo se trabaja en este proyecto:

1. **Tres entornos siempre**: iPhone 390, Android 360, escritorio ≥1100.
2. **Nada de UI ni animaciones decididas por escrito.** Van a **maqueta
   navegable**, con opciones y una recomendación explícita.
3. **Las maquetas van a `mockups/`**, que se abren en el PC con doble clic.
   `public/maqueta/` (PWA instalable y sin JavaScript, porque la CSP bloquea los
   scripts de archivos estáticos) **solo cuando lo que se mide es el teléfono**:
   áreas seguras, comportamiento táctil de iOS, orientación.
4. **Medir en el navegador antes de afirmar nada.** Si no está medido, no se
   dice.
5. **Cada prueba nueva tiene que fallar sin el arreglo**, y hay que comprobarlo
   de verdad, no suponerlo.
6. **Paso a paso, confirmando antes de avanzar.**
7. Cuando el usuario dice que va a dar feedback punto por punto, **se escucha
   todo antes de tocar nada**.
8. El servidor de Playwright se **mata** entre tandas, no se reutiliza.
9. **Desplegar antes de pedirle que pruebe.** Ha pasado ya: pedirle que revise
   algo que seguía sin subir.
10. **Nunca proponer parar.** Eso lo decide él.

Skills del proyecto: `/verificar`, `/desplegar`, `/cerrar-sesion`.

---

## 3 · Lo que queda, en orden

### Bloqueado esperando al usuario

| # | Qué | Qué hace falta |
|---|---|---|
| **25** | El delta sigue subiendo con todos parados | **En qué sesión y qué minuto lo vio, y si la píldora decía ROJA o AMARILLA.** Sin eso se arregla a ciegas: hay dos hipótesis y una de ellas es que el código hace justo lo que se decidió. |
| **5** | El «from ApexData» del aviso | Ya está verificado que **no se puede quitar** (lo pone iOS). Solo queda decidir: dejarlo así (recomendado) o renombrar la PWA, que también renombra el icono. |
| **14-ter** | La barra se come toques | Arreglada la zona muerta —el 25 % de la barra no respondía, 43 % con la franja de abajo— y desplegado, pero él dice que **sigue igual**. La sospecha está en la navegación, que es lo único que la maqueta no reproduce. Hace falta que diga si sigue pasando ahora. |

### Listo para trabajar

| # | Qué | Nota |
|---|---|---|
| **26** | Al encoger el circuito se pierden los cinco primeros | Va a maqueta: cambia el gesto. La cifra a batir es **8 filas enteras**, que es lo que dio el 6+15. Tres salidas ya escritas en el documento. |
| **11 + 12** | Distintivo para el líder, y que los abandonos y banderas se noten | El 12 está **a medias**: el `DNF · LEC` ya parpadea tres veces y hace cola. Falta el líder y lo de las banderas. Él avisó que **pintar el circuito le gusta y no hay que quitarlo**. |
| **10a** | La barra de progreso no dice en qué minuto estás | Ni dónde estás ni a dónde vas mientras arrastras. Función nueva → maqueta. |
| **3 + 20** | Sesiones que aún no se han corrido: nunca vacías, y encadenadas | Son el mismo diseño, van juntas. |
| **22** | Radios de equipo en el replay | **AVISAR ANTES DE TOCAR**: abre la CSP a `livetiming.formula1.com`. |
| **17 + 17-bis** | Cuentas y favoritos entre dispositivos | Lo más grande de todo lo que queda. |

### Esperando a que pase algo

- **18-bis · las prácticas por FastF1.** FastF1 **no publica clasificación de
  prácticas** (devuelve las filas con la posición vacía). La sonda ya está
  corregida; hace falta un fin de semana de carrera para medirlo honestamente.
  El próximo es **Azerbaiyán**.
- **Los avisos, punto 6.1 de la guía.** El de la carrera debería llegar en unos
  **doce minutos** desde la bandera a cuadros; el de España llegó a los
  cincuenta. Hay que comprobarlo en Azerbaiyán.
- **Punto 7 de la guía · la portada.** Justo después de la próxima carrera, debe
  decir «ya se corrió, los resultados todavía no han llegado» en vez de enseñar
  la anterior.

### Guardado a propósito

- **Punto 44 · neumático, paradas y «en boxes» en la fila.** Decidido el
  2026-09-14: **no se integra por ahora**, y el motivo es de producto, no de
  diseño — «al ser una repetición le quita peso; **sin embargo si fuese en vivo
  ahí sí que sería info crucial**». El disparador para retomarlo es el día que
  haya timing en vivo. Todo el trabajo previo está guardado: la maqueta
  (`mockups/09-la-fila-y-el-alto.html`), la tabla de holguras medida, y el dato
  ya comprobado (`Compound`, `TyreLife`, `Stint`, `PitInTime`, `PitOutTime` en
  `/api/laps/{year}/{round}/R/stints`).
- **El mini-reproductor del replay**, tipo imagen en imagen. Idea suya,
  apuntada, sin evaluar.
- **Etiquetar las marcas del deslizador** (cada 10 vueltas). Apuntado, no
  acordado.
- **Pruebas de componente con jsdom.** Decisión suya: al final de todo.
- **Retirar `public/maqueta/`** cuando se cierre el punto 14. Sigue servido en
  producción.

---

## 4 · Por dónde empezaría yo

**El 26**, y por una razón concreta: es el único fallo abierto que **rompe algo
que dimos por cerrado** (el 6+15), no hace falta preguntarle nada para empezar,
y va a maqueta — que es lo que más tarda en ir y venir, así que conviene tenerla
delante temprano en la sesión.

El primer paso no es dibujar nada, es **medir cuántas filas enteras se ven en
cada combinación en los tres anchos**. La cifra a batir es 8.

Y antes de todo, la pregunta del **25**: en cuanto la conteste, ese pasa a ser
el más urgente, porque es un bug de datos visible en pantalla.

---

## 5 · Cosas del entorno que ahorran media hora

- El servicio de telemetría en local va en **el puerto 8099**, no el 8000, que
  está ocupado por otra app suya:
  `PORT=8099 ./venv/Scripts/python.exe run.py`
- En local **no hay `FASTF1_SERVICE_URL`**; los datos del replay se pueden
  traer de producción con `page.route('**/api/positions/**')`.
- Los **heredocs de bash fallan** con este contenido (acentos, comillas
  angulares). Para editar archivos, script de Python escrito con la herramienta
  de escritura.
- El CI **no despliega si algún job falla**. Verde o nada.
- Para medir texto recortado, **`scrollWidth` no sirve**: con `text-overflow` el
  navegador recorta el contenido al hueco y siempre da cero. Hay que medir con
  un `Range`. Costó una sonda entera hoy.
