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
2. **Source**: pestaña **Git** (no la de *Github*), URL completa
   `https://github.com/mickstmt/ApexData.git`, rama `main`, Build Path `/`.

   La pestaña *Github* usa la integración nativa, que exige un token de cuenta
   configurado en el panel; el de este VPS está caducado y devuelve *"Cannot
   find repository and your Github token is invalid"* aunque el repo sea
   público. La pestaña **Git** clona por HTTPS sin credenciales y, como no
   tiene integración, **no puede haber auto-deploy** — que es justo lo que hay
   que evitar. Es la lección que costó cara en plastik: si EasyPanel construye
   por su cuenta al detectar el push *y además* llega el webhook de CI, la
   segunda construcción **cancela la primera a medias**. El log muere sin error
   propio (`context canceled`) y parece falta de memoria, pero no lo es. Se
   reconoce porque cada push aparece dos veces en el historial: una de ~4 min y
   otra de pocos segundos.

   (Si algún día se usa la pestaña *Github*, hay que apagar **Auto Deploy** a
   mano.)
3. **Build**: Dockerfile, File `/Dockerfile`. El panel lo escribe con barra
   inicial, no `./Dockerfile`.
4. **Domains**: añade el dominio con HTTPS activado y **Port `3000`**.
5. **Environment**: ver la tabla de variables más abajo. **`PORT=3000` es
   obligatoria**: sin ella el contenedor arrancó escuchando en el 80 mientras
   el dominio apuntaba al 3000, y el proxy devolvía 502.

### 2. App del servicio de telemetría

Desplegada el 2026-08-18 en el proyecto `ditto`, junto a la web.

1. **Create → App**, nombre `apexdata-telemetry`.
2. **Source**: pestaña **Git**, mismo repositorio y rama, y **Build Path
   `/python-service`**. Esto último no es opcional: el `Dockerfile` del
   servicio hace `COPY requirements.txt .`, así que su contexto de
   construcción tiene que ser esa carpeta, no la raíz. Además el
   `.dockerignore` de la raíz excluye `python-service` entero, de modo que
   con Build Path `/` no habría ni siquiera código que copiar.
3. **Build**: Dockerfile, File `/Dockerfile` — relativo al Build Path
   anterior, así que **sin** `python-service` delante.
4. **Storage** (en este panel no se llama *Volumes* ni *Mounts*): **Add Volume
   Mount**, Name `cache`, Mount Path `/app/cache` — **imprescindible**. FastF1
   descarga cientos de MB por sesión; sin volumen persistente cada reinicio
   obliga a descargarlo todo otra vez y las consultas tardan minutos. La ruta
   coincide con los valores por defecto de `app/config.py` (`./cache` y
   `./cache/fastf1` sobre un WORKDIR `/app`), así que no hay que declarar
   ninguna variable de caché.
5. **Domains**: **sin dominio**. Decidido el 2026-08-18 dejarlo accesible solo
   por la red interna del proyecto: la web le habla de servidor a servidor, así
   que exponerlo a internet solo añadiría superficie de ataque sobre un
   servicio que todavía no tiene *rate limiting*. Si algún día hiciera falta
   depurarlo desde fuera, añadir el dominio son dos minutos y no obliga a
   reconstruir la imagen.
6. **Environment**:

   ```
   ENVIRONMENT=production
   CORS_ORIGINS=https://apexdata.meeks.fun
   ```

   `ENVIRONMENT=production` es lo que oculta `/docs`, `/redoc` y
   `/openapi.json`. **`PORT` no hace falta** aquí, al revés que en la web: el
   `Dockerfile` fija el 8000 en el propio comando de arranque.

**Para verificarlo** hay que usar la consola de la app (icono `>_`), y ahí la
imagen `python:3.11-slim` **no trae `curl`**. Con Python basta:

```bash
python -c "import urllib.request as u; print(u.urlopen('http://localhost:8000/health').read().decode())"
python -c "import urllib.request as u; u.urlopen('http://localhost:8000/docs')"   # debe dar 404
df -h /app/cache && ls -la /app/cache
```

El 404 de `/docs` es el resultado correcto: confirma que `ENVIRONMENT` llegó.

#### Despliegue automático del servicio

Durante semanas esta app **no tenía despliegue automático**, y eso costó caro:
se subía un cambio bajo `python-service/`, la web se relevaba sola, y el
servicio seguía con el código anterior sin que nada lo dijera. Comprobarlo
contra producción daba «código viejo» y parecía un despliegue fallido cuando en
realidad nunca se había pedido.

Desde el 2026-08-24 el CI lo dispara, **solo cuando `python-service/` cambia**
—la mayoría de los pushes son de la web, y reconstruirlo para nada cuesta
minutos y tira abajo su caché de FastF1— y **antes que el de la web**, para no
dejar una ventana con la página nueva llamando a un servicio sin el endpoint
que necesita.

Para activarlo, igual que con la web pero en la app `apexdata-telemetry`:

1. EasyPanel → app **`apexdata-telemetry`** → pestaña **Deployments**, al final
   de la página: recuadro **Deployment Trigger**. Copia la URL.
2. GitHub → repo → *Settings* → *Secrets and variables* → *Actions* → **New
   repository secret**: nombre `EASYPANEL_SERVICE_HOOK`, valor esa URL.
3. Deja **Auto Deploy DESACTIVADO** en la pestaña *Github* de esa app, por lo
   mismo que en la web: si disparan las dos, una build cancela a la otra a
   mitad y el log muere con «context canceled», que parece una muerte por
   memoria y no lo es.

Sin ese secreto no se rompe nada: el paso avisa con un `::warning::` en el CI y
el servicio se queda esperando un *Deploy* a mano.

**Cómo saber si un despliegue entró de verdad**: la primera línea de su consola
al arrancar dice `ApexData Telemetry vX desplegado y arrancado: … UTC (… hora de
Lima)`. La web hace lo mismo con `[ApexData] Desplegado y arrancado: … · build …`.

### 3. Variables de entorno de la web

| Variable | Valor | Notas |
|---|---|---|
| `DATABASE_URL` | Cadena del pooler de Supabase | Añade `?pgbouncer=true&connection_limit=5` |
| `DIRECT_URL` | Cadena directa de Supabase (puerto 5432) | La usan las migraciones; el pooler no las soporta |
| `NEXT_PUBLIC_JOLPICA_API_URL` | `https://api.jolpi.ca/ergast/f1` | |
| `NEXT_PUBLIC_OPENF1_API_URL` | `https://api.openf1.org/v1` | |
| `NEXT_PUBLIC_APP_URL` | La URL pública de la web | |
| `PORT` | `3000` | Obligatoria: sin ella el contenedor escucha en el 80 y el dominio da 502 |
| `FASTF1_SERVICE_URL` | `http://ditto_apexdata-telemetry:8000` | Opcional: sin ella esa sección queda desactivada. Es el nombre interno `<proyecto>_<app>`, en `http` (tráfico interno, sin certificado) y **sin barra final**: el cliente concatena rutas que ya empiezan por `/` |

**Sobre `connection_limit`**: el plan original decía `1`, y era correcto para
Vercel, donde cada invocación serverless es un proceso aparte. Aquí hay **un
contenedor permanente** atendiendo a todos los visitantes a la vez: con una
sola conexión las peticiones concurrentes se encolan y las que esperan más de
10 segundos mueren con `P2024`, y el usuario ve la pantalla de error. Ocurrió
en producción el 2026-08-18 y se corrigió subiéndolo a `5`.

### 4. Conectar el webhook con GitHub

1. En EasyPanel, dentro de la app `apexdata`, pestaña **Deployments**, **al
   final de la página**: el recuadro se llama **Deployment Trigger** (no
   "Deploy webhook"). Copia la URL.
2. **Cámbiale el principio antes de guardarla.** El panel la ofrece como
   `http://<ip-del-vps>:3000/api/deploy/<token>` — sin cifrar, así que el token
   viaja legible y quien lo capture puede lanzar despliegues. El mismo endpoint
   responde por HTTPS en el dominio del panel: sustituye `http://<ip>:3000` por
   `https://panel.dittochatbot.com` y deja intacto todo lo demás. Verificado:
   con un token inválido devuelve `404 {"message":"Invalid Token"}`.
3. En GitHub: repositorio → **Settings → Secrets and variables → Actions**.
4. **New repository secret**: nombre `EASYPANEL_DEPLOY_HOOK`, valor la URL
   `https://…`. Si en algún momento rotas el token con **Refresh Deploy
   Token**, hay que actualizar este secret.
5. En la pestaña **Variables** del mismo sitio, crea la variable `APP_URL` con
   la URL pública (`https://apexdata.meeks.fun`). Va como variable y no como
   secret porque no es información sensible. Si no existe, CI se salta la
   comprobación de cutover en lugar de fallar.

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
| **502** y una página de error de EasyPanel, con el contenedor arrancado | Desajuste de puertos. Mira en los logs qué puerto anuncia Next: debe coincidir con el de **Domains**. Falta `PORT=3000` |
| **503** y esa misma página de error | No hay contenedor sano detrás. Si fuera la app quien responde 503 vendría un JSON, no HTML |
| El build muere en `npx prisma generate` con `Missing required environment variable` | La config de Prisma exige variables que en el build no existen: EasyPanel las pasa como build args y el `Dockerfile` no declara ningún `ARG` |
| El contenedor construye pero muere al arrancar con `Cannot find module` | La imagen es `output: "standalone"` y solo lleva lo que la app importa. Cualquier herramienta de desarrollo que se ejecute al arrancar se queda sin sus dependencias — por eso `prisma.config.ts` se borra en el runner |
| `prisma migrate deploy` se queda colgado sin devolver nada | Está saliendo por el pooler (6543). Las migraciones necesitan la conexión directa (5432) |
| `P2024 Timed out fetching a new connection from the connection pool`, repetido | `connection_limit` demasiado bajo para un contenedor permanente. Ver la nota bajo la tabla de variables |
| El build del servicio de telemetría falla con `requirements.txt: not found` | El *Build Path* de esa app no es `/python-service` |
| La consola del servicio de telemetría dice `curl: command not found` | La imagen `slim` no lo trae; usa `python -c "import urllib.request…"` |

### Volver atrás

**Opción 1 (recomendada)**: `git revert <commit>` y push. CI vuelve a
desplegar con el estado anterior.

**Opción 2**: en EasyPanel, pestaña *Deployments* de la app, elegir un
despliegue anterior y hacer redeploy de esa imagen — sin reconstruir.

---

## Mantener los datos al día

Lo hace solo el workflow **`.github/workflows/data-refresh.yml`**: los lunes a
las 06:00 UTC siembra la temporada en curso (resultados, clasificación y
standings) y después calienta el caché de telemetría de la última carrera. De
paso, esa escritura semanal evita que Supabase pause el proyecto por
inactividad, que ya ocurrió una vez y costó una restauración.

También se puede lanzar a mano desde la pestaña **Actions** del repositorio,
con **Run workflow** (`workflow_dispatch`).

**Necesita dos secrets** en *Settings → Secrets and variables → Actions*:
`DATABASE_URL` y `DIRECT_URL`, con los mismos valores que la app de la web.
Sin ellos el workflow no falla: avisa de que no están y termina en verde.

Dos detalles de diseño, por si hay que tocarlo:

- **El año no está escrito en ninguna parte**: se deriva con `date -u +%Y`. Un
  año fijo seguiría sembrando cada lunes una temporada terminada.
- **El caché se calienta a través de la web, no llamando al servicio**, porque
  este solo es accesible desde dentro del VPS. El workflow pregunta a
  `/api/standings/current` cuál fue la última ronda y pide sus vueltas por las
  rutas proxy. Es explícitamente *best effort*: si esa parte va lenta o falla,
  no invalida el sembrado, que es lo que no se puede perder.

Si hiciera falta hacerlo a mano:

```bash
npm run seed:season -- 2026
npm run seed:standings -- 2026
```

## Avisos de fin de carrera

Los avisos push los manda **el cron semanal**, no la aplicación: la web no
necesita ninguna clave nueva y en EasyPanel no hay nada que tocar.

Hace falta **un solo secreto**, en GitHub:

1. `Settings` → `Secrets and variables` → `Actions` → `New repository secret`.
2. Nombre: `VAPID_PRIVATE_KEY`.
3. Valor: la clave privada del par VAPID.

Sin ese secreto el paso del cron no falla: avisa de que falta y sigue. El resto
del sembrado semanal funciona igual.

**Por qué solo la privada.** El par identifica al servidor ante el servicio de
push del navegador. La pública viaja al cliente por definición —va dentro de la
propia suscripción—, así que está escrita en `src/lib/push-claves.ts`: guardarla
en una variable de entorno solo añadiría una forma de que la función muriera en
silencio si alguien olvidara ponerla.

**Si algún día hay que rotar el par**: se genera uno nuevo con
`webpush.generateVAPIDKeys()`, se cambia la constante y se cambia el secreto. Las
suscripciones existentes dejan de valer —están firmadas con la pública vieja— y
se irán borrando solas al primer envío fallido, que es lo que hace el remitente
con las direcciones que ya no responden.

**Para probarlo a mano**, sin esperar al lunes:

```bash
npm run notificar -- --probar   # dice de qué carrera avisaría, sin enviar
npm run notificar               # envía y marca la carrera como avisada
```

Solo avisa de carreras de los últimos ocho días: sin esa ventana, la primera
ejecución contaría la última carrera, la siguiente la anterior, y semana a
semana iría mandando resultados de 2010 como si fueran de ayer.
