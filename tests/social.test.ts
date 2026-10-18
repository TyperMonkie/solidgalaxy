import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { SocialStore } from '../server/social-store.ts';
import { socialApi } from '../server/social.ts';
import { seedSocialState } from '../src/social/seed.ts';
import { affinity, distanceLy, positionFor, PostInputSchema } from '../src/social/model.ts';
import { searchResidents } from '../server/social-ai.ts';
import { DNASchema } from '../src/ai/schemas.ts';

test('Semantic scene distance is symmetric and affinity decreases with physical separation',()=>{
 const [a]=seedSocialState().residents;
 const near={...a,signature:{...a.signature,warmth:a.signature.warmth+.01}},far={...a,signature:{...a.signature,warmth:.01}};
 assert.equal(distanceLy(a,a),0);assert.equal(affinity(a,a),100);
 assert.equal(distanceLy(a,near),distanceLy(near,a));assert.ok(distanceLy(a,near)<distanceLy(a,far));assert.ok(affinity(a,near)>affinity(a,far));
 const p=positionFor(a),q=positionFor(near);assert.equal(distanceLy(a,near),Math.hypot(...p.map((v,i)=>v-q[i])));
});
test('Only the owner identity is non-fictional; empty posts and remote image URLs are rejected',()=>{
 const s=seedSocialState();assert.equal(s.residents.filter(r=>r.fictional).length,17);assert.equal(s.residents.filter(r=>!r.fictional)[0].id,'you');
 assert.equal(PostInputSchema.safeParse({text:' ',image:''}).success,false);
 assert.equal(PostInputSchema.safeParse({text:'picture',image:'https://example.com/a.png'}).success,false);
});
test('Local store serializes concurrent mutations and survives a fresh instance',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'personaverse-store-'));try{const path=join(dir,'world.json'),store=new SocialStore(path);
 await Promise.all(Array.from({length:15},()=>store.mutate(s=>{s.residents[0].revision++;})));
 const restored=await new SocialStore(path).read();assert.equal(restored.residents[0].revision,15);assert.equal(JSON.parse(await readFile(path,'utf8')).version,1);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('Legacy demo artwork migrates once without changing AI/studio worlds, posts or friendships',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'personaverse-visual-migration-'));
 try{
  const path=join(dir,'world.json'),legacy=seedSocialState();delete legacy.demoVisualVersion;
  legacy.residents[1].source='ai';legacy.residents[2].source='studio';
  for(const r of legacy.residents){r.renderSpec.structures={enabled:true,count:22};r.renderSpec.material.palette=['#0b1220','#b6a1cc','#b6a1cc'];}
  legacy.friendships.push({id:'preserve-friend',from:'you',to:'morrow',status:'accepted',createdAt:new Date(0).toISOString()});
  const original=structuredClone(legacy);await writeFile(path,JSON.stringify(legacy));
  const migrated=await new SocialStore(path).read();
  assert.deepEqual(migrated.residents[1],original.residents[1]);assert.deepEqual(migrated.residents[2],original.residents[2]);
  assert.deepEqual(migrated.posts,original.posts);assert.deepEqual(migrated.friendships,original.friendships);
  assert.deepEqual(migrated.residents.map(r=>[r.id,r.signature,r.revision,r.analyzedRevision]),original.residents.map(r=>[r.id,r.signature,r.revision,r.analyzedRevision]));
  const vinyl=migrated.residents.find(r=>r.id==='vinyl')!;
  assert.notDeepEqual(vinyl.renderSpec,original.residents.find(r=>r.id==='vinyl')!.renderSpec);
  assert.deepEqual(await new SocialStore(path).read(),migrated);
 }finally{await rm(dir,{recursive:true,force:true});}
});
async function localApi(run:(request:(path:string,body?:unknown,id?:string)=>Promise<{status:number;body:any}>,store:SocialStore)=>Promise<void>,ai?:Parameters<typeof socialApi>[3]){
 const dir=await mkdtemp(join(tmpdir(),'personaverse-social-api-')),store=new SocialStore(join(dir,'world.json'));
 const server=createServer((req,res)=>{void socialApi(req,res,store,ai).then(handled=>{if(!handled)res.writeHead(404).end();}).catch(()=>res.writeHead(500).end());});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const port=(server.address() as {port:number}).port;
 const request=async(path:string,body?:unknown,id='you')=>{const res=await fetch(`http://127.0.0.1:${port}/api/social/${path}`,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','X-Personaverse-Profile':id},body:body===undefined?undefined:JSON.stringify(body)});return {status:res.status,body:await res.json()};};
 try{await run(request,store);}finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await rm(dir,{recursive:true,force:true});}
}
test('Friend requests deduplicate, only recipients can respond, and posts/likes persist',async()=>{
 await localApi(async(request,store)=>{
 const first=await request('friends',{targetId:'morrow'});assert.equal(first.body.friendship.status,'pending');
 const repeat=await request('friends',{targetId:'morrow'});assert.equal(repeat.body.friendship.id,first.body.friendship.id);
 assert.equal((await request('respond',{requestId:first.body.friendship.id,accept:true})).status,400);
 assert.equal((await request('respond',{requestId:first.body.friendship.id,accept:true},'morrow')).status,200);
 assert.equal((await request('friends',{targetId:'you'})).status,400);
 assert.equal((await request('posts',{text:'',image:''})).status,422);
 const post=await request('posts',{text:'这是本机测试日记',image:''});assert.equal(post.status,200);
 await request('like',{postId:post.body.post.id},'morrow');
 const saved=await store.read();assert.equal(saved.friendships.length,1);assert.equal(saved.friendships[0].status,'accepted');assert.equal(saved.residents[0].revision,1);assert.deepEqual(saved.posts[0].likes,['morrow']);
 await request('like',{postId:post.body.post.id},'morrow');assert.deepEqual((await store.read()).posts[0].likes,[]);
 assert.equal((await request('state',undefined,'unknown')).status,404);
 });
});
test('Failed AI updates preserve posts and original planet and expose retry status',async()=>{
 await localApi(async(request,store)=>{
 const original=(await store.read()).residents[0].renderSpec;
 await request('posts',{text:'服务失败时也必须保存我写下的故事',image:''});
 assert.equal((await request('rebuild',{})).status,502);
 const state=await store.read();assert.equal(state.posts[0].text,'服务失败时也必须保存我写下的故事');assert.deepEqual(state.residents[0].renderSpec,original);assert.equal(state.residents[0].analyzedRevision,0);assert.ok(state.residents[0].updateError);
 },{profile:async()=>{throw new Error('mock provider unavailable');}} as any);
});
test('AI cannot overwrite newer posts; profile changes also invalidate the pending reading',async()=>{
 let enter!:()=>void,release!:()=>void;const entered=new Promise<void>(r=>enter=r),gate=new Promise<void>(r=>release=r);
 const ai={profile:async()=>{enter();await gate;return {data:{title:'stale reading',themes:[]}};},compile:async()=>({degraded:false,renderSpec:seedSocialState().residents[1].renderSpec}),interpretSignature:async()=>seedSocialState().residents[1].signature};
 await localApi(async(request,store)=>{
 const original=(await store.read()).residents[0].renderSpec;
 const updating=request('rebuild',{});await entered;
 await request('profile',{name:'旅人',bio:'有新的自我介绍'});await request('posts',{text:'更新期间的新故事',image:''});release();
 const res=await updating;assert.equal(res.body.stale,true);const saved=await store.read();assert.deepEqual(saved.residents[0].renderSpec,original);assert.equal(saved.residents[0].revision,2);assert.equal(saved.residents[0].analyzedRevision,0);
 },ai as any);
});
test('Semantic navigation filters invented/duplicate residents and labels an unavailable provider fallback',async()=>{
 const state=seedSocialState(),me=state.residents[0];
 const result=await searchResidents('温柔',me,state,(async()=>({data:{hits:[{id:'invented',reason:'x',opener:'x'},{id:'morrow',reason:'根据散步帖子',opener:'那天散步去了哪里？'},{id:'morrow',reason:'duplicate',opener:'x'},{id:'you',reason:'self',opener:'x'}]}})) as any);
 assert.deepEqual(result.hits.map(h=>h.id),['morrow']);assert.equal(result.mode,'semantic');
 const offline=await searchResidents('性格温柔',me,state,(async()=>{throw new Error('offline');}) as any);
 assert.equal(offline.mode,'local');assert.match(offline.message,/文字匹配/);assert.ok(offline.hits.length>0);assert.ok(offline.hits.every(h=>state.residents.some(r=>r.id===h.id)));
});
test('Successful rebuild applies DNA, rendering and coordinates together; studio coordinate failure is explicit',async()=>{
 const spec=seedSocialState().residents[0].renderSpec;
 const dna=DNASchema.parse({version:1,seed:spec.seed,title:'测试之海',vision:'A quiet ocean',emotionalAtmosphere:'Quiet',themes:[{name:'倾听',interpretation:'A tentative creative reading',evidenceIds:['posts:0'],confidence:'tentative'}],contrasts:[],motifs:[],directions:[{id:'a',name:'A',vision:'A',composition:'A',motion:'A'},{id:'b',name:'B',vision:'B',composition:'B',motion:'B'}],selectedDirectionId:'a',intensity:.3,uncertainty:'Creative interpretation, not a diagnosis.'});
 let unavailable=false;const signature=seedSocialState().residents[1].signature;
 const ai={profile:async()=>({data:dna}),compile:async()=>({degraded:false,renderSpec:spec}),interpretSignature:async()=>{if(unavailable)throw new Error('offline');return signature;}};
 await localApi(async(request,store)=>{
 await request('posts',{text:'更新测试',image:''});const rebuilt=await request('rebuild',{});assert.equal(rebuilt.body.ok,true);
 let resident=(await store.read()).residents[0];assert.equal(resident.source,'ai');assert.equal(resident.analyzedRevision,1);assert.deepEqual(resident.signature,signature);assert.equal(resident.worldTitle,dna.title);
 unavailable=true;const published=await request('world',{dna,renderSpec:spec});assert.equal(published.status,200);
 resident=(await store.read()).residents[0];assert.equal(resident.revision,2);assert.equal(resident.coordinateStatus,'error');assert.deepEqual(resident.signature,signature);
 assert.equal((await request('world',{dna:{...dna,seed:spec.seed+1},renderSpec:spec})).status,400);
 },ai as any);
});
