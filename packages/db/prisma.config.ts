import path from "node:path";

import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({
  path: "../../apps/server/.env",
});

const datasourceUrl =
  process.env.DATABASE_URL ?? "postgresql://user:password@localhost:5432/postgres";

export default defineConfig({
  schema: path.join("prisma", "schema"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "bun run src/seed.ts",
  },
  datasource: {
    // Use DATABASE_URL when available; fall back to a dummy local URL so
    // `prisma generate` can run in the production image without secrets.
    url: datasourceUrl,
  },
});
