-- La previa del fin de semana: «mañana hay Gran Premio».
--
-- Sale a las 20:00 de la noche anterior, en el reloj de quien la recibe. Eso
-- trae dos consecuencias en la base:
--
-- 1. Hay que saber el huso horario de cada suscripción. Una antelación fija
--    heredaría el del circuito: medido sobre las 72 previas de 2026 en hora de
--    Lima, con 24 horas 39 caerían de madrugada y con 12 horas, 16.
-- 2. La marca de «ya enviada» no puede ser global como la de los resultados.
--    Lo que pasó en una sesión es igual para todos; las 20:00 no. Con una marca
--    compartida, el primero en recibir la previa dejaría sin ella al resto.

ALTER TABLE "push_subscriptions" ADD COLUMN "timezone" TEXT;

CREATE TABLE "sent_previews" (
    "subscriptionId" TEXT NOT NULL,
    "sessionKey" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sent_previews_pkey" PRIMARY KEY ("subscriptionId","sessionKey")
);

-- En cascada: si alguien se da de baja, sus marcas no tienen ya a quién
-- pertenecer. Las suscripciones se borran solas cuando el servicio de push las
-- rechaza, así que esto ocurre de verdad y no solo en teoría.
ALTER TABLE "sent_previews"
  ADD CONSTRAINT "sent_previews_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "push_subscriptions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sent_previews" ENABLE ROW LEVEL SECURITY;
