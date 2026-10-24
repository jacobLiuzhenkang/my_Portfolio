import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import pg from 'pg';
const url=new URL(process.env.DATABASE_URL||process.env.POSTGRES_URL);
const local=['postgres','localhost','127.0.0.1'].includes(url.hostname);
for(const key of ['sslmode','sslcert','sslkey','sslrootcert','channel_binding'])url.searchParams.delete(key);
const client=new pg.Client({connectionString:url.toString(),ssl:local?false:{rejectUnauthorized:true},enableChannelBinding:!local,connectionTimeoutMillis:15000});
await client.connect();
try{
 await client.query('BEGIN');
 await client.query('SELECT pg_advisory_xact_lock(17302401)');
 await client.query(await readFile(new URL('../db/guestbook.sql',import.meta.url),'utf8'));
 await client.query("INSERT INTO gb_settings(key,value) VALUES('security_key',$1),('writes_enabled','true') ON CONFLICT(key) DO NOTHING",[randomBytes(32).toString('hex')]);
 await client.query('COMMIT'); console.log('Guestbook additive migration complete; existing portfolio data preserved.');
}catch(error){await client.query('ROLLBACK');throw error;}finally{await client.end();}
