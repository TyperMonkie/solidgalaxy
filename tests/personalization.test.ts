import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compileUniverse, generateUniverse, descriptionContent } from '../src/ai/client.ts';
import { createPreset } from '../src/planet/PlanetPresets.ts';
import { DNASchema } from '../src/ai/schemas.ts';

test('Description becomes validated DNA before compilation; switching direction reuses the interpretation',async t=>{
 const recorded=JSON.parse(await readFile(new URL('../docs/ai-ui-result.json',import.meta.url),'utf8'));
 const content=descriptionContent('A fictional person who likes to travel with friends.');
 const dna=DNASchema.parse({...recorded.dna,seed:content.seed});
 const requests:{path:string;body:any}[]=[];
 const phases:string[]=[];
 t.mock.method(globalThis,'fetch',async(path:string,options:RequestInit)=>{
  const body=JSON.parse(options.body as string);requests.push({path,body});
  return Response.json(path==='/api/profile'?{dna}:{renderSpec:createPreset('fracture',body.seed),directionId:body.selectedDirectionId,interpretation:'A warm world with layered rhythms.',decisions:[{intent:'Shared energy',module:'animation',implementation:'Slow rotation and separate orbital movement.'}],fallbacks:[],degraded:false});
 });
 const result=await generateUniverse(content,p=>phases.push(p));
 assert.deepEqual(phases,['profile','compile']);
 assert.deepEqual(requests.map(r=>r.path),['/api/profile','/api/compile']);
 assert.deepEqual(requests[0].body.posts,content.posts);
 assert.equal(requests[1].body.seed,content.seed);
 assert.equal('posts' in requests[1].body,false,'Compiler must receive DNA rather than original content.');
 assert.equal(result.dna.title,dna.title);
 const alternate=dna.directions.find(d=>d.id!==dna.selectedDirectionId)!;
 const revised=await compileUniverse({...dna,selectedDirectionId:alternate.id});
 assert.equal(revised.directionId,alternate.id);
 assert.equal(requests.length,3);
 assert.equal(revised.dna.seed,result.dna.seed);
});

test('An invalid profile cannot reach the compiler; provider errors stay visible',async t=>{
 let count=0;
 const mock=t.mock.method(globalThis,'fetch',async()=>{count++;return Response.json({dna:{title:'Incomplete'}});});
 await assert.rejects(generateUniverse(descriptionContent('A fictional description.')));
 assert.equal(count,1);
 mock.mock.mockImplementation(async()=>Response.json({error:'Provider unavailable'},{status:503}));
 await assert.rejects(generateUniverse(descriptionContent('A fictional description.')),/Provider unavailable/);
});
