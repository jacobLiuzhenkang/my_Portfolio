import assert from 'node:assert/strict';
import { randomUUID,createHash } from 'node:crypto';
import pg from 'pg';
const url=new URL(process.env.DATABASE_URL);if(!['postgres','localhost','127.0.0.1'].includes(url.hostname))throw new Error('This quota fixture is local-only.');
const db=new pg.Client({connectionString:url.toString()});await db.connect();let fakeId;
try{
 const response=await fetch('http://127.0.0.1:3000/api/trpc/guestbook.identity',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://127.0.0.1:3000'},body:JSON.stringify({json:{website:''}})});assert.equal(response.status,200);const cookie=response.headers.get('set-cookie').split(';')[0];const token=cookie.slice(cookie.indexOf('=')+1);
 const visitor=(await db.query('SELECT id FROM gb_visitors WHERE token_hash=$1',[createHash('sha256').update(token).digest('hex')])).rows[0];fakeId=randomUUID();
 await db.query("INSERT INTO gb_media(id,visitor_id,source_key,final_key,mime,size,reserved_bytes,final_size,state,upload_token_hash,expires_at) VALUES($1,$2,$3,$4,'image/png',1,$5,$5,'ready',$6,now()+interval '1 hour')",[fakeId,visitor.id,'quota-test/'+fakeId+'/source','quota-test/'+fakeId+'/final',700*1024*1024,'0'.repeat(64)]);
 const attempt=await fetch('http://127.0.0.1:3000/api/trpc/guestbook.prepareImage',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://127.0.0.1:3000',Cookie:cookie},body:JSON.stringify({json:{mime:'image/png',size:1}})});assert.equal(attempt.status,412);
 console.log('Local storage-budget enforcement passed; no real object uploaded.');
}finally{if(fakeId)await db.query('DELETE FROM gb_media WHERE id=$1',[fakeId]);await db.end();}
