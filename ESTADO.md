<!-- GENERADO POR `npm run estado`. NO SE EDITA A MANO. -->
<!-- Cambiarlo aquí no cambia nada: lo reescribe el script y una prueba lo compara. -->

# Estado de ApexData, leído del código

> **Este es el único documento que no puede quedarse viejo**, porque no lo
> escribe nadie: cada línea es una sonda sobre el repositorio, en
> `scripts/estado.ts`. Si el código cambia y esto no se regenera, la prueba
> `tests/estado.test.ts` falla y el CI se pone en rojo.
>
> `MEJORAS-PENDIENTES.md` dice **qué reportó el usuario**.
> `PROGRESO_RELANZAMIENTO_2026.md` dice **qué se hizo y por qué**.
> Este dice **cómo está el código ahora mismo**. Para saber si algo sigue
> pendiente, se mira este.

| Qué | Cómo está | Dónde se comprueba |
|---|---|---|
| 22 · Radios de equipo en el replay | PENDIENTE — ⚠️ abre la CSP a `livetiming.formula1.com`: hay que avisar al usuario ANTES | `team_radio` en el cliente de OpenF1 · `livetiming` en `src/lib/csp.ts` |
| 18-bis · Los avisos de práctica, ¿salen por FastF1? | PENDIENTE — siguen por OpenF1, a los ~50 min. Medida limpia esperando a Azerbaiyán | `fastf1Puede` en `src/lib/push/avisos-de-sesion.ts` |
| La maqueta de pruebas, ¿retirada de producción? | HECHO | `public/maqueta/` |
| Pruebas de componente con jsdom | PENDIENTE — decisión del usuario: «al final de todo» | `jsdom` en `package.json` · `environment` en `vitest.config.mts` |
| La foto de la cuenta de Google, ¿se ve? | NO, y es decisión suya: enseñarla obliga a abrir la CSP a `lh3.googleusercontent.com` | `img-src` en `src/lib/csp.ts` |
| El servicio de telemetría, ¿se despliega solo? | SÍ, desde el 2026-08-24 (`e892dff`). El CI dispara `EASYPANEL_SERVICE_HOOK` cuando el push toca `python-service/`. **NO pedir un Deploy a mano.** Si el secreto faltara, el paso dejaría dos avisos en la ejecución | `.github/workflows/ci.yml`, paso «Desplegar el servicio de telemetría» |
| Las cuentas, ¿están disponibles? | SÍ — Google y correo, con los favoritos sincronizados | `src/lib/auth.ts` · `src/lib/cuentas/` |

## Al volver de la otra máquina

Antes de opinar sobre qué falta, reconciliar lo que entró:

```
git log --format="%h|%ad|%s" --date=short --since="<último día que conozco>" \
  | grep -E "\|(feat|fix|perf)"
```

y mapear **cada línea** a su punto. El mapa del 10 al 14 de septiembre está
en `SIGUIENTE-SESION.md`; se amplía, no se rehace.
