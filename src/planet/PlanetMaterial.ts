import { Color, ShaderMaterial } from 'three';
import type { RenderSpec } from './RenderSpec.ts';
import { cellsForSeed, hashSeed } from './procedural.ts';
import greenheck from './vendor/greenheck-terrain.glsl?raw';
import terrain from './shaders/terrain.glsl?raw';
import vertex from './shaders/surface.vert.glsl?raw';
import fragment from './shaders/surface.frag.glsl?raw';
export function createPlanetMaterial(s: RenderSpec){
  const header=greenheck+'\n'+terrain+'\n';
  return new ShaderMaterial({ vertexShader:header+vertex, fragmentShader:header+fragment,
    uniforms:{uTime:{value:0},uSeed:{value:(hashSeed(s.seed,4)-hashSeed(78291,4))*30},uStyle:{value:{flowing:0,tectonic:1,faceted:2}[s.geometry.type]},uPalette:{value:s.material.palette.map(c=>new Color(c))},uCells:{value:cellsForSeed(s.seed)},uRoughness:{value:s.material.roughness},uMetalness:{value:s.material.metalness},uEmission:{value:s.material.emission},uLight:{value:s.lighting.enabled?s.lighting.intensity:0},uAmbient:{value:s.lighting.ambient},uComplexity:{value:s.geometry.complexity},uDisplacement:{value:s.geometry.displacement*(.45+s.geometry.complexity*.8)},uOctaves:{value:s.quality==='low'?5:s.quality==='high'?10:8}}
  });
}

