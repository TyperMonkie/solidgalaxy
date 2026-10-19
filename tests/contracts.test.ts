import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPreset } from '../src/planet/PlanetPresets';
import { validateRenderSpec } from '../src/planet/RenderSpec';
import { RenderSpecSchema, ContentSchema, DNASchema, ProfileDNASchema, EXPRESSION_MODULES } from '../src/ai/schemas';
import { sourcePackage, validateDNAIntegrity, compilerInput, validateExpressionCoverage } from '../server/pipeline';
import { hashSeed, cellsForSeed } from '../src/planet/procedural';
test('All presets satisfy both the renderer and LLM contract; geometry families differ',()=>{
 const families=new Set<string>();for(const style of ['nebula','fracture','crystal'] as const){const s=createPreset(style);assert.deepEqual(validateRenderSpec(s),RenderSpecSchema.parse(s));families.add(s.geometry.type);assert.equal(s.modules.stars,false);}assert.equal(families.size,3);
});
test('Reject invalid AI values before allocating GPU resources',()=>{
 for(const mutation of [(s:any)=>s.seed=-1,(s:any)=>s.seed=2**32,(s:any)=>s.geometry.displacement=Infinity,(s:any)=>s.material.palette=['red'],(s:any)=>s.structures.count=3.5,(s:any)=>s.modules.postFX='yes',(s:any)=>s.geometry.type='invented']){const s=createPreset('nebula');mutation(s);assert.throws(()=>validateRenderSpec(s));assert.equal(RenderSpecSchema.safeParse(s).success,false);}
 assert.equal(RenderSpecSchema.safeParse({...createPreset('nebula'),arbitraryShader:'foo'}).success,false);
});
test('Same seed gives stable cells and independent geometry variation',()=>{assert.equal(hashSeed(78291,4),hashSeed(78291,4));assert.deepEqual(cellsForSeed(78),cellsForSeed(78));assert.notDeepEqual(cellsForSeed(78),cellsForSeed(79));});
test('Source package strips image bytes and retains evidence identity',()=>{
 const content=ContentSchema.parse({posts:['One thought'],interests:['architecture'],music:[],images:[{description:'A blue building',dataUrl:'data:image/png;base64,YQ=='}],videos:[],otherComments:[],seed:10});const pack=sourcePackage(content);assert.deepEqual(pack.sources.map(s=>s.id),['posts:0','interests:0','images:0']);assert.ok(!JSON.stringify(pack).includes('base64'));assert.equal(ContentSchema.safeParse({...content,images:[{description:'x',dataUrl:'https://untrusted.example/a.png'}]}).success,false);
});
test('Reject invented direction IDs and fabricated evidence',()=>{
 const dna={version:1,seed:12,title:'A quiet world',vision:'A world of contrast',emotionalAtmosphere:'Quiet',themes:[{name:'Quiet',interpretation:'One poetic direction',evidenceIds:['posts:0'],confidence:'tentative'}],contrasts:[],motifs:[],directions:[{id:'a',name:'A',vision:'A',composition:'A',motion:'A'},{id:'b',name:'B',vision:'B',composition:'B',motion:'B'}],selectedDirectionId:'a',intensity:.3,uncertainty:'This is a creative interpretation.'};
 const valid=DNASchema.parse(dna);assert.doesNotThrow(()=>validateDNAIntegrity(valid,12,new Set(['posts:0'])));assert.throws(()=>validateDNAIntegrity(valid,13));assert.throws(()=>validateDNAIntegrity(valid,12,new Set(['posts:1'])));assert.throws(()=>validateDNAIntegrity({...valid,selectedDirectionId:'missing'},12));
 assert.equal(ProfileDNASchema.safeParse(valid).success,false,'Legacy DNA remains readable, but a new profile needs an explicit weather intent for every direction');
 assert.equal(ProfileDNASchema.safeParse({...valid,directions:valid.directions.map(d=>({...d,weatherIntent:'局部薄云为缓慢变化的边界留白，而不是对性格的测量。'}))}).success,true);
 assert.deepEqual(Object.keys(compilerInput(valid)).sort(),['capabilities','dna'],'Numeric preset examples must not anchor the compiler');
 assert.throws(()=>validateExpressionCoverage([{module:'geometry'}]),/weather/);
 assert.doesNotThrow(()=>validateExpressionCoverage(EXPRESSION_MODULES.map(module=>({module}))));
});
