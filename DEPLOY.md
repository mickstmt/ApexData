# Guía de despliegue — ApexData

> **Punto único de despliegue: `git push origin main`.**
> El flujo es: push → GitHub Actions corre lint, tipos y build → si pasan,
> dispara el webhook de EasyPanel → EasyPanel construye la imagen y reinicia
> el contenedor → CI comprueba en `/api/health` que el contenedor nuevo es el
> que está sirviendo. **Ningún paso manual desde tu máquina.**

Mismo patrón que [plastik](../../typscript/plastik/DEPLOY.md), en el mismo VPS
(panel de EasyPanel en `panel.dittochatbot.com`).

---

## Arquitectura en producción

| Pieza | Dónde | Notas |
|---|---|---|
| Web (Next.js + PWA) | App de EasyPanel, imagen desde el `Dockerfile` de la raíz | Puerto 3000 |
| Telemetría (FastAPI + FastF1) | App de EasyPanel aparte, `python-service/Dockerfile` | Puerto 8000, **necesita volumen** para el caché |
| Base de datos | Supabase (AWS us-east-1) | No se toca |

La web funciona **sin** el servicio de telemetría: si `FASTF1_SERVICE_URL` no
está configurada, esa sección avisa de que está pendiente y el resto va
normal. Se puede desplegar la web primero y añadir la telemetría después.

---

## Configuración inicial (una sola vez)

### 1. App de la web

En EasyPanel, dentro del proyecto donde vive plastik:

1. **Create → App**, nombre `apexdata`.
2. **Source**: GitHub, repositorio `mickstmt/ApexData`, rama `main`.
3. **Build**: Dockerfile, ruta `./Dockerfile`.
4. **⚠️ Desactiva el auto-deploy / la integración nativa con GitHub.**
   Es la lección que costó cara en plastik: si EasyPanel construye por su
   cuenta al detectar el push *y además* llega el webhook de CI, la segunda
   construcción **cancela la primera a medias**. El log muere sin error propio
   (`context canceled`) y parece falta de memoria, pero no lo es. Se reconoce
   porque cada push aparece dos veces en el historial: una de ~4 min y otra de
   pocos segundos.
5. **Domains**: añade el dominio (por ejemplo `apexdata.izistoreperu.com`) con
   HTTPS activado. El puerto interno es `3000`.
6. **Environment**: ver la tabla de variables más abajo.

### 2. App del servicio de telemetría

1. **Create → App**, nombre `apexdata-telemetry`.
2. **Source**: mismo repositorio y rama.
3. **Build**: Dockerfile, ruta `./python-service/Dockerfile`.
4. **Volumes**: monta un volumen en `/app/cache` — **imprescindible**. FastF1
   descarga cientos de MB por sesión; sin volumen persistente cada reinicio
   obliga a descargarlo todo otra vez y las consultas tardan minutos.
5. **Domains**: puerto interno `8000`. Puede ser un subdominio propio o quedar
   accesible solo por la red interna del proyecto.
6. **Environment**: `CORS_ORIGINS` con el dominio de la web.

### 3. Variables de entorno de la web

| Variable | Valor | Notas |
|---|---|---|
| `DATABASE_URL` | Cadena del pooler de Supabase | Añade `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Cadena directa de Supabase (puerto 5432) | La usan las migraciones; el pooler no las soporta |
| `NEXT_PUBLIC_JOLPICA_API_URL` | `https://api.jolpi.ca/ergast/f1` | |
| `NEXT_PUBLIC_OPENF1_API_URL` | `https://api.openf1.org/v1` | |
| `NEXT_PUBLIC_APP_URL` | La URL pública de la web | |
| `FASTF1_SERVICE_URL` | URL interna del servicio de telemetría | Opcional: sin ella esa sección queda desactivada |

### 4. Conectar el webhook con GitHub

1. En EasyPanel, dentro de la app `apexdata`, busca **Deploy webhook** (o
   "Deployment → Webhook URL") y cópiala.
2. En GitHub: repositorio → **Settings → Secrets and variables → Actions**.
3. **New repository secret**: nombre `EASYPANEL_DEPLOY_HOOK`, valor la URL.
4. En la pestaña **Variables** del mismo sitio, crea la variable `APP_URL` con
   la URL pública (por ejemplo `https://apexdata.izistoreperu.com`). Si no
   existe, CI se salta la comprobación de cutover en lugar de fallar.

**Nunca dispares el webhook desde tu terminal**: quedaría en el historial y
cualquiera podría lanzar despliegues, además de que construiría el commit que
EasyPanel tenga en ese momento, no necesariamente el que crees.

---

## El día a día

```bash
# 1. Sincronizar SIEMPRE antes de empezar (trabajas desde casa y oficina)
git fetch origin
git status -sb          # ¿dice "## main...origin/main" sin diverge? estás al día

# 2. Cambios + validación local
npm run lint
npm run type-check
npm run build

# 3. Push: CI despliega solo
git add <archivos>
git commit -m "..."
git push origin main

# 4. Verificar (~5-12 min)
curl -s https://<tu-dominio>/api/health
```

`/api/health` devuelve `buildId` y `startedAt`. Para saber si tu código está
realmente sirviendo, compara `buildId` con el de tu build local
(`cat .next/BUILD_ID`). El tiempo de arranque solo dice que algo reinició, no
qué código reinició.

---

## Cuando algo falla

| Síntoma | Causa probable |
|---|---|
| El build muere ~min 3-4 sin error, `context canceled` | Doble despliegue: la integración nativa de EasyPanel quedó activada |
| `JavaScript heap out of memory` | Falta RAM de verdad. Baja el tope del `Dockerfile` o libera memoria en el VPS |
| CI falla en "Wait for cutover" pero la app se ve bien | Revisa que `APP_URL` apunte al dominio correcto y que `/api/health` responda |
| La app carga pero la telemetría da 503 | Normal si `FASTF1_SERVICE_URL` no está configurada; revisa la app de telemetría |
| `/api/health` responde 503 con `database: error` | Supabase pausado por inactividad, o credenciales mal |

### Volver atrás

**Opción 1 (recomendada)**: `git revert <commit>` y push. CI vuelve a
desplegar con el estado anterior.

**Opción 2**: en EasyPanel, pestaña *Deployments* de la app, elegir un
despliegue anterior y hacer redeploy de esa imagen — sin reconstruir.

---

## Mantener los datos al día

Pendiente de montar (Sprint 5): un cron de GitHub Actions los lunes que
ejecute los seeds de la última carrera y llame al servicio de telemetría para
precalentar su caché. De paso evita que Supabase pause el proyecto por
inactividad, que ya ocurrió una vez.

Mientras tanto, a mano:

```bash
npm run seed:season -- 2026
npm run seed:standings -- 2026
```
