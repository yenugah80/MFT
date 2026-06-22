import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ENV } from "./env.js";
import * as schema from "../db/schema.js";

// TCP connection pool — correct for long-running Express on Railway.
// Neon HTTP driver was wrong here: no real transactions, new HTTP request per query.
const sql = postgres(ENV.DATABASE_URL, {
  ssl: "require",
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  // Neon pooler uses PgBouncer in transaction mode — prepared statements must be disabled.
  prepare: false,
});

export const db = drizzle(sql, { schema });