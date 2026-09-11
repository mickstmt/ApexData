-- Cuándo se le preguntó por primera vez a esta fuente por esta sesión.
--
-- Sin esto no se puede distinguir «la fuente tardó media hora» de «tardamos
-- media hora en preguntar», que es justo lo que pasó con las prácticas del
-- 11 de septiembre: las dos fuentes marcaron 31 y 32 minutos con un solo
-- sondeo cada una, o sea que el primer sondeo ya las encontró y la medida no
-- comparaba nada.
ALTER TABLE "source_probes" ADD COLUMN "firstProbeAt" TIMESTAMP(3);
