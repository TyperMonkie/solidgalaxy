import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { Object3D, PerspectiveCamera, Points, Mesh, Vector3 } from 'three';
import { CompiledRenderSpecSchema, EXPRESSION_MODULES } from '../src/ai/schemas.ts';
import { parameterOwner, parameterRows, schemaParameterPaths, MODULE_CONSUMERS } from '../src/ai/parameter-contract.ts';
import { createPreset } from '../src/planet/PlanetPresets.ts';
import { createAtmosphere } from '../src/planet/PlanetAtmosphere.ts';
import { createStructures } from '../src/planet/SurfaceStructures.ts';
import { createSpaceBackdrop } from '../src/planet/SpaceBackdrop.ts';
import { createOrbits } from '../src/planet/OrbitalGeometry.ts';
import { advanceGlobe, mascotAnchor, updateMascot } from '../src/planet/ArtSettings.ts';

test('Every compiled leaf has an explicit art owner or technical purpose; missing control registrations fail',()=>{
 const paths=schemaParameterPaths(z.toJSONSchema(CompiledRenderSpecSchema));
 assert.ok(paths.length>100);
 for(const path of paths)assert.doesNotThrow(()=>parameterOwner(path),path);
 assert.throws(()=>parameterOwner('weather.imaginaryControl'),/Unregistered/);
 for(const module of EXPRESSION_MODULES)assert.ok(MODULE_CONSUMERS[module].length>0);
 assert.deepEqual(new Set(parameterRows(createPreset('nebula')).flatMap(r=>r.module?[r.module]:[])),new Set(EXPRESSION_MODULES));
});

test('New art controls are required for compilation and legacy saves remain readable',()=>{
 const s=createPreset('fracture');assert.equal(CompiledRenderSpecSchema.safeParse(s).success,true);
 for(const path of ['background','symbols','atmosphere.altitude','structures.scale','animation.axis','mascot.bob','material.emissionPattern','orbits.feather']){
  const old=structuredClone(s),parts=path.split('.');const parent=parts.length===1?old:(old as any)[parts[0]];delete (parent as any)[parts.at(-1)!];
  assert.equal(CompiledRenderSpecSchema.safeParse(old).success,false,path);
 }
 s.animation.axis=[0,0,0];assert.equal(CompiledRenderSpecSchema.safeParse(s).success,false);
});

test('Atmosphere dimensions/profile and structure geometry/scale/material reach actual render objects',()=>{
 const s=createPreset('nebula');s.atmosphere={enabled:true,color:'#aabbcc',strength:.8,altitude:.23,falloff:8,surfaceRim:0};
 const shell=createAtmosphere(s);assert.equal(shell.geometry.parameters.radius,1.23);assert.equal(shell.material.uniforms.uFalloff.value,8);assert.equal(shell.material.uniforms.uStrength.value,.8);
 s.structures={enabled:true,count:2,kind:'rock',scale:.5,spread:0,altitude:.2,elongation:2};s.material.emission=0;
 const small=createStructures(s);s.structures.scale=2;const large=createStructures(s);
 assert.equal(small.count,2);assert.equal(small.material.emissiveIntensity,0,'Zero emission cannot be overridden by a constant glow floor');
 assert.equal(large.instanceMatrix.array[0]/small.instanceMatrix.array[0],4);
 s.structures.kind='mineral';const mineral=createStructures(s);assert.notEqual(mineral.geometry.type,large.geometry.type);
 for(const m of [shell,small,large,mineral]){m.geometry.dispose();m.material.dispose();}
});

test('Authored background count, star switch, palette, planet list, ring selection and rotation are functional',()=>{
 const s=createPreset('nebula');s.modules.stars=true;s.background!.starCount=17;s.background!.starSize=2;s.background!.brightness=0;s.background!.twinkle=0;s.background!.planets=[{x:.3,y:-.4,depth:30,radius:.8,color:'#ff0000',accent:'#00ff00',rotation:-.02,ring:true}];
 const backdrop=createSpaceBackdrop(s),stars=backdrop.group.children[0] as Points;assert.equal(stars.geometry.attributes.position.count,17);assert.equal(stars.visible,true);assert.equal((stars.material as any).uniforms.uBrightness.value,0);assert.equal((stars.material as any).uniforms.uTwinkle.value,0);
 const camera=new PerspectiveCamera(35,1,.1,100);backdrop.update(10,camera);const planet=backdrop.group.children[1] as Mesh;assert.equal(planet.rotation.y,-.2);assert.equal(planet.scale.x,.8);assert.equal(backdrop.group.children.length,3);
 backdrop.dispose();s.modules.stars=false;s.background!.enabled=false;s.background!.planets=[];
 const empty=createSpaceBackdrop(s);assert.equal(empty.group.visible,false);assert.equal(empty.group.children[0].visible,false);assert.equal(empty.group.children.length,1);empty.dispose();
});

test('Motion preserves authored zero/sign/axis and mascot anchor/bob/sway can be independently changed',()=>{
 const s=createPreset('nebula'),object=new Object3D();s.animation.axis=[1,0,0];s.animation.direction=-1;s.animation.rotation=.1;advanceGlobe(object,s,2);assert.ok(Math.abs(object.rotation.x+.2)<1e-8);
 const pose=object.quaternion.toArray();s.animation.rotation=0;advanceGlobe(object,s,50);assert.deepEqual(object.quaternion.toArray(),pose);
 s.mascot.latitude=0;s.mascot.longitude=Math.PI/2;assert.ok(mascotAnchor(s.mascot).distanceTo(new Vector3(1,0,0))<1e-8);
 const sprite=Object.assign(new Object3D(),{material:{rotation:4}});s.mascot.bob=0;s.mascot.sway=0;updateMascot(sprite,s.mascot,12);assert.equal(sprite.position.y,0);assert.equal(sprite.material.rotation,0);
 const orbit=createOrbits({...s,orbits:{...s.orbits,feather:4,streamSpeed:-.4,twinkle:0}});const mesh=orbit.children.find(o=>o instanceof Mesh) as Mesh;assert.equal((mesh.material as any).uniforms.uFeather.value,4);assert.equal((mesh.material as any).uniforms.uStream.value,-.4);assert.equal((mesh.material as any).uniforms.uTwinkle.value,0);orbit.traverse(o=>{if(o instanceof Mesh||o instanceof Points){o.geometry.dispose();(o.material as any).dispose();}});
});

test('Shader contracts contain independently authored emission controls and primary rim colour',async()=>{
 const material=await readFile(new URL('../src/planet/PlanetMaterial.ts',import.meta.url),'utf8'),shader=await readFile(new URL('../src/planet/shaders/surface.frag.glsl',import.meta.url),'utf8');
 for(const uniform of ['uEmissionPattern','uEmissionFrequency','uEmissionPulse','uRimColor']){assert.ok(material.includes(uniform));assert.ok(shader.includes(uniform));}
 assert.ok(shader.includes('uRoughness*.3'),'Water roughness must retain authored material influence');
});
