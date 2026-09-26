-- La cronometría de una sesión ya corrida, guardada para siempre.
--
-- Los tiempos de una sesión terminada no vuelven a cambiar, y aun así se
-- volvían a pedir: el navegador los guarda cinco minutos y el servicio de
-- telemetría una hora. Pasada esa hora, la primera visita obliga a FastF1 a
-- procesar la sesión entera otra vez.
--
-- Medido en producción el 2026-09-26: en caliente 0,06 s, en frío 4,35 s. Eso
-- es el «pidiendo los tiempos» que se ve al entrar en una práctica.
CREATE TABLE "cronometria_sesiones" (
    "year"         INTEGER      NOT NULL,
    "event"        TEXT         NOT NULL,
    "session_type" TEXT         NOT NULL,
    "datos"        JSONB        NOT NULL,
    "vueltas"      INTEGER      NOT NULL,
    "guardada_en"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cronometria_sesiones_pkey" PRIMARY KEY ("year", "event", "session_type")
);
