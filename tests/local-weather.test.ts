import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh, Points, ShaderMaterial, Texture, Vector3 } from 'three';
import { z } from 'zod';
import { ClimateSchema, CompiledRenderSpecSchema, DNASchema, ProfileDNASchema } from '../src/ai/schemas.ts';
import { createPreset } from '../src/planet/PlanetPresets.ts';
import { validateRenderSpec } from '../src/planet/RenderSpec.ts';
import { climateUniforms, createWeatherRegion, regionParticleBudget, updateClimateUniforms, weatherAnchor, weatherFrame, weatherPoint } from '../src/planet/ClimateField.ts';
import { conformWeatherToSurface, createLocalWeather, precipitationGeometry } from '../src/planet/PlanetWeather.ts';

test('Local weather validates bounds, types and unique regions, while legacy worlds remain loadable',()=>{
 const s=createPreset('nebula');s.climate={enabled:true,regions:[createWeatherRegion('storm')]};assert.equal(CompiledRenderSpecSchema.safeParse(s).success,true);
 for(const patch of [{radius:0},{radius:3},{latitude:Math.PI},{windStrength:2},{particles:1801},{vortexWidth:-1},{kind:'hail-shader'}])assert.equal(ClimateSchema.safeParse({enabled:true,regions:[{...s.climate.regions[0],...patch}]}).success,false);
 s.climate.regions.push({...s.climate.regions[0]});assert.throws(()=>validateRenderSpec(s),/duplicate/);
 delete s.climate;assert.doesNotThrow(()=>validateRenderSpec(s));assert.equal(CompiledRenderSpecSchema.safeParse(s).success,false);
});

test('Local regions follow spherical coordinates rather than screen coordinates and their cap spans stay bounded',()=>{
 for(const location of [{latitude:0,longitude:0},{latitude:.7,longitude:-2},{latitude:-Math.PI/2,longitude:2}]){
  const normal=weatherAnchor(location),frame=weatherFrame(location);
  assert.ok(new Vector3(0,1,0).applyQuaternion(frame).distanceTo(normal)<1e-8);
  const center=weatherPoint(0,0,.2).applyQuaternion(frame);assert.ok(center.distanceTo(normal.multiplyScalar(1.2))<1e-8);
  const edge=weatherPoint(.32,0,.2).applyQuaternion(frame);assert.ok(Math.abs(edge.angleTo(weatherAnchor(location))-.32)<1e-8);assert.ok(Math.abs(edge.length()-1.2)<1e-8);
 }
});

test('Rain and snow reuse seeded buffers, respect count/quality, and use different precipitation geometry',()=>{
 const s=createPreset('nebula',513721),rain={...createWeatherRegion('rain'),particles:1200};
 const first=precipitationGeometry(s,rain),again=precipitationGeometry(s,rain),snow=precipitationGeometry(s,{...rain,kind:'snow'});
 assert.equal(first.attributes.position.count,4800);assert.equal(first.index?.count,7200);assert.equal(snow.attributes.position.count,1200);assert.equal(snow.index,null);
 assert.deepEqual(first.attributes.position.array,again.attributes.position.array);
 const low=precipitationGeometry({...s,quality:'low'},rain);assert.equal(low.attributes.position.count,450*4);assert.equal(regionParticleBudget({...s,quality:'low'},rain),450);
 const zero=precipitationGeometry(s,{...rain,particles:0});assert.equal(zero.attributes.position.count,0);
 for(const geometry of [first,again,snow,low,zero])geometry.dispose();
});

test('Airborne weather, funnel, storm flash and surface fields share independent authored settings',()=>{
 const s=createPreset('nebula');s.modules.clouds=false;s.climate={enabled:true,regions:[{...createWeatherRegion('storm'),intensity:.9,windStrength:.7,lightning:.8},{...createWeatherRegion('tornado',1),direction:-1,vortexTwist:7},{...createWeatherRegion('snow',2),intensity:0,lightning:1}]};
 const texture=new Texture(),group=createLocalWeather(s,texture);assert.equal(group.children.length,3);assert.equal(group.children[2].visible,false);
 let funnels=0,bolts=0,rain=0;const materials:ShaderMaterial[]=[];group.traverse(o=>{if(o.name==='Local spiral funnel')funnels++;if(o.name==='Regional lightning')bolts++;if(o.name==='Local precipitation')rain++;if(o instanceof Mesh||o instanceof Points)materials.push(o.material as ShaderMaterial);});
 assert.equal(funnels,1);assert.equal(bolts,1);assert.equal(rain,2);
 const tornadoMaterial=materials.find(m=>m.uniforms.uTwist?.value===7)!;assert.equal(tornadoMaterial.uniforms.uDirection.value,-1);
 const stormMaterial=materials.find(m=>m.uniforms.uLightning?.value===.8)!;assert.equal(stormMaterial.uniforms.uWind.value,.7);
 const surface=new ShaderMaterial({uniforms:{uTime:{value:0},uRelief:{value:.12}}});surface.userData.terrainHeader='uniform float uTime;uniform float uRelief;float elevation(vec3 p){return uRelief;}';
 conformWeatherToSurface(group,surface);
 assert.ok(stormMaterial.vertexShader.includes('elevation(uWeatherFrame*normalize(p))'));
 assert.equal(stormMaterial.uniforms.uRelief.value,.12);
 assert.equal(stormMaterial.uniforms.uWind.value,.7,'Terrain binding cannot overwrite regional art choices');
 updateClimateUniforms(materials,12,null,false);assert.equal(stormMaterial.uniforms.uWeatherMotion.value,0,'Pausing suppresses lightning even mid-strike');
 updateClimateUniforms(materials,12,null,true);assert.equal(stormMaterial.uniforms.uWeatherMotion.value,1);
 const field=climateUniforms(s);assert.equal(field.uClimateCount.value,3);assert.equal(field.uClimateIntensity.value[0],.9);assert.equal(field.uClimateKinds.value[1],5);
 const material=new ShaderMaterial({uniforms:field});updateClimateUniforms([material],0);assert.equal(field.uClimateTime.value,0);updateClimateUniforms([material],12);assert.equal(field.uClimateTime.value,12);
 s.climate.enabled=false;assert.equal(climateUniforms(s).uClimateCount.value,0);assert.equal(createLocalWeather(s,texture).children.length,0);
 group.traverse(o=>{if(o instanceof Mesh||o instanceof Points){o.geometry.dispose();(o.material as ShaderMaterial).dispose();}});material.dispose();surface.dispose();texture.dispose();
});

test('New structured profile requires local climate intent while saved pre-weather DNA remains compatible',()=>{
 const intent={surface:'地表',material:'材质',weather:'云',atmosphere:'气',orbits:'环',structures:'构筑',lighting:'光',bloom:'辉光',animation:'动',mascot:'形象',landmarks:'标签',background:'星空'};
 const dna={version:1,seed:1,title:'虚构',vision:'创意',emotionalAtmosphere:'气氛',themes:[{name:'倾听',interpretation:'解释',evidenceIds:[],confidence:'tentative'}],contrasts:[],motifs:[],directions:[{id:'a',name:'A',vision:'A',composition:'A',motion:'A',weatherIntent:'A',artIntents:intent},{id:'b',name:'B',vision:'B',composition:'B',motion:'B',weatherIntent:'B',artIntents:intent}],selectedDirectionId:'a',intensity:.4,uncertainty:'可能'};
 assert.equal(DNASchema.safeParse(dna).success,true);assert.equal(ProfileDNASchema.safeParse(dna).success,false);
 assert.equal(ProfileDNASchema.safeParse({...dna,directions:dna.directions.map(d=>({...d,artIntents:{...intent,climate:'不同气候表达张力，也保留空白。'}}))}).success,true);
 function strict(node:any){if(node.type==='object')assert.deepEqual([...node.required].sort(),Object.keys(node.properties).sort());for(const value of Object.values(node))if(value&&typeof value==='object')Array.isArray(value)?value.forEach(strict):strict(value);}
 strict(z.toJSONSchema(ProfileDNASchema));strict(z.toJSONSchema(CompiledRenderSpecSchema));
});
