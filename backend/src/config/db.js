import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ENV } from "./env.js";
import * as schema from "../db/schema.js";

// TCP connection pool — correct for long-running Express on Railway.
// Neon HTTP driver was wrong here: no real transactions, new HTTP request per query.
//
// ssl defaults to "require" for Neon. DB_SSL=false is a local-only escape hatch
// for a Postgres instance with no SSL configured (e.g. Homebrew's default
// cluster) — unset in every deployed environment, so production is unaffected.
const sql = postgres(ENV.DATABASE_URL, {
  ssl: process.env.DB_SSL === "false" ? false : "require",
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  // Neon pooler uses PgBouncer in transaction mode — prepared statements must be disabled.
  prepare: false,
});

export const db = drizzle(sql, { schema });