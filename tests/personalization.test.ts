import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compileUniverse, generateUniverse, descriptionContent } from '../src/ai/client.ts';
import { createPreset } from '../src/planet/PlanetPresets.ts';
import { validateRenderSpec } from '../src/planet/RenderSpec.ts';
import { DNASchema } from '../src/ai/schemas.ts';
import { draftToContent, exampleDraft } from '../src/ai/draft.ts';
import { landmarkPositions } from '../src/planet/PlanetLandmarks.ts';
import type { LandmarkSpec } from '../src/planet/RenderSpec.ts';

test('Description becomes validated DNA before compilation; switching direction reuses the interpretation',async t=>{
 const recorded=JSON.parse(await readFile(new URL('../docs/ai-ui-result.json',import.meta.url),'utf8'));
 const content=descriptionContent('A fictional person who likes to travel with friends.');
 const dna=DNASchema.parse({...recorded.dna,seed:content.seed});
 const requests:{path:string;body:any}[]=[];
 const phases:string[]=[];
 const compiled=createPreset('fracture',content.seed);compiled.modules.clouds=false;compiled.orbits.enabled=false;compiled.atmosphere.enabled=false;compiled.lighting.direction=[.2,-.9,.5];compiled.lighting.specular=0;compiled.weather!.minParticleSize=17;compiled.bloom={threshold:.6,strength:0,radius:1.4};
 t.mock.method(globalThis,'fetch',async(path:string,options:RequestInit)=>{
  const body=JSON.parse(options.body as string);requests.push({path,body});
  return Response.json(path==='/api/profile'?{dna}:{renderSpec:{...compiled,seed:body.seed},directionId:body.selectedDirectionId,interpretation:'A warm world with layered rhythms.',decisions:[{intent:'Shared energy',module:'animation',implementation:'Slow rotation and separate orbital movement.'}],fallbacks:[],degraded:false});
 });
 const result=await generateUniverse(content,p=>phases.push(p));
 assert.deepEqual(phases,['profile','compile']);
 assert.deepEqual(requests.map(r=>r.path),['/api/profile','/api/compile']);
 assert.deepEqual(requests[0].body.posts,content.posts);
 assert.equal(requests[1].body.seed,content.seed);
 assert.equal('posts' in requests[1].body,false,'Compiler must receive DNA rather than original content.');
 assert.equal(result.dna.title,dna.title);
 assert.deepEqual(result.renderSpec,compiled,'Client must preserve every compiled parameter, including absent cloud/ring/rim and zero highlight/bloom');
 const alternate=dna.directions.find(d=>d.id!==dna.selectedDirectionId)!;
 const revised=await compileUniverse({...dna,selectedDirectionId:alternate.id});
 assert.equal(revised.directionId,alternate.id);
 assert.equal(requests.length,3);
 assert.equal(revised.dna.seed,result.dna.seed);
});

test('World symbols are packed apart with only three near the mascot',()=>{
 const items=Array.from({length:8},(_,i)=>({id:`s${i}`,icon:'music',label:'Music',meaning:'A supplied musical preference',color:'#f4c795',placement:i<3?'companion':'surface',evidenceIds:['music:0']} as LandmarkSpec));
 const positions=landmarkPositions(items);
 assert.deepEqual(positions.map(p=>p.toArray()),landmarkPositions(items).map(p=>p.toArray()));
 positions.forEach(p=>assert.ok(Math.abs(p.length()-1)<1e-6));
 for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++)assert.ok(positions[i].distanceTo(positions[j])>.4,'No overlapping symbol cluster');
});

test('An invalid profile cannot reach the compiler; provider errors stay visible',async t=>{
 let count=0;
 const mock=t.mock.method(globalThis,'fetch',async()=>{count++;return Response.json({dna:{title:'Incomplete'}});});
 await assert.rejects(generateUniverse(descriptionContent('A fictional description.')));
 assert.equal(count,1);
 mock.mock.mockImplementation(async()=>Response.json({error:'Provider unavailable'},{status:503}));
 await assert.rejects(generateUniverse(descriptionContent('A fictional description.')),/Provider unavailable/);
});

test('Categorized fragments keep their semantic source types and mascot catalog rejects invented props',()=>{
 const content=draftToContent(exampleDraft(),123);
 assert.equal(content.posts.length,2);assert.deepEqual(content.interests,['摇滚','吉他','旅行']);
 assert.equal(content.music[0].artist,'Guns N’ Roses');assert.equal(content.seed,123);
 const spec=createPreset('nebula');spec.orbits.type='dust';
 assert.equal(spec.mascot.enabled,true);
 const invalid={...spec,mascot:{...spec.mascot,accessory:'arbitrary-3d-model'}};
 assert.throws(()=>validateRenderSpec(invalid));
});
