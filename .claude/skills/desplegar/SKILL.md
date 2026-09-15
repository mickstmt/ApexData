---
name: desplegar
description: Despliega ApexData y verifica el cutover en producción. Úsala al subir cambios. El servicio de telemetría SÍ se despliega solo desde el 2026-08-24; solo hace falta pulsar Deploy a mano si el CI deja un aviso de que falta el secreto.
---

# Desplegar ApexData

## La web: automática

`git push origin main` → GitHub Actions (lint, tipos, unitarias, build, y las
pruebas de navegador) → webhook de EasyPanel → cutover.

**Nunca dispares el webhook a mano.** Y si el CI falla, el job de despliegue se
salta: producción se queda con el build anterior, aunque el código ya esté en
el repo.

Verificar el cutover comparando el `buildId`, no por uptime:

```bash
curl -s https://apexdata.meeks.fun/api/health
# {"status":"healthy","buildId":"…","database":"ok","telemetryService":"ok"}
#
# `telemetryService` dice si el servicio RESPONDE, no si la variable existe:
# `ok`, `sin-respuesta` o `no-configurado`. Como el servicio no tiene dominio,
# esta es la única forma de saber desde fuera si está en pie.
```

## El servicio de telemetría

Desde el 2026-08-24 el CI **también lo despliega**, pero solo cuando
`python-service/` cambia, y antes que la web. Depende del secreto
`EASYPANEL_SERVICE_HOOK`: si no está puesto, el paso deja un `::warning::` en el
CI y **hay que pulsar *Deploy* a mano**. Mira el resumen del run para saber cuál
de las dos cosas pasó.

Comprueba SIEMPRE que entró, no lo des por hecho — comparar contra producción es
lo único que vale:

```bash
# Firma del código nuevo: una vuelta por piloto, sin repetidos.
curl -s "https://apexdata.meeks.fun/api/laps/2026/12/FP1/fastest?limit=7"
```

Usa un `limit` que no se haya pedido antes: el servicio cachea por clave, y
repetir uno viejo puede devolver una respuesta anterior y hacer creer que el
despliegue falló.

En su consola, la primera línea al arrancar es la prueba:
`ApexData Telemetry vX desplegado y arrancado: … UTC (… hora de Lima)`.

### Si hay que pulsarlo a mano

1. panel.dittochatbot.com
2. Proyecto **`ditto`** → app **`apexdata-telemetry`** (no `apexdata`, que es la web)
3. Pestaña **Deployments** → **Deploy**

**Solo si el CI dejó ese aviso.** Esta sección contradecía al principio del
fichero —decía «la web se despliega sola y el servicio no»— y el 2026-09-15 se
le pidió al usuario un Deploy a mano que no hacía falta. El CI dispara el del
servicio **antes** que el de la web justamente para que no exista esa ventana.

Antes de pedirle nada: `npm run estado` lo dice en una línea, y en la ejecución
del CI el paso «Desplegar el servicio de telemetría» sale en verde y **sin
anotaciones** cuando el secreto está puesto.

Su Build Path es `/python-service` con File `/Dockerfile` — no la raíz: el
`.dockerignore` de la raíz excluye esa carpeta entera.

## Si el CI falla

Los logs y los artefactos exigen autenticación, pero esto sí funciona sin ella:

```bash
curl -s "https://api.github.com/repos/mickstmt/ApexData/actions/runs?per_page=3"
curl -s "https://api.github.com/repos/mickstmt/ApexData/actions/runs/<id>/jobs"
```

Da el job y el paso que fallaron. Para el detalle, pídeselo al usuario.
