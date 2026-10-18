import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlanetGeometry } from '../src/planet/PlanetGeometry.ts';
import { createPreset } from '../src/planet/PlanetPresets.ts';

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
