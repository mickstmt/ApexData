---
name: empezar-sesion
description: Abre una sesión de trabajo en ApexData — reconciliar lo que entró desde la otra máquina y leer el estado del código antes de opinar sobre qué falta. Úsala SIEMPRE al empezar, y antes de contestar cualquier pregunta sobre pendientes.
---

# Empezar una sesión en ApexData

Este proyecto se trabaja desde **dos máquinas** (casa y oficina) con sesiones
distintas. Llegar sin reconciliar lo que hizo la otra es el fallo que más caro
ha salido, y no una vez.

## Por qué existe esta skill

El 14 y el 15 de septiembre de 2026, en una sola sesión, se le dijo al usuario
cuatro cosas falsas seguidas:

1. Que quedaban **seis puntos pendientes**, cuando cinco estaban hechos —el aro
   del líder, los anillos del abandono, el tirador del mapa, las sesiones
   vacías y el delta con todos parados—.
2. Que había que **esperar al siguiente fin de semana** para verificar la
   carrera de fuentes, cuando la sesión que la cerraba había corrido dos días
   antes y se cerró leyendo `/api/fuentes` en un minuto.
3. Que **quedaba un solo punto**, contando sobre un índice con agujeros —los
   números 27, 29, 30 y 31 no existen, y lo que nunca llevó número está en
   prosa—.
4. Que había que **pulsar Deploy a mano** en el servicio de telemetría, que se
   despliega solo desde el 2026-08-24.

Las cuatro salieron de leer un documento en vez de el código. Su respuesta a la
última: «cómo me vas a decir que no se despliega solo si tú mismo me hiciste los
pasos».

## 1. Lo primero, antes de leer ningún documento

```bash
git status                                   # ¿hay trabajo local sin subir?
git fetch origin && git log --oneline HEAD..origin/main
git pull --ff-only && npm ci
```

Si `git status` enseña algo, **decírselo al usuario antes de seguir**. No se
descarta nada por cuenta propia.

## 2. El estado real, que no se lee: se ejecuta

```bash
npm run estado
```

Imprime `ESTADO.md`, que **no lo escribe nadie**: cada línea es una sonda sobre
el repositorio (`scripts/estado.ts`) y una prueba compara el fichero con lo que
sale al ejecutarlo. Es el único documento que no puede quedarse viejo.

## 3. Reconciliar lo que entró de la otra máquina

```bash
git log --format="%h|%ad|%s" --date=short --since="<último día que conozco>" \
  | grep -E "\|(feat|fix|perf)"
```

Y mapear **cada línea** a su punto. No es opcional: el 14 de septiembre habían
entrado **51 commits funcionales** desde el día 10 y no se reconcilió ninguno.
El mapa del 10 al 14 ya está hecho en `SIGUIENTE-SESION.md`; se amplía.

## 4. Qué documento sirve para qué

| Documento | Para qué sirve | Para qué NO |
|---|---|---|
| `ESTADO.md` | Saber **cómo está el código ahora**. Generado | — |
| `PROGRESO_RELANZAMIENTO_2026.md` | Saber **qué se hizo y por qué**. Entradas nuevas **arriba** | Saber si algo sigue pendiente: también se olvida |
| `MEJORAS-PENDIENTES.md` | Saber **qué reportó el usuario**, con sus palabras | Saber si está resuelto. **Nunca** |
| `SIGUIENTE-SESION.md` | El traspaso de la última sesión | — |

## 5. La regla que resume todo

**Antes de decirle al usuario que algo está pendiente, buscarlo en el código.**
No basta con no encontrarlo tachado en un documento. Y antes de repetir una
condición escrita en futuro («la prueba llega con la FP3 del sábado»),
**comparar su fecha con hoy**: caducan solas.
