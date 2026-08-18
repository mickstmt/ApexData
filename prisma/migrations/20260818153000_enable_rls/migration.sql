-- Activa Row Level Security en todas las tablas de datos, sin políticas.
--
-- Por qué: Supabase publica una API REST sobre el esquema `public`, y en su
-- modelo la clave anónima está pensada para ser pública — lo único que impide
-- leer, editar o borrar por esa vía es RLS. Estaba desactivado en las once
-- tablas, que es lo que disparó el aviso de seguridad del 2026-08-17.
--
-- Por qué no rompe nada: la aplicación no usa esa API. Se conecta por Prisma
-- con usuario y contraseña de Postgres, y el rol propietario de una tabla
-- ignora RLS por definición (no se usa FORCE ROW LEVEL SECURITY). Sin
-- políticas, cualquier otro rol —el anónimo de la API REST— no ve ni una fila.
--
-- `_prisma_migrations` se deja deliberadamente fuera: el contenedor arranca con
-- `prisma migrate deploy && node server.js`, así que cualquier problema de
-- permisos sobre esa tabla impediría arrancar la app entera, y a cambio solo
-- protegería una lista de nombres y checksums de migraciones. La vía definitiva
-- para esa tabla es desactivar la API de datos del esquema público en el panel
-- de Supabase, que la app tampoco necesita.

ALTER TABLE "drivers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "constructors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "circuits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "seasons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "races" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "qualifying" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sprint_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "constructor_standings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "driver_standings" ENABLE ROW LEVEL SECURITY;