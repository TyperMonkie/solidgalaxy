import { Color, ShaderMaterial } from 'three';
import type { RenderSpec } from './RenderSpec.ts';
import { hashSeed } from './procedural.ts';
import { fractureUniforms } from './FractureField.ts';
import greenheck from './vendor/greenheck-terrain.glsl?raw';
import terrain from './shaders/terrain.glsl?raw';
import vertex from './shaders/surface.vert.glsl?raw';
import fragment from './shaders/surface.frag.glsl?raw';
import fractures from './shaders/fractures.glsl?raw';
import { terrainSettings } from './ProceduralSettings.ts';
import layers from './vendor/greenheck-layers.glsl?raw';
export function createPlanetMaterial(s: RenderSpec){
  const t=terrainSettings(s);
  const header=greenheck+'\n'+fractures+'\n'+terrain+'\n';
  return new ShaderMaterial({ vertexShader:header+vertex, fragmentShader:header+layers+'\n'+fragment,
    uniforms:{...fractureUniforms(s),uTime:{value:0},uSeed:{value:(hashSeed(s.seed,4)-hashSeed(78291,4))*30},uStyle:{value:{flowing:0,tectonic:1,faceted:2}[s.geometry.type]},uPalette:{value:s.material.palette.map(c=>new Color(c))},uRoughness:{value:s.material.roughness},uMetalness:{value:s.material.metalness},uEmission:{value:s.material.emission},uLight:{value:s.lighting.enabled?s.lighting.intensity:0},uAmbient:{value:s.lighting.ambient},uComplexity:{value:s.geometry.complexity},uDisplacement:{value:s.geometry.displacement*(.45+s.geometry.complexity*.8)},
      uProcedural:{value:!!s.terrain},uNoiseType:{value:{simplex:1,fractal:2,ridged:3}[t.noise]},uAmplitude:{value:t.amplitude},uSharpness:{value:t.sharpness},uOffset:{value:t.offset},uPeriod:{value:t.period},uPersistence:{value:t.persistence},uLacunarity:{value:t.lacunarity},uOctaves:{value:Math.min(t.octaves,s.quality==='low'?6:10)},uRelief:{value:t.relief},uBumpStrength:{value:t.bumpStrength},uBumpOffset:{value:t.bumpOffset},
      uColors:{value:t.colors.map(c=>new Color(c))},uTransitions:{value:t.transitions},uBlends:{value:t.blends}}
  });
}

