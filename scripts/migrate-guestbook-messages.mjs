import { readFile } from "node:fs/promises";
import pg from "pg";
const url = new URL(process.env.DATABASE_URL || process.env.POSTGRES_URL);
const local = ["postgres", "localhost", "127.0.0.1"].includes(url.hostname);
for (const key of [
  "sslmode",
  "sslcert",
  "sslkey",
  "sslrootcert",
  "channel_binding",
])
  url.searchParams.delete(key);
const client = new pg.Client({
  connectionString: url.toString(),
  ssl: local ? false : { rejectUnauthorized: true },
  enableChannelBinding: !local,
  connectionTimeoutMillis: 15000,
});
await client.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(17302403)");
  await client.query(
    await readFile(new URL("../db/guestbook-messages.sql", import.meta.url), "utf8")
  );
  await client.query("COMMIT");
  console.log(
    "Contact messages additive migration complete; existing data preserved."
  );
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
