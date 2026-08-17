# ApexData — production image, built by EasyPanel on push.
#
# Mirrors the approach proven on plastik, adapted to npm.

FROM node:22-alpine AS base

# ── builder ─────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate

# Heap cap deliberately BELOW the host's available RAM.
#
# Setting this above what the box has does the opposite of "room to breathe":
# V8 happily grows past the real limit and the kernel's OOM killer gets there
# first, which shows up as a build log that simply stops, with BuildKit
# reporting "context canceled" and no error of its own. Under the cap, V8 hits
# GC pressure and survives; if a build genuinely needs more, it fails with a
# readable "JavaScript heap out of memory".
#
# Check `free -h` on the host before raising this, and keep it comfortably
# below MemAvailable — remember plastik builds on the same machine.
# Placeholder connection strings, exactly as CI does it: the build runs no
# queries, but importing a page constructs the Prisma client, which refuses to
# be built without a syntactically valid URL. Deliberately NOT the real
# credentials — EasyPanel offers them as build args, and accepting them would
# bake the database password into the image's layer history for no gain.
RUN DATABASE_URL="postgresql://user:password@localhost:5432/apexdata?schema=public" \
    DIRECT_URL="postgresql://user:password@localhost:5432/apexdata?schema=public" \
    NODE_OPTIONS=--max-old-space-size=2048 npm run build

# ── runner ──────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# `output: "standalone"` traces only the modules the app actually imports,
# so the image carries a fraction of a full production node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Driver photos, circuit layouts, flags, icons and the service worker.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma CLI for `migrate deploy` on boot. Installed globally with npm so the
# CLI finds @prisma/engines through ordinary resolution. Pinned to the version
# in package.json to avoid skew with the generated client.
RUN npm install -g prisma@6.19.0

COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# `output: "standalone"` traces what the app imports, and nothing in the app
# imports dotenv — only prisma.config.ts does, which the CLI loads before
# `migrate deploy` runs. Without this the boot command dies on
# "Cannot find module 'dotenv/config'" and `node server.js` is never reached.
# In the container it finds no .env and does nothing, which is correct: the
# real variables come from the environment.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/dotenv ./node_modules/dotenv

USER nextjs
EXPOSE 3000

# Apply pending migrations, then start the standalone server (not `next start`).
CMD ["sh", "-c", "prisma migrate deploy && node server.js"]
