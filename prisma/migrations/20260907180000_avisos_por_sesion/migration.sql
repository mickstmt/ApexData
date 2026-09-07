-- Avisos de las siete sesiones, y personalizados.
--
-- Dos cosas que antes no se podían hacer:
--
-- 1. **Escribir un aviso que hable de tu piloto.** Los favoritos vivían solo en
--    el `localStorage` del teléfono, así que el servidor no sabía a quién sigue
--    quien recibe el aviso. Ahora viajan con la suscripción.
-- 2. **Avisar de más de una sesión por fin de semana.** La marca de «ya avisado»
--    estaba en `races.notifiedAt`, una por carrera. Con prácticas, sprint y
--    clasificación hacen falta siete, y la clave natural la da OpenF1.
--
-- `races.notifiedAt` NO se borra: el guion viejo sigue siendo el respaldo por si
-- el disparador nuevo falla un fin de semana entero, y quitar la columna dejaría
-- de golpe sin red. Se retirará cuando el nuevo lleve un par de carreras bien.

ALTER TABLE "push_subscriptions" ADD COLUMN "favoriteDrivers" TEXT;
ALTER TABLE "push_subscriptions" ADD COLUMN "favoriteConstructors" TEXT;
ALTER TABLE "push_subscriptions" ADD COLUMN "sessions" TEXT;

-- Con valor por defecto porque la tabla ya tiene filas y la columna es
-- obligatoria: sin el DEFAULT, Postgres no sabría qué poner en las existentes.
ALTER TABLE "push_subscriptions"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "notified_sessions" (
    "sessionKey" INTEGER NOT NULL,
    "sessionName" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "sent" INTEGER NOT NULL DEFAULT 0,
    "notifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notified_sessions_pkey" PRIMARY KEY ("sessionKey")
);

CREATE INDEX "notified_sessions_year_idx" ON "notified_sessions"("year");

-- Igual que el resto de tablas: Supabase publica una API REST sobre el esquema
-- público y sin RLS cualquiera con la clave anónima podría borrar estas marcas,
-- que es todo lo que impide que un aviso salga dos veces.
ALTER TABLE "notified_sessions" ENABLE ROW LEVEL SECURITY;
