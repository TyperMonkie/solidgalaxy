import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { socialStore } from './social-store.ts';
import type { SocialStore } from './social-store.ts';
import { PostInputSchema, SaveWorldSchema } from '../src/social/model.ts';
import { interpretSignature, searchResidents } from './social-ai.ts';
import { compile, profile } from './pipeline.ts';
import { validateRenderSpec } from '../src/planet/RenderSpec.ts';
const updates=new Set<string>();
const defaultAI={profile,compile,interpretSignature,searchResidents};
export async function socialApi(req:IncomingMessage,res:ServerResponse,store:SocialStore=socialStore,ai=defaultAI){
 const url=new URL(req.url||'/', 'http://127.0.0.1'),path=url.pathname;if(!path.startsWith('/api/social/'))return false;
 const send=(status:number,value:unknown)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 if(req.headers.origin&&!/^http:\/\/(127\.0\.0\.1|localhost):(4173|5173)$/.test(req.headers.origin)){send(403,{error:'不允许的来源。'});return true;}
 try{
 const state=await store.read(),id=String(req.headers['x-personaverse-profile']||'you'),me=state.residents.find(r=>r.id===id);if(!me){send(404,{error:'演示身份不存在。'});return true;}
 if(req.method==='GET'&&path==='/api/social/state'){send(200,{...state,meId:id,updating:[...updates]});return true;}
 if(req.method!=='POST'){send(404,{error:'接口不存在。'});return true;}
 const chunks:Buffer[]=[];let size=0;for await(const c of req){size+=c.length;if(size>3500000){send(413,{error:'内容过大，请使用小于 2 MB 的图片。'});return true;}chunks.push(Buffer.from(c));}
 const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
 if(path==='/api/social/posts'){
 const body=PostInputSchema.parse(input);const post={id:randomUUID(),authorId:id,text:body.text,image:body.image,createdAt:new Date().toISOString(),likes:[]};
 await store.mutate(s=>{s.posts.unshift(post);s.residents.find(r=>r.id===id)!.revision++;});send(200,{post});
 }else if(path==='/api/social/like'){
 const body=z.strictObject({postId:z.string().max(80)}).parse(input);const likes=await store.mutate(s=>{const p=s.posts.find(p=>p.id===body.postId);if(!p)throw new Error('帖子不存在。');p.likes=p.likes.includes(id)?p.likes.filter(l=>l!==id):[...p.likes,id];return p.likes;});send(200,{likes});
 }else if(path==='/api/social/search'){
 const body=z.strictObject({query:z.string().trim().min(1).max(300)}).parse(input);send(200,await ai.searchResidents(body.query,me,state));
 }else if(path==='/api/social/friends'){
 const body=z.strictObject({targetId:z.string().max(60)}).parse(input);if(body.targetId===id||!state.residents.some(r=>r.id===body.targetId))throw new Error('请选择另一颗星球。');
 const friendship=await store.mutate(s=>{const existing=s.friendships.find(f=>((f.from===id&&f.to===body.targetId)||(f.to===id&&f.from===body.targetId))&&f.status!=='declined');if(existing)return existing;const f={id:randomUUID(),from:id,to:body.targetId,status:'pending' as const,createdAt:new Date().toISOString()};s.friendships.push(f);return f;});send(200,{friendship});
 }else if(path==='/api/social/respond'){
 const body=z.strictObject({requestId:z.string().max(80),accept:z.boolean()}).parse(input);await store.mutate(s=>{const f=s.friendships.find(f=>f.id===body.requestId);if(!f||f.to!==id||f.status!=='pending')throw new Error('只能由收到请求的身份处理待回应的请求。');f.status=body.accept?'accepted':'declined';});send(200,{ok:true});
 }else if(path==='/api/social/profile'){
 const body=z.strictObject({name:z.string().trim().min(1).max(24),bio:z.string().trim().max(600)}).parse(input);await store.mutate(s=>{const r=s.residents.find(r=>r.id===id)!;if(r.bio!==body.bio)r.revision++;Object.assign(r,body);});send(200,{ok:true});
 }else if(path==='/api/social/world'){
 const body=SaveWorldSchema.parse(input);if(body.dna.seed!==body.renderSpec.seed)throw new Error('DNA 与渲染标识不一致。');const renderSpec=validateRenderSpec(body.renderSpec);const revision=await store.mutate(s=>{const r=s.residents.find(r=>r.id===id)!;r.revision++;Object.assign(r,{dna:body.dna,renderSpec,worldTitle:body.dna.title,tags:body.dna.themes.map(t=>t.name),source:'studio',coordinateStatus:'pending',mascotArtwork:body.mascotArtwork,analyzedRevision:r.revision,updateError:'',updatedAt:new Date().toISOString()});return r.revision;});
 void ai.interpretSignature(body.dna).then(signature=>store.mutate(s=>{const r=s.residents.find(r=>r.id===id)!;if(r.revision===revision&&r.source==='studio'){r.signature=signature;r.coordinateStatus='ready';}})).catch(()=>store.mutate(s=>{const r=s.residents.find(r=>r.id===id)!;if(r.revision===revision&&r.source==='studio')r.coordinateStatus='error';}).catch(()=>{}));send(200,{ok:true});
 }else if(path==='/api/social/rebuild'){
 z.strictObject({}).parse(input);if(updates.has(id)){send(409,{error:'星球正在更新，请稍候。'});return true;}if(updates.size>=2){send(429,{error:'已有两颗星球正在更新，请稍后重试。'});return true;}
 updates.add(id);try{
 const revision=me.revision,posts=state.posts.filter(p=>p.authorId===id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,20);
 const interpreted=await ai.profile({seed:me.renderSpec.seed,posts:[me.bio,...posts.filter(p=>p.text).map(p=>p.text)],interests:me.source==='demo'?me.tags:[],music:[],images:posts.filter(p=>p.image).slice(0,3).map(p=>({description:p.text,dataUrl:p.image})),videos:[],otherComments:[]});
 const [world,signature]=await Promise.all([ai.compile(interpreted.data),ai.interpretSignature(interpreted.data)]);if(world.degraded)throw new Error('视觉编译未通过，保留原星球。');
 const applied=await store.mutate(s=>{const r=s.residents.find(r=>r.id===id)!;if(r.revision!==revision)return false;Object.assign(r,{dna:interpreted.data,renderSpec:world.renderSpec,worldTitle:interpreted.data.title,tags:interpreted.data.themes.map(t=>t.name),signature,source:'ai',coordinateStatus:'ready',analyzedRevision:revision,updatedAt:new Date().toISOString(),updateError:''});return true;});send(200,{ok:applied,stale:!applied});
 }catch{await store.mutate(s=>{s.residents.find(r=>r.id===id)!.updateError='本次 AI 更新未完成，帖子已保存，星球保持原样。';});send(502,{error:'本次 AI 更新未完成，帖子已保存，可以稍后重试。'});}finally{updates.delete(id);}
 }else send(404,{error:'接口不存在。'});
 }catch(e){send(e instanceof z.ZodError?422:400,{error:e instanceof z.ZodError?'内容格式不正确，请检查输入。':e instanceof SyntaxError?'请求格式不正确。':e instanceof Error?e.message:'操作未完成。'});}
 return true;
}
