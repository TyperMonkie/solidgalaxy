import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlanetGeometry } from '../src/planet/PlanetGeometry.ts';
import { createPreset } from '../src/planet/PlanetPresets.ts';
import { fractureForSeed, fractureCells, fractureUniforms } from '../src/planet/FractureField.ts';
import { validateRenderSpec } from '../src/planet/RenderSpec.ts';
import { CompiledRenderSpecSchema, RenderSpecSchema } from '../src/ai/schemas.ts';

test('Every close-up terrain family has a continuous globe with sub-0.05-radian mesh edges',()=>{
 for(const style of ['nebula','fracture','crystal'] as const){
  const geometry=createPlanetGeometry(createPreset(style));
  try{
   const positions=geometry.getAttribute('position'),indices=geometry.index!;
   let maxEdge=0;
   for(let i=0;i<indices.count;i+=3){
    for(let e=0;e<3;e++){
     const a=indices.getX(i+e),b=indices.getX(i+(e+1)%3);
     maxEdge=Math.max(maxEdge,Math.hypot(positions.getX(a)-positions.getX(b),positions.getY(a)-positions.getY(b),positions.getZ(a)-positions.getZ(b)));
    }
   }
   // Coarse mineral meshes previously exposed large flat triangles at visit/feed scale.
   assert.ok(maxEdge<.05,`${style} exceeds the close-up silhouette edge budget: ${maxEdge}`);
  }finally{geometry.dispose();}
 }
});

test('Crack morphology reproduces seed and explicit intent while changing network sites and orientation',()=>{
 const spec=createPreset('fracture',101),copy=structuredClone(spec);
 assert.deepEqual(fractureUniforms(copy),fractureUniforms(spec));
 copy.seed=102;
 const a=fractureUniforms(spec),b=fractureUniforms(copy);
 assert.deepEqual(a.uFractureA,b.uFractureA);assert.deepEqual(a.uFractureB.value.toArray().slice(0,3),b.uFractureB.value.toArray().slice(0,3));
 assert.notDeepEqual(a.uCells,b.uCells);assert.notDeepEqual(a.uFractureRotation,b.uFractureRotation);
 assert.ok(fractureCells(101,32).every(v=>Math.abs(v.length()-1)<1e-8));
 const sparse=fractureUniforms({...spec,geometry:{...spec.geometry,fractures:{...spec.geometry.fractures!,density:0}}});
 const dense=fractureUniforms({...spec,geometry:{...spec.geometry,fractures:{...spec.geometry.fractures!,density:1}}});
 assert.ok(dense.uCellCount.value>=sparse.uCellCount.value*4);
});
test('Legacy cracks get stable broad variation and new compilations must explicitly describe morphology',()=>{
 const spec=createPreset('fracture',101);delete spec.geometry.fractures;
 assert.doesNotThrow(()=>validateRenderSpec(spec));assert.ok(RenderSpecSchema.safeParse(spec).success);
 assert.equal(CompiledRenderSpecSchema.safeParse(spec).success,false);
 assert.deepEqual(fractureUniforms(spec),fractureUniforms(structuredClone(spec)));
 const variations=Array.from({length:64},(_,i)=>fractureForSeed(i*271+900071));
 for(const axis of Object.keys(variations[0]) as (keyof ReturnType<typeof fractureForSeed>)[]){
  const values=variations.map(v=>v[axis]);assert.ok(Math.max(...values)-Math.min(...values)>.65,`Insufficient ${axis} variation`);
 }
 for(const axis of Object.keys(variations[0])){
  for(const value of [-.1,1.1,NaN]){
   const invalid=createPreset('fracture');(invalid.geometry.fractures as any)[axis]=value;
   assert.throws(()=>validateRenderSpec(invalid));
  }
 }
});
