import fs from 'node:fs/promises';
import pg from 'pg';
// This script changes only case content that still matches the known import.
const url=new URL(process.env.DATABASE_URL||process.env.POSTGRES_URL);const local=['postgres','localhost','127.0.0.1'].includes(url.hostname);for(const key of ['sslmode','sslcert','sslkey','sslrootcert','channel_binding'])url.searchParams.delete(key);
const db=new pg.Client({connectionString:url.toString(),ssl:local?false:{rejectUnauthorized:true},enableChannelBinding:!local});
const sectionNames=new Set(['项目背景','我的贡献','关键取舍','协作与边界','当前阶段','图集说明','验证方式']);
const markdown=content=>content.split('\n').map(line=>sectionNames.has(line.trim())?'### '+line.trim():line).join('\n');
const plain=source=>source.split('\n').filter(line=>!/^\s*!\[/.test(line)&&!/^\s*(---|___|\*\*\*)\s*$/.test(line)).map(line=>line.replace(/^#{1,6}\s*/,'').replace(/\*\*/g,'').replace(/^\s*[-*+]\s+/,'• ').trimEnd()).join('\n').replace(/\n{3,}/g,'\n\n').trim();
await db.connect();try{
 await db.query('BEGIN');await db.query('SELECT pg_advisory_xact_lock(17302403)');let changed=0;const preserved=[];
 for(let id=1;id<=5;id++){
  const source=await fs.readFile(new URL('../public/posts/project'+id+'.md',import.meta.url),'utf8');const {rows}=await db.query('SELECT content FROM projects WHERE id=$1',[id]);if(!rows[0])continue;
  if(rows[0].content.trim()===source.trim())continue;
  if(rows[0].content!==plain(source)){preserved.push(id);continue;}
  changed+=(await db.query('UPDATE projects SET content=$1 WHERE id=$2 AND content=$3',[source.trim(),id,rows[0].content])).rowCount;
 }
 for(const [id,kind] of [[6,'viform'],[7,'sac']]){
  const {rows}=await db.query('SELECT content,cover_image FROM (SELECT content,"coverImage" AS cover_image FROM projects WHERE id=$1) p',[id]);if(!rows[0]||!rows[0].cover_image?.includes('/images/'+kind+'/'))continue;
  const old=rows[0].content;let next=markdown(old);
  const insert=(heading,image)=>{if(!next.includes(image)&&next.includes('### '+heading))next=next.replace('### '+heading,image+'\n\n### '+heading);};
  if(kind==='viform')insert('关键取舍','![VIFORM 亮版创作工作台：统一工具入口与创作记录](/images/viform/workspace.png)');else{insert('关键取舍','![SAC 沉浸式活动首页](/images/sac/home.png)');insert('验证方式','![SAC 活动指南与参与流程](/images/sac/guide.png)');}
  if(next!==old)changed+=(await db.query('UPDATE projects SET content=$1 WHERE id=$2 AND content=$3',[next,id,old])).rowCount;
 }
 await db.query('COMMIT');console.log('Case layout restored:',{changed,customCasesPreserved:preserved});
}catch(e){await db.query('ROLLBACK');throw e;}finally{await db.end();}
