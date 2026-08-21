-- La clasificación del sprint, que faltaba.
--
-- Un fin de semana al sprint se enseñaba como «Práctica 1 → Sprint», saltándose
-- la sesión del viernes que decide la parrilla del sprint. Jolpica la manda
-- como `SprintQualifying` y el sembrador la descartaba por no tener dónde
-- guardarla.

ALTER TABLE "races" ADD COLUMN "sprintQualiDate" TIMESTAMP(3);
ALTER TABLE "races" ADD COLUMN "sprintQualiTime" TEXT;
