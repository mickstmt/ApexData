import { defineConfig } from 'vitest/config';

/**
 * Unit tests cover pure logic only — no database, no network — so the suite
 * runs in CI on every push and gates the deploy.
 */
export default defineConfig({
  resolve: {
    // Resolves the @/* aliases declared in tsconfig.json.
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
