import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

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
