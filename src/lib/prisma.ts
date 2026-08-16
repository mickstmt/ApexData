/**
 * Prisma Client Instance
 * Single instance for the entire application
 */

import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * The Prisma model is named `Constructor`, so `prisma.constructor` collides with
 * `Object.prototype.constructor` and TypeScript resolves it to `Function` instead
 * of the model delegate. It works at runtime, so this alias just restores the
 * types. Use `constructors` instead of `prisma.constructor` in typed code.
 */
export const constructors = prisma.constructor as unknown as Prisma.ConstructorDelegate;

/**
 * Row type for the Constructor model, declared by hand because every generated
 * flavour of it inherits the same collision (its members come back as `never`).
 * Keep in sync with `model Constructor` in prisma/schema.prisma. Renaming the
 * model to `Team` would remove the need for this file's two workarounds.
 */
export type ConstructorModel = {
  id: string;
  constructorId: string;
  name: string;
  nationality: string;
  url: string | null;
  logoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};
