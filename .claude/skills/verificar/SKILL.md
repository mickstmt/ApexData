---
name: verificar
description: Verifica un cambio en ApexData como exige el proyecto — build igual que el CI (sin base de datos), suites, y recorrido real en los dos temas midiendo, no mirando. Úsala antes de dar por bueno cualquier cambio y antes de commitear.
---

# Verificar un cambio en ApexData

Lint, tipos y build **no pueden ver un hueco de comportamiento**: la app compila
igual de bien sin estados de carga, con un gráfico invisible o cargando la
carrera equivocada. Todo eso ha pasado aquí. Esta es la verificación que sí lo
detecta.

## 1. Lo barato primero

```bash
npm run lint          # el listón es 15 avisos y 0 errores; un aviso nuevo es un fallo
npm run type-check
npx vitest run        # unitarias
```

En `python-service/`, con su venv: `./.venv/Scripts/python.exe -m pytest tests/ -q`

## 2. Build reproduciendo el CI, **sin base de datos**

El CI construye con credenciales falsas a propósito. Un build local que pasa
**no demuestra que el CI pase**: ya tumbó el despliegue una vez.

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/apexdata?schema=public" \
DIRECT_URL="postgresql://user:password@localhost:5432/apexdata?schema=public" \
NEXT_PUBLIC_APP_URL="http://localhost:3000" npx next build
```

## 3. Servir y comprobar que mides el proceso correcto

Un servidor viejo escuchando en el puerto ya dio dos falsos negativos. Antes de
medir, libera el puerto y **compara el `buildId`**:

```bash
netstat -ano | grep ":3100" | grep LISTENING     # tiene que estar vacío
DATABASE_URL="…&connection_limit=5" npx next start -p 3100 &
curl -s localhost:3100/api/health                 # buildId == $(cat .next/BUILD_ID)
```

`connection_limit=5` como en producción: con `1`, el `.env` local serializa las
consultas y las mediciones de rendimiento salen al revés.

## 4. Recorrido real, midiendo

`npx playwright test` cubre lo fijado. Para lo nuevo, **mide en el navegador en
los dos temas** en vez de mirar una captura:

- Contraste: color computado del elemento contra el fondo **compuesto** de sus
  ancestros. Un fondo `rgba(...)` comparado consigo mismo da 1,00:1 y parece un
  fallo que no existe.
- Tamaño y posición reales (`getBoundingClientRect`), no los que crees.
- Para canvas: cuenta píxeles pintados y colores distintos.
- Ancho del documento en 390 px: si supera 390, hay arrastre horizontal.

Errores de medición ya cometidos aquí, para no repetirlos:
- Esperar `.animate-pulse` casa con los esqueletos de imagen de la página actual.
- Frenar la respuesta entera con Playwright impide que el servidor mande el
  esqueleto: nunca aparecerá.
- Un `<a>` creado a mano recarga la página; no es navegación de cliente.
- Contar elementos **después** de cambiar de pestaña mide el panel equivocado.
- El TTFB no sirve con streaming: mide el armazón. Usa el tiempo total.

## 5. Contraste contra el alcance

Antes de cerrar: repasa la lista de alcance original punto por punto y **anota
lo que se recorta, con su motivo**. Lo que desaparece sin registrarse es el
fallo de método que originó el Sprint 6.
