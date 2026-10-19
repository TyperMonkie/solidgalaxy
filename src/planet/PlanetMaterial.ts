import { Color, ShaderMaterial, Vector3 } from 'three';
import type { RenderSpec } from './RenderSpec.ts';
import { hashSeed } from './procedural.ts';
import { fractureUniforms } from './FractureField.ts';
import greenheck from './vendor/greenheck-terrain.glsl?raw';
import terrain from './shaders/terrain.glsl?raw';
import vertex from './shaders/surface.vert.glsl?raw';
import fragment from './shaders/surface.frag.glsl?raw';
import fractures from './shaders/fractures.glsl?raw';
import { terrainSettings, lightingSettings } from './ProceduralSettings.ts';
import { climateGLSL, climateUniforms } from './ClimateField.ts';
import { atmosphereSettings } from './ArtSettings.ts';
import layers from './vendor/greenheck-layers.glsl?raw';
export function createPlanetMaterial(s: RenderSpec){
  const t=terrainSettings(s),l=lightingSettings(s);
  const header=greenheck+'\n'+fractures+'\n'+terrain+'\n';
  const material=new ShaderMaterial({ vertexShader:header+vertex, fragmentShader:header+layers+'\n'+climateGLSL+'\n'+fragment,
    uniforms:{...climateUniforms(s),...fractureUniforms(s),uTime:{value:0},uSeed:{value:(hashSeed(s.seed,4)-hashSeed(78291,4))*30},uStyle:{value:{flowing:0,tectonic:1,faceted:2}[s.geometry.type]},uPalette:{value:s.material.palette.map(c=>new Color(c))},uRoughness:{value:s.material.roughness},uMetalness:{value:s.material.metalness},uEmission:{value:s.material.emission},uLight:{value:s.lighting.enabled?s.lighting.intensity:0},uAmbient:{value:s.lighting.ambient},uComplexity:{value:s.geometry.complexity},uDisplacement:{value:s.geometry.displacement*(.45+s.geometry.complexity*.8)},
      uProcedural:{value:!!s.terrain},uNoiseType:{value:{simplex:1,fractal:2,ridged:3}[t.noise]},uAmplitude:{value:t.amplitude},uSharpness:{value:t.sharpness},uOffset:{value:t.offset},uPeriod:{value:t.period},uPersistence:{value:t.persistence},uLacunarity:{value:t.lacunarity},uOctaves:{value:Math.min(t.octaves,s.quality==='low'?6:10)},uRelief:{value:t.relief},uBumpStrength:{value:t.bumpStrength},uBumpOffset:{value:t.bumpOffset},
      uLightDirection:{value:new Vector3(...l.direction).normalize()},uLightColor:{value:new Color(l.color)},uSpecular:{value:l.enabled?l.specular:0},uShininess:{value:l.shininess},uExplicitLighting:{value:s.lighting.specular!==undefined},uRimStrength:{value:s.atmosphere.enabled?atmosphereSettings(s).surfaceRim:0},uRimColor:{value:new Color(s.atmosphere.color)},uEmissionPattern:{value:s.material.emissionPattern===undefined?-1:{none:0,fissures:1,contours:2,mineral:3}[s.material.emissionPattern]},uEmissionFrequency:{value:s.material.emissionFrequency??20},uEmissionPulse:{value:s.material.emissionPulse??.15},
      uColors:{value:t.colors.map(c=>new Color(c))},uTransitions:{value:t.transitions},uBlends:{value:t.blends}}
  });
  material.userData.terrainHeader=header;return material;
}

