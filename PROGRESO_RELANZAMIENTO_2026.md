# ApexData — Progreso del Relanzamiento 2026

> **Documento vivo del plan definido en `AUDITORIA_Y_PLAN_RELANZAMIENTO_2026.md`.** Se actualiza con cada cambio, por mínimo que sea.
> Si estás retomando el trabajo desde cualquier máquina (casa u oficina), este archivo + el plan de referencia contienen TODO el contexto necesario. Instrucción para Claude: leer ambos documentos completos antes de tocar código.

---

## Reglas de trabajo acordadas

1. **Este documento se actualiza siempre**: cada sesión de trabajo termina con una entrada en la bitácora y el estado actualizado, y se commitea/pushea para que esté disponible desde cualquier lugar.
2. **Acciones del usuario (Frank)**: cuando algo requiera acción manual suya, se indica con máximo detalle, sin asumir conocimientos ni pasos previos. Si son varios pasos: primero un resumen corto de qué se va a hacer, y después SIEMPRE paso a paso, uno por uno, esperando confirmación antes de seguir, para evitar errores y estancamientos.
3. **Herramientas**: se usan agentes especializados por ámbito, skills de Claude Code (dataviz, code-review, security-review), e investigación en internet cuando haga falta.
4. **Cada sprint cierra con la app corriendo y verificada**, no con promesas.

---

## Estado actual

**Fase**: Pre-Sprint 0 (planificación completada, desarrollo no iniciado).

**Último trabajo hecho**: auditoría completa + plan de relanzamiento, todo commiteado y pusheado a `main`.

**Próximo paso**: arrancar **Sprint 0 — Saneamiento** (ver hoja de ruta en `AUDITORIA_Y_PLAN_RELANZAMIENTO_2026.md`, sección 11). El primer punto del S0 es rotar las claves de Supabase — acción de Frank, con guía paso a paso cuando arranquemos.

**Decisiones tomadas**:
- ✅ **Hosting del microservicio Python: el VPS propio de Frank** (2026-08-16). Frank ya tiene un VPS con varios aplicativos desplegados; el servicio FastF1 (que ya tiene Dockerfile) se despliega ahí en S5. Esto elimina el único coste previsto (~$5/mes de Railway) → **coste total del proyecto: $0/mes**. Pendiente de recabar en S5: proveedor/SO del VPS, RAM/disco disponibles, si usa Docker y qué reverse proxy (Nginx/Caddy/Traefik) sirve los demás aplicativos.

**Decisiones pendientes** (no bloquean el S0):
- [ ] Dominio propio vs subdominio de Vercel (se decide en S5).

---

## Acciones pendientes de Frank

*(ninguna por ahora — la primera será rotar las claves de Supabase al arrancar el Sprint 0)*

---

## Bitácora

### 2026-08-16 (2) — Ajustes al plan
- Renombrado `PROGRESO.md` → `PROGRESO_RELANZAMIENTO_2026.md` para vincularlo explícitamente al plan de referencia.
- Aclarado el modelo de costes: Jolpica (API de datos históricos) y FastF1 (librería de telemetría) son ambos gratuitos; el único gasto era el hosting del servidor Python. Decidido: se usará el VPS propio de Frank → coste total $0/mes.

### 2026-08-16 — Auditoría y plan de relanzamiento
- Auditoría multiagente completa del repo: frontend, capa de datos, servicio Python, historia del proyecto.
- Investigación: ecosistema F1 2026 (Jolpica vivo, FastF1 3.8.x, parrilla de 11 equipos), PWA iOS 26, patrones PWA de plastik, diseño/UX, fuentes verificadas de imágenes (misterio de los 403 de Wikimedia resuelto: faltaba header User-Agent), deployment y seguridad.
- Plan de relanzamiento en 6 sprints documentado en `AUDITORIA_Y_PLAN_RELANZAMIENTO_2026.md` y como artifact visual: https://claude.ai/code/artifact/cd85e848-c8ea-465b-bd14-0a5f48603e50
- Commits: `efb0843` (trabajo WIP de imágenes de dic-2025 que estaba sin commitear), `4238f8c` (documento de auditoría y plan). Pusheados a `origin/main`.
- Creado este documento de progreso y acordadas las reglas de trabajo.

### 2025-12-28 — (histórico) Último trabajo antes de la pausa
- Commits `dee09b9` (servicio Python FastF1) y `20eb8af` (saneo de credenciales). Por la tarde: sprint de imágenes que quedó incompleto y sin commitear (recuperado el 2026-08-16 en `efb0843`).
