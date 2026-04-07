import { config as loadEnv } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const currentDir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(currentDir, "../../../.env") });
loadEnv({ path: resolve(currentDir, "../../../.env.local"), override: true });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const isVercel = Boolean(process.env.VERCEL);
const poolMax = Number.parseInt(process.env.PG_POOL_MAX ?? "", 10);

export const pool = new Pool({
  connectionString,
  allowExitOnIdle: true,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 10_000,
  max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : isVercel ? 1 : 10,
});
export const db = drizzle({ client: pool });
