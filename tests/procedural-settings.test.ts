import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { createPreset } from '../src/planet/PlanetPresets.ts';
import { validateRenderSpec } from '../src/planet/RenderSpec.ts';
import { CompiledRenderSpecSchema } from '../src/ai/schemas.ts';
import { greenheckTerrain, greenheckWeather, proceduralSettings, terrainSettings, weatherSettings, lightingSettings, orbitSettings, bloomSettings } from '../src/planet/ProceduralSettings.ts';
import { createOrbits, updateOrbitPose } from '../src/planet/OrbitalGeometry.ts';
import { Mesh, Points, ShaderMaterial } from 'three';
import { cloudReadout, cloudPointScale } from '../src/planet/CloudReadout.ts';

test('Full terrain/weather DNA round-trips and all compiled worlds explicitly declare both modules',()=>{
 const s=createPreset('nebula');s.terrain=greenheckTerrain();s.weather=greenheckWeather();
 assert.deepEqual(validateRenderSpec(JSON.parse(JSON.stringify(s))),s);
 assert.equal(CompiledRenderSpecSchema.safeParse(s).success,true);
 const legacy=structuredClone(s);delete legacy.terrain;delete legacy.weather;
 assert.doesNotThrow(()=>validateRenderSpec(legacy));
 assert.equal(CompiledRenderSpecSchema.safeParse(legacy).success,false);
 assert.equal(terrainSettings(legacy).relief,legacy.geometry.displacement*.32);
 assert.deepEqual(weatherSettings(legacy),{...greenheckWeather(),size:75});
 const json=z.toJSONSchema(CompiledRenderSpecSchema) as any;
 assert.ok(!JSON.stringify(json).includes('prefixItems'),'Strict Responses schemas need homogeneous array items, not tuples');
 assert.ok(json.required.includes('terrain')&&json.required.includes('weather'));
 const checkStrict=(node:any)=>{if(!node||typeof node!=='object')return;if(node.type==='object'){assert.equal(node.additionalProperties,false);assert.deepEqual([...(node.required??[])].sort(),Object.keys(node.properties).sort());}Object.values(node).forEach(v=>Array.isArray(v)?v.forEach(checkStrict):checkStrict(v));};
 checkStrict(json);
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
 for(const mutate of [(s:any)=>s.terrain.noise='invented-shader',(s:any)=>s.terrain.relief=Infinity,(s:any)=>s.terrain.colors.pop(),(s:any)=>s.terrain.persistence=-.01,(s:any)=>s.weather.particles=50001,(s:any)=>s.weather.scale=0,(s:any)=>s.weather.speed=-1,(s:any)=>s.lighting.direction=[0,0,0],(s:any)=>s.weather.minParticleSize=201,(s:any)=>s.weather.maxParticleSize=1,(s:any)=>s.bloom.strength=2,(s:any)=>s.orbits.layers=17]){
  const s=createPreset('nebula');mutate(s);assert.throws(()=>validateRenderSpec(s));
 }
});

test('Every upstream UI endpoint is accepted, while old saves retain deterministic fallbacks',()=>{
 const s=createPreset('nebula');s.terrain={...greenheckTerrain(),sharpness:0,persistence:0,bumpOffset:.1};
 s.weather={...greenheckWeather(),particles:50000,minParticleSize:0,maxParticleSize:200,density:2};
 s.lighting={enabled:true,ambient:5,intensity:5,specular:5,shininess:25,direction:[-1,1,0],color:'#ffccaa'};
 s.bloom={threshold:1,strength:1,radius:2};
 assert.doesNotThrow(()=>validateRenderSpec(s));assert.equal(CompiledRenderSpecSchema.safeParse(s).success,true);
 const old=structuredClone(s);old.lighting={enabled:true,ambient:.12,intensity:1.4};old.orbits={enabled:false,type:'dust',tilt:0};old.weather={density:0,opacity:.3,scale:.4,altitude:.05,thickness:.075,size:60,particles:4000,speed:.03,drift:.01,color:'#ffffff'};delete old.bloom;
 assert.doesNotThrow(()=>validateRenderSpec(old));assert.equal(weatherSettings(old).minParticleSize,40);assert.equal(weatherSettings(old).maxParticleSize,80);
 assert.ok(lightingSettings(old).specular>0);assert.equal(orbitSettings(old).enabled,false);assert.equal(bloomSettings(old).strength,.16);
 assert.equal(CompiledRenderSpecSchema.safeParse(old).success,false,'New AI output cannot silently use legacy fixed values');
 for(const key of ['specular','shininess','direction','color'] as const){const next=structuredClone(s);delete next.lighting[key];assert.equal(CompiledRenderSpecSchema.safeParse(next).success,false,key);}
 for(const key of ['radius','width','layers','arc','eccentricity','warp','particles','particleSize','opacity','speed','precession','inclination','colors'] as const){const next=structuredClone(s);delete next.orbits[key];assert.equal(CompiledRenderSpecSchema.safeParse(next).success,false,key);}
});

test('Compiled orbit geometry is points-only for dust and obeys size, counts, colour and independent motion',()=>{
 const s=createPreset('nebula');s.orbits={...orbitSettings(s),type:'dust',radius:2.4,width:.05,particles:53,particleSize:4,colors:['#ff4400','#00ccff'],speed:-.17,precession:0,warp:0};
 const dust=createOrbits(s);assert.equal(dust.children.length,1);assert.ok(dust.children[0] instanceof Points);const points=dust.children[0] as Points;
 assert.equal(points.geometry.attributes.position.count,53);assert.equal((points.material as ShaderMaterial).uniforms.uSpeed.value,-.17);
 const xyz=points.geometry.attributes.position;for(let i=0;i<xyz.count;i++)assert.ok(Math.hypot(xyz.getX(i),xyz.getY(i))>2.34);
 updateOrbitPose(dust,s,0);const pose=dust.rotation.toArray();updateOrbitPose(dust,s,90);assert.deepEqual(dust.rotation.toArray(),pose);
 s.orbits={...s.orbits,type:'ribbons',layers:2,particles:0,radius:1.5,width:.1,arc:1};const arcs=createOrbits(s);assert.equal(arcs.children.length,2);assert.ok(arcs.children.every(c=>c instanceof Mesh));
 for(const group of [dust,arcs])group.traverse(o=>{if(o instanceof Mesh||o instanceof Points){o.geometry.dispose();(o.material as ShaderMaterial).dispose();}});
});

test('Weather readout distinguishes legacy defaults from explicit zero values and actual quality budgets',()=>{
 const s=createPreset('nebula');delete s.weather;
 assert.equal(cloudReadout(s).legacy,true);assert.equal(cloudReadout(s).density,0);
 s.modules.clouds=true;s.weather={...greenheckWeather(),density:-.83,opacity:0,minParticleSize:0,maxParticleSize:0,particles:7300,speed:0,drift:0};s.quality='balanced';
 assert.deepEqual({...cloudReadout(s)},{enabled:true,legacy:false,density:-.83,opacity:0,scale:.4,altitude:.05,thickness:.075,minSize:0,maxSize:0,requestedParticles:7300,renderedParticles:7300,speed:0,drift:0,color:'#ffffff'});
 s.quality='low';assert.equal(cloudReadout(s).renderedParticles,1800);assert.equal(s.weather.particles,7300);
 s.modules.clouds=false;assert.equal(cloudReadout(s).renderedParticles,0,'Disabled clouds must not report allocated particles');
 assert.equal(cloudPointScale(1,700,35),1);assert.equal(cloudPointScale(2,700,35),2);
 assert.equal(cloudPointScale(1,1400,35),2,'Sprite area must scale with the projected globe, rather than using a fixed social-view size');
 assert.ok(cloudPointScale(1,700,40)<1,'A wider camera FOV reduces both globe and sprite footprint');
});
