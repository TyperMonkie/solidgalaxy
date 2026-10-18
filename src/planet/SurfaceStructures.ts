import { DodecahedronGeometry, InstancedMesh, MeshPhysicalMaterial, Object3D, Vector3, Color } from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import type { RenderSpec } from './RenderSpec.ts';
import { hashSeed } from './procedural.ts';
// Hexagonal terminated mineral prisms; ConvexGeometry from Three.js (MIT).
function mineralGeometry(){
 const pts:Vector3[]=[];
 for(let i=0;i<6;i++){const a=i*Math.PI/3;pts.push(new Vector3(Math.cos(a),-.5,Math.sin(a)));pts.push(new Vector3(Math.cos(a)*.88,.22+(i%2)*.06,Math.sin(a)*.88));}
 pts.push(new Vector3(.12,.62,-.08));return new ConvexGeometry(pts);
}
export function createStructures(s:RenderSpec){
 const crystal=s.geometry.type==='faceted';
 const geometry=crystal?mineralGeometry():new DodecahedronGeometry(1,0);
 const mat=new MeshPhysicalMaterial({color:crystal?'#6b99ac':'#292d37',metalness:crystal?.45:.22,roughness:crystal?.23:.87,clearcoat:crystal?.6:0,clearcoatRoughness:.1,envMapIntensity:.35,emissive:crystal?'#0a2b31':'#241106',emissiveIntensity:.15,flatShading:true});
 const mesh=new InstancedMesh(geometry,mat,s.structures.count),dummy=new Object3D(),up=new Vector3(0,1,0);
 for(let i=0;i<s.structures.count;i++){
  const r=(slot:number)=>hashSeed(s.seed,100+i*7+slot);
  const y=crystal?-.35+r(1)*1.25:r(1)*2-1,a=r(2)*Math.PI*2,rad=Math.sqrt(1-y*y),dir=new Vector3(Math.cos(a)*rad,y,Math.sin(a)*rad);
  const length=crystal?.22+r(3)*.43:.07+r(3)*.09;
  dummy.position.copy(dir).multiplyScalar(crystal?1.0+length*.3:1.23+r(4)*.18);
  dummy.quaternion.setFromUnitVectors(up,dir);dummy.rotateY(r(5)*Math.PI);dummy.rotateX((r(4)-.5)*.3);
  const width=crystal?.085+r(6)*.12:length*.9;
  if(crystal)dummy.scale.set(width,length,width*.8);else dummy.scale.set(length*1.2,length*.36,length*.7);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  mesh.setColorAt(i,new Color().setHSL(crystal?.54:.08,crystal?.2:.08,.4+r(5)*.38));
 }
 return mesh;
}

