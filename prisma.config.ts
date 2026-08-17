import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    // The CLI only ever runs migrations, seeds and studio, and this override
    // takes precedence over `directUrl` in the schema — so it must be the
    // direct connection. Pointed at DATABASE_URL it goes through pgbouncer,
    // where `migrate deploy` hangs forever instead of failing: in the
    // container that means `node server.js` is never reached and the app
    // simply never boots. The running app is unaffected by this file; it
    // takes its pooled URL from prisma/schema.prisma.
    url: env("DIRECT_URL"),
  },
});
