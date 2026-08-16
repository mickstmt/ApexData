# ApexData — Documento de Progreso

> **Este es el documento vivo del proyecto.** Se actualiza con cada cambio, por mínimo que sea.
> Si estás retomando el trabajo desde cualquier máquina (casa u oficina), este archivo + `AUDITORIA_Y_PLAN_RELANZAMIENTO_2026.md` contienen TODO el contexto necesario. Instrucción para Claude: leer ambos documentos completos antes de tocar código.

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

**Decisiones pendientes** (no bloquean el S0):
- [ ] Hosting del microservicio Python para producción (~$5/mes Railway vs alternativas $0 — ver sección 10 del plan; se decide en S5, no antes).
- [ ] Dominio propio vs subdominio de Vercel (se decide en S5).

---

## Acciones pendientes de Frank

*(ninguna por ahora — la primera será rotar las claves de Supabase al arrancar el Sprint 0)*

---

## Bitácora

### 2026-08-16 — Auditoría y plan de relanzamiento
- Auditoría multiagente completa del repo: frontend, capa de datos, servicio Python, historia del proyecto.
- Investigación: ecosistema F1 2026 (Jolpica vivo, FastF1 3.8.x, parrilla de 11 equipos), PWA iOS 26, patrones PWA de plastik, diseño/UX, fuentes verificadas de imágenes (misterio de los 403 de Wikimedia resuelto: faltaba header User-Agent), deployment y seguridad.
- Plan de relanzamiento en 6 sprints documentado en `AUDITORIA_Y_PLAN_RELANZAMIENTO_2026.md` y como artifact visual: https://claude.ai/code/artifact/cd85e848-c8ea-465b-bd14-0a5f48603e50
- Commits: `efb0843` (trabajo WIP de imágenes de dic-2025 que estaba sin commitear), `4238f8c` (documento de auditoría y plan). Pusheados a `origin/main`.
- Creado este documento de progreso y acordadas las reglas de trabajo.

### 2025-12-28 — (histórico) Último trabajo antes de la pausa
- Commits `dee09b9` (servicio Python FastF1) y `20eb8af` (saneo de credenciales). Por la tarde: sprint de imágenes que quedó incompleto y sin commitear (recuperado el 2026-08-16 en `efb0843`).
