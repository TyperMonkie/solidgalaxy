import { z } from 'zod';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { structuredCall } from './llm.ts';
import { SignatureSchema, openerFor, type Resident, type SearchResult, type SocialState } from '../src/social/model.ts';
import type { UniverseDNA } from '../src/ai/schemas.ts';
const prompt=(name:string)=>readFile(resolve('server','prompts',name+'.md'),'utf8');
export async function interpretSignature(dna:UniverseDNA){return (await structuredCall('social_signature',SignatureSchema,await prompt('social-signature'),dna,[],30000)).data;}
const SearchSchema=z.strictObject({hits:z.array(z.strictObject({id:z.string().max(60),reason:z.string().min(1).max(220),opener:z.string().min(1).max(200)})).max(6)});
let searching=false;
export async function searchResidents(query:string,me:Resident,state:SocialState,call=structuredCall):Promise<SearchResult>{
 const residents=state.residents.filter(r=>r.id!==me.id);
 if(!searching){searching=true;try{const result=await call('social_navigation',SearchSchema,await prompt('social-navigation'),{query,visitor:{bio:me.bio,tags:me.tags},residents:residents.map(r=>({id:r.id,bio:r.bio,tags:r.tags,reading:r.signature.summary,posts:state.posts.filter(p=>p.authorId===r.id).slice(0,3).map(p=>p.text)}))},[],18000);const seen=new Set<string>();const hits=result.data.hits.filter(h=>residents.some(r=>r.id===h.id)&&!seen.has(h.id)&&(seen.add(h.id),true));return {hits,mode:'semantic',message:hits.length?'已根据描述和公开帖子找到这些可能的共鸣。':'暂时没有找到足够贴近的星球，试试更宽一些的描述。'};}catch{}finally{searching=false;}}
 const normalized=query.toLowerCase().replace(/性格|寻找|找一个|星球|的人|朋友/g,'').trim();const tokens=normalized.match(/[a-z0-9]+|[\u4e00-\u9fff]{2}/g)||[normalized];
 const scored=residents.map(r=>{const text=[r.name,r.bio,...r.tags,...state.posts.filter(p=>p.authorId===r.id).map(p=>p.text)].join(' ').toLowerCase();const score=tokens.filter(t=>t.length>0&&text.includes(t)).length+(text.includes(normalized)&&normalized?2:0);return {r,score};}).filter(r=>r.score>0).sort((a,b)=>b.score-a.score).slice(0,6);
 return {hits:scored.map(({r})=>({id:r.id,reason:`公开介绍或帖子中出现了与「${normalized}」相关的文字。`,opener:openerFor(me,r,state.posts)})),mode:'local',message:'语义服务暂不可用，当前使用本地文字匹配；结果可能不完整。'};
}
