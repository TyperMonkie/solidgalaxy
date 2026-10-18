import { Euler, Matrix3, Matrix4, Vector3, Vector4 } from 'three';
import type { FractureSpec, RenderSpec } from './RenderSpec.ts';
import { hashSeed } from './procedural.ts';

/** Continuous seeded morphology; no finite menu of crack-pattern presets. */
export function fractureForSeed(seed:number):FractureSpec{
 const r=(slot:number)=>hashSeed(seed,7400+slot);
 return {density:r(0),branching:r(1),directionality:Math.pow(r(2),1.5),distortion:.12+r(3)*.86,width:.08+r(4)*.84,coverage:.22+r(5)*.76,depth:.15+r(6)*.8};
}
export function fractureCells(seed:number,count:number){
 // Fully seeded spherical sites with uneven spacing, replacing the fixed
 // Fibonacci lattice. Fill unused slots so uniform-array size stays stable.
 return Array.from({length:32},(_,i)=>{
  const j=i%count,z=hashSeed(seed,8100+j*2)*1.92-.96,a=hashSeed(seed,8101+j*2)*Math.PI*2,r=Math.sqrt(1-z*z);
  return new Vector3(Math.cos(a)*r,z,Math.sin(a)*r);
 });
}
export function fractureUniforms(s:Pick<RenderSpec,'seed'|'geometry'>){
 const f=s.geometry.fractures??fractureForSeed(s.seed),count=6+Math.round(f.density*26);
 const rotation=new Matrix3().setFromMatrix4(new Matrix4().makeRotationFromEuler(new Euler(hashSeed(s.seed,7801)*Math.PI*2,hashSeed(s.seed,7802)*Math.PI*2,hashSeed(s.seed,7803)*Math.PI*2)));
 return {uCells:{value:fractureCells(s.seed,count)},uCellCount:{value:count},uFractureA:{value:new Vector4(f.density,f.branching,f.directionality,f.distortion)},uFractureB:{value:new Vector4(f.width,f.coverage,f.depth,hashSeed(s.seed,7804)*19)},uFractureRotation:{value:rotation}};
}
