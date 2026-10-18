import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { createPreset } from '../src/planet/PlanetPresets.ts';
import { validateRenderSpec } from '../src/planet/RenderSpec.ts';
import { CompiledRenderSpecSchema } from '../src/ai/schemas.ts';
import { greenheckTerrain, greenheckWeather, proceduralSettings, terrainSettings, weatherSettings } from '../src/planet/ProceduralSettings.ts';

test('Full terrain/weather DNA round-trips and all compiled worlds explicitly declare both modules',()=>{
 const s=createPreset('nebula');s.terrain=greenheckTerrain();s.weather=greenheckWeather();
 assert.deepEqual(validateRenderSpec(JSON.parse(JSON.stringify(s))),s);
 assert.equal(CompiledRenderSpecSchema.safeParse(s).success,true);
 const legacy=structuredClone(s);delete legacy.terrain;delete legacy.weather;
 assert.doesNotThrow(()=>validateRenderSpec(legacy));
 assert.equal(CompiledRenderSpecSchema.safeParse(legacy).success,false);
 assert.equal(terrainSettings(legacy).relief,legacy.geometry.displacement*.32);
 assert.deepEqual(weatherSettings(legacy),greenheckWeather());
 const json=z.toJSONSchema(CompiledRenderSpecSchema) as any;
 assert.ok(!JSON.stringify(json).includes('prefixItems'),'Strict Responses schemas need homogeneous array items, not tuples');
 assert.ok(json.required.includes('terrain')&&json.required.includes('weather'));
 for(const key of ['terrain','weather'])assert.deepEqual([...json.properties[key].required].sort(),Object.keys(json.properties[key].properties).sort());
});
test('Seeded continuous controls explore every noise basis and broad structural/weather ranges within the contract',()=>{
 const values=Array.from({length:128},(_,i)=>proceduralSettings(900071+i*271));
 assert.deepEqual(proceduralSettings(900071),values[0]);
 assert.equal(new Set(values.map(v=>v.terrain.noise)).size,3);
 for(const [key,minSpan] of [['period',1.2],['sharpness',3],['offset',.35],['relief',.07]] as const){
  const axis=values.map(v=>v.terrain[key]);assert.ok(Math.max(...axis)-Math.min(...axis)>minSpan,key);
 }
 assert.ok(new Set(values.map(v=>v.weather.drift>0)).size===2,'Wind can counter-rotate');
 const base=createPreset('nebula');
 for(const value of values)assert.doesNotThrow(()=>validateRenderSpec({...base,...value}));
});
test('Invalid algorithms, unbounded weather and nonfinite relief cannot reach a renderer',()=>{
 for(const mutate of [(s:any)=>s.terrain.noise='invented-shader',(s:any)=>s.terrain.relief=Infinity,(s:any)=>s.terrain.colors.pop(),(s:any)=>s.terrain.persistence=0,(s:any)=>s.weather.particles=50000,(s:any)=>s.weather.scale=0,(s:any)=>s.weather.speed=-1]){
  const s=createPreset('nebula');mutate(s);assert.throws(()=>validateRenderSpec(s));
 }
});
