@AGENTS.md

# ApexData — lo primero de cada sesión

> Esto lo lee la sesión sola al arrancar. Está aquí para que el usuario **no
> tenga que dar ninguna indicación** al cambiar de máquina.

Este proyecto se trabaja desde **dos ordenadores** (casa y oficina) con sesiones
distintas, y la copia local casi siempre está atrasada. Antes de tocar nada ni
de opinar sobre qué falta:

```bash
git status                       # ¿hay trabajo local sin subir? Preguntar antes de descartarlo
git pull --ff-only && npm ci
npm run estado                   # el estado real, leído del código
```

**Usa la skill `empezar-sesion`**, que lleva el procedimiento completo,
incluida la reconciliación de los commits que entraron de la otra máquina.

Si `ESTADO.md` abre con **«🛑 Antes de proponer trabajo»**, eso es lo primero
que hay que decirle al usuario — antes de listarle tareas que no se pueden
empezar sin su permiso. Ese bloque se genera solo y desaparece solo.

## Qué documento sirve para qué

| Documento | Para qué | Para qué NO |
|---|---|---|
| **`ESTADO.md`** | Saber **cómo está el código ahora**. Lo genera `npm run estado` a partir de sondas sobre el repositorio, y una prueba lo vigila: es el único que no puede quedarse viejo | — |
| `PROGRESO_RELANZAMIENTO_2026.md` | La bitácora: **qué se hizo y por qué**, con lo medido. Entradas nuevas **arriba** | Saber si algo sigue pendiente: también se olvida |
| `MEJORAS-PENDIENTES.md` | **Qué reportó el usuario**, con sus palabras | Saber si está resuelto. **Nunca** |
| `SIGUIENTE-SESION.md` | El traspaso, y lo que un script no puede saber: decisiones suyas pendientes y cosas aplazadas | La lista de pendientes |
| `AUDITORIA_Y_PLAN_RELANZAMIENTO_2026.md` | El plan de fondo, por sprints | El día a día |

## Dos reglas que ya costaron caro

1. **Antes de decir que algo está pendiente, buscarlo en el código.** No basta
   con no encontrarlo tachado en un documento. El 14 y el 15 de septiembre de
   2026 se le dieron al usuario cuatro respuestas falsas seguidas por leer
   documentos viejos, y la última fue pedirle un despliegue manual que el CI
   lleva haciendo solo desde agosto.
2. **Todo lo que se trabaje deja bitácora.** No es una costumbre: un push que
   toca `src/`, `python-service/app/` o `prisma/` sin tocar
   `PROGRESO_RELANZAMIENTO_2026.md` **falla el CI** y no despliega.

Las demás reglas de trato con el usuario —maquetas navegables, un paso por
mensaje, medir en el navegador, avisar antes de abrir la CSP— están en las
skills `empezar-sesion`, `verificar`, `desplegar` y `cerrar-sesion`.
