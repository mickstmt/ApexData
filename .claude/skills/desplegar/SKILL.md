---
name: desplegar
description: Despliega ApexData y verifica el cutover. Úsala al subir cambios a producción, y siempre que el cambio toque python-service/, que NO se despliega solo.
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
# {"status":"healthy","buildId":"…","database":"ok","telemetryService":"configured"}
```

## El servicio de telemetría: MANUAL

Un cambio en `python-service/` **no se despliega con el push**. Hay que pedirle
al usuario que pulse *Deploy*:

1. panel.dittochatbot.com
2. Proyecto **`ditto`** → app **`apexdata-telemetry`** (no `apexdata`, que es la web)
3. Pestaña **Deployments** → **Deploy**

Díselo **explícitamente** cuando el cambio toque esa carpeta, y avisa de qué se
rompe mientras tanto: la web se despliega sola y el servicio no, así que hay una
ventana con la web nueva llamando al servicio viejo.

Su Build Path es `/python-service` con File `/Dockerfile` — no la raíz: el
`.dockerignore` de la raíz excluye esa carpeta entera.

## Si el CI falla

Los logs y los artefactos exigen autenticación, pero esto sí funciona sin ella:

```bash
curl -s "https://api.github.com/repos/mickstmt/ApexData/actions/runs?per_page=3"
curl -s "https://api.github.com/repos/mickstmt/ApexData/actions/runs/<id>/jobs"
```

Da el job y el paso que fallaron. Para el detalle, pídeselo al usuario.
