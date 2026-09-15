---
name: cerrar-sesion
description: Cierra una sesión de trabajo en ApexData — revisión de código, entrada de bitácora en PROGRESO y push. Úsala antes de terminar cualquier sesión y antes de cada merge.
---

# Cerrar una sesión de trabajo en ApexData

## 1. Revisión, antes de commitear

El método acordado lo exige **antes de cada merge**, y saltárselo ya costó diez
defectos reales en producción en una sola sesión:

- `code-review` sobre el rango de la sesión (`git diff <base>..HEAD`).
- `security-review` si hay superficie nueva: endpoints, rutas de API, entradas.
- `dataviz` **antes** de escribir la primera línea de cualquier gráfico.

## 2. La entrada de bitácora — **no es opcional, la exige el CI**

Un push que toca `src/`, `python-service/app/` o `prisma/` **y no toca
`PROGRESO_RELANZAMIENTO_2026.md` falla el CI** y no despliega. La regla existe
porque dos puntos construidos el 12 de septiembre —el aro del líder y el
tirador del mapa— no quedaron escritos en ninguna parte, y tres días después
otra sesión los dio por pendientes y propuso rehacerlos.

Y si el cambio toca lo que miran las sondas, `npm run estado` y commitear
`ESTADO.md`: hay una prueba que lo compara.


En `PROGRESO_RELANZAMIENTO_2026.md`, arriba de la bitácora. **Enséñale el texto
al usuario antes de escribirlo.** Qué debe contener:

- Qué se hizo y **por qué**, no solo qué archivos cambiaron.
- Los **números medidos** (contrastes, tiempos, tamaños), no adjetivos.
- Lo que se **recorta**, con su motivo, en vez de dejarlo desaparecer.
- Los errores propios y las suposiciones desmentidas: son lo que evita repetirlos.
- Actualizar el estado: fase, tests, deuda técnica, decisiones pendientes.

## 3. Commit y push

Mensaje en español, explicando el porqué. Termina con:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

Después, verifica el cutover (ver la skill `desplegar`).

**NO pidas un Deploy a mano del servicio de telemetría.** Se despliega solo
desde el 2026-08-24 (`e892dff`): el CI tiene un paso que dispara
`EASYPANEL_SERVICE_HOOK` cuando el push toca `python-service/`. Esta frase
decía lo contrario y el 2026-09-15 hizo que se le pidiera al usuario un paso
que no hacía falta. Si alguna vez dudas, míralo: `npm run estado` lo dice, y
en la ejecución del CI el paso «Desplegar el servicio de telemetría» sale en
verde y sin anotaciones.

## Reglas de trato con el usuario

- Paso a paso, esperando confirmación entre pasos.
- No registrar en los documentos decisiones que no ha tomado.
- Referirse a él como "el usuario", nunca por nombre propio.
- Lo visual —UI, UX, animaciones— se propone en **mockup navegable**, no por
  escrito: aprobó a ciegas un indicador descrito en texto y al verlo le pareció
  horrible.
- **Lo que se enseña en una maqueta es lo que se entrega.** Si algo se queda
  fuera, se marca DENTRO de la maqueta, no en el mensaje posterior: él compara
  con la imagen, no con el texto. Falló dos veces.
- **Nunca dar por pendiente lo que no se ha buscado en el código**, ni por
  hecho lo que no se ha comprobado. Ver la skill `empezar-sesion`.
