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

## 2. La entrada de bitácora

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
Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
```

Después, verifica el cutover (ver la skill `desplegar`) y **pide el Deploy
manual del servicio** si tocaste `python-service/`.

## Reglas de trato con el usuario

- Paso a paso, esperando confirmación entre pasos.
- No registrar en los documentos decisiones que no ha tomado.
- Referirse a él como "el usuario", nunca por nombre propio.
- Lo visual —UI, UX, animaciones— se propone en **mockup navegable**, no por
  escrito: aprobó a ciegas un indicador descrito en texto y al verlo le pareció
  horrible.
