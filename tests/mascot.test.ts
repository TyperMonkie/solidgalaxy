import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateMascot, readMascotArt } from '../server/mascot.ts';
import { createPreset } from '../src/planet/PlanetPresets.ts';

test('Mascot API rejects invalid input and paths, hides provider details, and stops unsupported-model retries',async t=>{
 const names=['PERSONAVERSE_API_KEY','PERSONAVERSE_BASE_URL','PERSONAVERSE_IMAGE_API_KEY','PERSONAVERSE_IMAGE_BASE_URL'] as const;
 const original=Object.fromEntries(names.map(name=>[name,process.env[name]]));
 for(const name of names)process.env[name]=name.endsWith('BASE_URL')?'https://offline-test.invalid/v1':'offline-test-key';
 t.after(()=>{for(const name of names){if(original[name]===undefined)delete process.env[name];else process.env[name]=original[name];}});
 let requests=0;const logs:unknown[][]=[];
 t.mock.method(console,'warn',(...args:unknown[])=>{logs.push(args);});
 t.mock.method(globalThis,'fetch',async()=>{requests++;return Response.json({error:{code:'unsupported_model',message:'model unavailable; provider-body-secret; offline-test-key'}},{status:400});});
 await assert.rejects(generateMascot({dna:{},mascot:{}}),{name:'ZodError'});
 for(const path of ['/api/mascot-art/../../config.toml','/api/mascot-art/'+('a'.repeat(64))+'.png/../config.toml','/api/mascot-art/'+('A'.repeat(64))+'.png'])assert.equal(await readMascotArt(path),null);
 assert.equal(requests,0);
 const dna={version:1 as const,seed:4294967294,title:'Offline mascot circuit breaker test',vision:'A quiet amber toy world',emotionalAtmosphere:'Reflective and playful',themes:[{name:'Quiet',interpretation:'Gentle creative solitude',evidenceIds:[],confidence:'tentative' as const}],contrasts:[],motifs:[],directions:[{id:'a',name:'A',vision:'A',composition:'A',motion:'A'},{id:'b',name:'B',vision:'B',composition:'B',motion:'B'}],selectedDirectionId:'a',intensity:.3,uncertainty:'A creative interpretation.'};
 const mascot=createPreset('nebula').mascot;
 const first=await generateMascot({dna,mascot});
 assert.equal(first.status,'unavailable');assert.equal(first.imageUrl,null);assert.match(first.message,/不支持/);
 const second=await generateMascot({dna:{...dna,seed:dna.seed-1,title:'A different uncached planet'},mascot});
 assert.equal(second.status,'unavailable');assert.equal(requests,1,'Unsupported models must not be called repeatedly in the same server session.');
 const visible=JSON.stringify({first,second,logs});
 assert.ok(!visible.includes('provider-body-secret'));assert.ok(!visible.includes('offline-test-key'));
});
