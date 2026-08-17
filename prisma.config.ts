import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    // This override wins over prisma/schema.prisma and, in doing so, discards
    // its `directUrl` — so it has to BE the direct connection. Pointed at
    // DATABASE_URL, `migrate deploy` goes through pgbouncer and hangs forever
    // instead of failing; in the container that means `node server.js` is
    // never reached and the app never boots.
    //
    // Read through process.env rather than prisma's `env()` helper, which
    // resolves eagerly when the config loads and therefore killed `prisma
    // generate` during the image build, where no database variables exist.
    // The placeholder is never connected to: generate needs no database, and
    // every command that does run with the real variable present.
    //
    // The running app does not read this file; its pooled URL comes from the
    // schema's own datasource.
    url: process.env.DIRECT_URL ?? "postgresql://unset:unset@localhost:5432/unset",
  },
});
