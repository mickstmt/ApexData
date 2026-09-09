-- Quién publica antes: OpenF1 o FastF1.
--
-- Un experimento con fecha de caducidad. Hoy la app usa las dos —Jolpica llena
-- la base, FastF1 da la telemetría, OpenF1 dispara los avisos— y la pregunta es
-- si esa división sigue teniendo sentido o si una de las dos llega siempre
-- antes y basta con ella.
--
-- No se responde discutiendo: se sondean las dos cada cinco minutos desde que
-- baja la bandera y se anota el primer instante en que cada una tiene datos.
-- Cuando haya un fin de semana medido, esta tabla se borra con su módulo.

CREATE TABLE "source_probes" (
    "sessionKey" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "sessionName" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "firstSeenAt" TIMESTAMP(3),
    "probes" INTEGER NOT NULL DEFAULT 0,
    "lastNote" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_probes_pkey" PRIMARY KEY ("sessionKey","source")
);

CREATE INDEX "source_probes_year_idx" ON "source_probes"("year");

ALTER TABLE "source_probes" ENABLE ROW LEVEL SECURITY;
