import { DodecahedronGeometry, InstancedMesh, MeshPhysicalMaterial, Object3D, Vector3, Color } from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import type { RenderSpec } from './RenderSpec.ts';
import { hashSeed } from './procedural.ts';
import { structureSettings } from './ArtSettings.ts';
// Hexagonal terminated mineral prisms; ConvexGeometry from Three.js (MIT).
function mineralGeometry(){
 const pts:Vector3[]=[];
 for(let i=0;i<6;i++){const a=i*Math.PI/3;pts.push(new Vector3(Math.cos(a),-.5,Math.sin(a)));pts.push(new Vector3(Math.cos(a)*.88,.22+(i%2)*.06,Math.sin(a)*.88));}
 pts.push(new Vector3(.12,.62,-.08));return new ConvexGeometry(pts);
}
export function createStructures(s:RenderSpec){
 const settings=structureSettings(s),crystal=settings.kind==='mineral';
 const geometry=crystal?mineralGeometry():new DodecahedronGeometry(1,0);
 const palette=s.material.palette.map(c=>new Color(c));
 const complexity=settings.spread, relief=s.geometry.displacement/.4;
 const mat=new MeshPhysicalMaterial({color:'#ffffff',metalness:s.material.metalness,roughness:s.material.roughness,clearcoat:crystal?.6:.15,clearcoatRoughness:.1,envMapIntensity:.45,emissive:palette[2],emissiveIntensity:s.material.emission*.12,flatShading:true});
 const mesh=new InstancedMesh(geometry,mat,s.structures.count),dummy=new Object3D(),up=new Vector3(0,1,0);
 for(let i=0;i<s.structures.count;i++){
  const r=(slot:number)=>hashSeed(s.seed,100+i*7+slot);
  // Low-complexity worlds grow in a tilted belt; complex worlds scatter across the globe.
  const y=(r(1)*2-1)*(.35+.65*complexity),a=r(2)*Math.PI*2+Math.sin(y*5)*(.8-complexity*.6),rad=Math.sqrt(1-y*y),dir=new Vector3(Math.cos(a)*rad,y,Math.sin(a)*rad);
  const length=crystal?(.06+r(3)*(.07+complexity*.03))*(.8+relief*.3):(.045+r(3)*(.07+complexity*.08))*(.8+relief*.75);
  dummy.position.copy(dir).multiplyScalar(1+settings.altitude+(crystal?length*.12:r(4)*.07));
  dummy.quaternion.setFromUnitVectors(up,dir);dummy.rotateY(r(5)*Math.PI);dummy.rotateX((r(4)-.5)*.3);
  const width=crystal?(.018+r(6)*.025)*(.8+complexity*.3):length*.9;
  if(crystal)dummy.scale.set(width,length,width*.8);else dummy.scale.set(length*1.2,length*.36,length*.7);dummy.scale.multiplyScalar(settings.scale);dummy.scale.y*=settings.elongation;dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  mesh.setColorAt(i,palette[i%3].clone().lerp(palette[(i+1)%3],r(5)*.45).lerp(new Color('#ffffff'),crystal?.12+r(6)*.2:r(6)*.08));
 }
 return mesh;
}

