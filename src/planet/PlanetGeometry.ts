import { IcosahedronGeometry, SphereGeometry, Sphere, Vector3 } from 'three';
import type { RenderSpec } from './RenderSpec.ts';
export function createPlanetGeometry(spec: RenderSpec) {
  // Greenheck's mesh + GPU displacement approach: build once, displace on GPU.
  const res=spec.quality==='low'?96:spec.quality==='high'?256:192;
  const geometry=spec.geometry.type==='faceted'?new IcosahedronGeometry(1,7):new SphereGeometry(1,res,res);
  geometry.boundingSphere=new Sphere(new Vector3(),1.5);
  return geometry;
}
