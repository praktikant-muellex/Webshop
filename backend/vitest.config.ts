import { defineConfig } from "vitest/config";
import dotenv from "dotenv";
import path from "path";

// Loaded here (not in a setupFile) so DATABASE_URL is in process.env before
// any test file imports src/db/prisma.ts — PrismaClient reads it once, at
// construction time, not per-query.
dotenv.config({ path: path.resolve(__dirname, ".env.test") });

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    hookTimeout: 20000,
    testTimeout: 20000,
    // All test files share one Postgres database and reset it between
    // tests (see tests/helpers/resetDb.ts) — running files in parallel
    // would let one file's reset wipe another file's in-progress data.
    fileParallelism: false,
    env: {
      DATABASE_URL: process.env.DATABASE_URL,
      SESSION_SECRET: process.env.SESSION_SECRET,
      NODE_ENV: "test",
    },
  },
});
