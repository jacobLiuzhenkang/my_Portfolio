import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };
let poolInstance: Pool | undefined;
let instance: ReturnType<typeof drizzle<typeof fullSchema>> | undefined;

export function getPool() {
  if (!poolInstance) {
    const url = new URL(env.databaseUrl);
    if (!/^postgres(?:ql)?:$/.test(url.protocol))
      throw new Error("A Postgres DATABASE_URL is required.");
    const local = ["postgres", "localhost", "127.0.0.1", "[::1]"].includes(
      url.hostname
    );
    for (const key of [
      "sslmode",
      "sslcert",
      "sslkey",
      "sslrootcert",
      "channel_binding",
    ])
      url.searchParams.delete(key);
    const pool = new Pool({
      connectionString: url.toString(),
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      ssl: local ? false : { rejectUnauthorized: true },
      enableChannelBinding: !local,
    });
    pool.on("error", () =>
      console.warn("An idle database connection was closed.")
    );
    poolInstance = pool;
  }
  return poolInstance;
}

export function getDb() {
  if (!instance) instance = drizzle(getPool(), { schema: fullSchema });
  return instance;
}
