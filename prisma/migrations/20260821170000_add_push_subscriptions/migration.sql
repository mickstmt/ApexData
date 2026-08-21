-- Avisos push: a quién avisar y de qué carreras ya se avisó.
--
-- La tabla nace con RLS activado, igual que las demás: Supabase publica una API
-- REST sobre el esquema público y sin RLS cualquiera con la clave anónima
-- podría leer o borrar suscripciones. Aquí importa más que en las tablas de
-- datos de F1 —esos son públicos—, porque una dirección de push es de alguien.

CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSentAt" TIMESTAMP(3),

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;

-- Cuándo se avisó del resultado de cada carrera. Sin esta marca, repetir el
-- cron volvería a mandar el mismo aviso.
ALTER TABLE "races" ADD COLUMN "notifiedAt" TIMESTAMP(3);
