// import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DB_URL;
const pool = postgres(connectionString, { max: 1 });

export const database = drizzle({
  client: pool,
  schema,
});
