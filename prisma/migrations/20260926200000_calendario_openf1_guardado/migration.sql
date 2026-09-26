-- El calendario de OpenF1, guardado, para que dejar de contestar no nos deje
-- sin saber qué sesiones existen.
--
-- Nuestro `races` guarda los comienzos y ningún final, y no guarda la
-- `session_key` de la que cuelgan la clasificación, los avisos ya mandados y
-- las previas. Por eso había que preguntárselo a OpenF1 en cada vuelta del
-- reloj, y por eso un 401 suyo mataba la vuelta entera.
--
-- La copia en memoria no bastaba: cada despliegue la borra.
CREATE TABLE "openf1_sessions" (
    "session_key"  INTEGER      NOT NULL,
    "meeting_key"  INTEGER      NOT NULL,
    "year"         INTEGER      NOT NULL,
    "session_name" TEXT         NOT NULL,
    "session_type" TEXT         NOT NULL,
    "date_start"   TIMESTAMP(3) NOT NULL,
    "date_end"     TIMESTAMP(3) NOT NULL,
    "country_name" TEXT         NOT NULL,
    "location"     TEXT         NOT NULL,
    "is_cancelled" BOOLEAN      NOT NULL DEFAULT false,
    "vista_en"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "openf1_sessions_pkey" PRIMARY KEY ("session_key")
);

-- Por año, que es como se pide el calendario; por final, que es lo que mira la
-- ventana de avisos para saber qué acaba de terminar.
CREATE INDEX "openf1_sessions_year_idx" ON "openf1_sessions"("year");
CREATE INDEX "openf1_sessions_date_end_idx" ON "openf1_sessions"("date_end");
