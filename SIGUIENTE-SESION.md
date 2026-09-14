# Para la sesión de mañana (oficina) — al 2026-09-14

> **Cómo usar esto**: abre Claude Code en la carpeta del proyecto y dile
> *«lee SIGUIENTE-SESION.md y seguimos»*. Todo lo que necesita saber está aquí
> o enlazado desde aquí.

---

## 1 · Dónde estamos

**Todo lo del 12, 13 y 14 está en producción y verde**, desplegado en
**apexdata.meeks.fun**.

```
497 pruebas unitarias        verde
168 pruebas de navegador     verde (1 saltada)
tipos y lint                 limpios
```

Los tres documentos que cuentan la historia:

- **`MEJORAS-PENDIENTES.md`** — los 44 puntos con su estado y lo medido en cada
  uno. Es la fuente de verdad.
- **`PROGRESO_RELANZAMIENTO_2026.md`** — la bitácora, día a día. Las entradas 66
  y 67 son las del 13 y el 14.
- **`GUIA-DE-PRUEBAS-2026-09.md`** — qué tocar y qué tiene que pasar, para
  probar en el teléfono.

---

## 2 · LO MÁS GRANDE QUE QUEDA: el login (puntos 17 y 17-bis)

Va primero y con sección propia porque es, con diferencia, la pieza mayor de
todo lo pendiente — y porque en la lista anterior quedó escondida al final de
una línea, que fue un error de presentación.

**La pregunta del usuario, literal**: «¿es viable un módulo de login?» — por
Gmail, por Apple, o propio. No es solo cómo sincronizar: quiere saber si merece
la pena montarlo.

**Lo ya comprobado (hecho, no supuesto)**:

- Los favoritos viven **solo en `localStorage`**
  (`src/contexts/FavoritesContext.tsx`).
- En `prisma/schema.prisma` **no hay ningún modelo de usuario**.
- O sea: **no se sincroniza nada**. Ni por IP ni por cuenta. Es por navegador.
- Y hay un problema que él no sabía: en iOS, **la PWA instalada y Safari tienen
  almacenamiento separado**, así que ni en el mismo iPhone comparten favoritos.
  Además `localStorage` se puede borrar si el sistema recupera espacio — hoy
  **los favoritos se pueden perder sin avisar**.

**Respuesta corta ya dada**: sí, viable, y con **Google como único proveedor al
principio**. Apple exige el Apple Developer Program (99 USD/año) y **no es
obligatorio** para una PWA — esa regla es de apps nativas en la App Store.
Login propio significa contraseñas, recuperación y correo transaccional: más
trabajo y más riesgo para una app de uso personal.

**Efecto colateral bueno**: con usuario, las suscripciones push
(`PushSubscription`) se atan a la persona y no al navegador, y los avisos dejan
de depender del dispositivo.

**Lo que falta por hacer**: preparar las **opciones con recomendación** —desde
un simple código de sincronización sin cuentas hasta cuentas de verdad—, con
coste y con lo que implica en privacidad y despliegue. Eso es lo primero de esta
pieza; no se toca código antes.

---

## 3 · Todo lo demás que queda

**Son trece puntos abiertos en total, contando el login.** Cada uno con su
número, para que se puedan cruzar con `MEJORAS-PENDIENTES.md`.

### Bloqueado esperando al usuario (4)

| # | Qué | Qué hace falta de él |
|---|---|---|
| **25** | El delta sigue subiendo con todos parados | **En qué sesión y qué minuto lo vio, y si la píldora decía ROJA o AMARILLA.** Hay dos hipótesis y una es que el código hace justo lo que se decidió. Sin ese dato se arregla a ciegas. |
| **5** | El «from ApexData» del aviso | Ya verificado que **no se puede quitar** (lo pone iOS). Solo queda decidir: dejarlo (recomendado) o renombrar la PWA, que renombra también el icono de la pantalla de inicio. |
| **14-ter** | La barra se come toques | Arreglada la zona muerta —el 25 % de la barra no respondía, 43 % con la franja de abajo— y desplegado, pero él dijo que **seguía igual**. Hace falta saber si sigue pasando ahora. La sospecha está en la navegación. |
| **19** | ¿Brave sirve para la PWA en Android? | La recomendación está dada, pero **no está verificado**: Brave desactiva por defecto los servicios de Google para mensajería push, que es el canal del push web. Hay que instalar la PWA en Brave **en su teléfono** y ver si llega un aviso. |

### Listo para trabajar (6)

| # | Qué | Nota |
|---|---|---|
| **17 + 17-bis** | **El login y los favoritos entre dispositivos** | Ver la sección 2. Lo más grande. |
| **26** | Al encoger el circuito se pierden los cinco primeros | Va a maqueta: cambia el gesto. La cifra a batir es **8 filas enteras**, que es lo que dio el 6+15. Tres salidas ya escritas en el documento. |
| **11 + 12** | Distintivo para el líder, y que abandonos y banderas se noten | El 12 está **a medias**: el `DNF · LEC` ya parpadea tres veces y hace cola. Falta el líder y lo de las banderas. Avisó que **pintar el circuito le gusta y no hay que quitarlo**. |
| **10a** | La barra de progreso no dice en qué minuto estás | Ni dónde estás ni a dónde vas mientras arrastras. Función nueva → maqueta. |
| **3 + 20** | Sesiones que aún no se han corrido: nunca vacías, y encadenadas | Son el mismo diseño, van juntas. |
| **22** | Radios de equipo en el replay | **AVISAR ANTES DE TOCAR**: abre la CSP a `livetiming.formula1.com`. |

### Esperando a que pase algo (3)

| # | Qué | Cuándo |
|---|---|---|
| **18-bis** | Las prácticas por FastF1 | FastF1 **no publica clasificación de prácticas** (devuelve las filas con la posición vacía). La sonda ya está corregida; hace falta un fin de semana real. El próximo es **Azerbaiyán**. |
| — | Que los avisos lleguen en ~12 min | El de España llegó a los **cincuenta**. Punto 6.1 de la guía. |
| **38** | Que la portada no contradiga al aviso | Arreglado, pero hay que verlo en vivo justo después de la próxima carrera. Punto 7 de la guía. |

### Guardado a propósito (no es deuda, es decisión)

- **Punto 44 · neumático, paradas y «en boxes» en la fila.** Decidido el
  2026-09-14: **no se integra por ahora**, y el motivo es de producto — «al ser
  una repetición le quita peso; **sin embargo si fuese en vivo ahí sí que sería
  info crucial**». El disparador para retomarlo es el día que haya timing en
  vivo. Todo el trabajo previo está guardado: la maqueta
  `mockups/09-la-fila-y-el-alto.html`, la tabla de holguras medida, y el dato ya
  comprobado (`Compound`, `TyreLife`, `Stint`, `PitInTime`, `PitOutTime` en
  `/api/laps/{year}/{round}/R/stints`).
- **El mini-reproductor del replay**, tipo imagen en imagen. Idea suya,
  apuntada, sin evaluar.
- **Etiquetar las marcas del deslizador** (cada 10 vueltas). Apuntado, no
  acordado.
- **Pruebas de componente con jsdom.** Decisión suya: al final de todo.
- **Retirar `public/maqueta/`** cuando se cierre el punto 14. Sigue servido en
  producción.

---

## 4 · Reglas de trabajo (no negociables)

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
7. Cuando él dice que va a dar feedback punto por punto, **se escucha todo antes
   de tocar nada**.
8. El servidor de Playwright se **mata** entre tandas, no se reutiliza.
9. **Desplegar antes de pedirle que pruebe.** Ha pasado: pedirle que revise algo
   que seguía sin subir.
10. **Nunca proponer parar.** Eso lo decide él.

Skills del proyecto: `/verificar`, `/desplegar`, `/cerrar-sesion`.

---

## 5 · Por dónde empezaría

**El login (17)**, y el primer paso no es código: son las **opciones con
recomendación**, coste y privacidad. Es lo más grande que queda y lo único que
cambia la arquitectura, así que cuanto antes se decida el camino, menos trabajo
se hace dos veces.

Si él prefiere algo más corto antes, **el 26**: es el único fallo abierto que
rompe algo que dimos por cerrado (el 6+15), no necesita preguntarle nada, y va a
maqueta. El primer paso ahí es **medir cuántas filas enteras se ven en cada
combinación en los tres anchos** — la cifra a batir es 8.

Y en cuanto conteste lo del **25**, ese pasa a ser lo más urgente: es un bug de
datos visible en pantalla.

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
- El CI **no despliega si algún job falla**. Verde o nada.
- Para medir texto recortado, **`scrollWidth` no sirve**: con `text-overflow` el
  navegador recorta el contenido al hueco y siempre da cero. Hay que medir con
  un `Range`.
