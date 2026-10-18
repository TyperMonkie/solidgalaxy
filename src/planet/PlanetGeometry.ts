import { SphereGeometry, Sphere, Vector3 } from 'three';
import type { RenderSpec } from './RenderSpec.ts';
export function createPlanetGeometry(spec: RenderSpec) {
  // Greenheck's mesh + GPU displacement approach: build once, displace on GPU.
  const res=spec.quality==='low'?96:spec.quality==='high'?256:192;
  // A mineral world still needs a continuous, detailed globe at close range.
  // Family differences belong to the terrain/material, not a low-poly base mesh.
  const geometry=new SphereGeometry(1,res,res);
  geometry.boundingSphere=new Sphere(new Vector3(),1.5);
  return geometry;
}
