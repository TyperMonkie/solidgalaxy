import { validateRenderSpec, type RenderSpec, type Style } from './RenderSpec.ts';
export const PRESET_INFO = {
  nebula: { name: 'NEBULA', subtitle: 'The quiet dreamer', description: 'Soft currents. Boundless possibilities.\nA little mystery, a world of your own.', number: '01', tag: 'FLUID / ATMOSPHERIC', color: '#b7a6ef' },
  fracture: { name: 'FRACTURE', subtitle: 'Beautifully uncontained', description: 'Born from change. Lit from within.\nThere is beauty in breaking the familiar.', number: '02', tag: 'TECTONIC / MOLTEN', color: '#e9a27c' },
  crystal: { name: 'CRYSTAL', subtitle: 'Clarity in the unexpected', description: 'Quiet precision. Extraordinary form.\nA thousand facets, one singular world.', number: '03', tag: 'MINERAL / SCULPTURAL', color: '#91d9d9' },
} as const;
export function createPreset(style: Style, seed = 78291): RenderSpec {
  const common: RenderSpec = {
    version: 1, style, seed, quality: 'balanced',
    geometry: { enabled: true, type: 'flowing', complexity: 0.7, displacement: 0.16 },
    material: { palette: ['#092e43','#6a6795','#96c9c5'], roughness: 0.64, metalness: 0.16, emission: 0.18 },
    atmosphere: { enabled: true, color: '#7162d4', strength: 0.24 },
    orbits: { enabled: true, type: 'ribbons', tilt: -0.37 },
    structures: { enabled: true, count: 0 },
    lighting: { enabled: true, intensity: 1.4, ambient: 0.12 },
    animation: { enabled: true, rotation: 0.035, flow: 0.18 },
    modules: { stars: false, clouds: false, postFX: true },
    mascot:{enabled:true,outfit:'classic',accessory:'none',accent:'#b7a6ef',label:'',meaning:'这只奶蛙还在等待你的故事。生成后，AI 会把你的偏爱组合成它的装扮与随身物件。'},
    landmarks:[],
  };
  if (style === 'fracture') {
    common.geometry = { enabled: true, type: 'tectonic', complexity: 0.8, displacement: 0.3 };
    common.material = { palette: ['#12141c','#555464','#ff9c58'], roughness: 0.83, metalness: 0.12, emission: 0.85 };
    common.atmosphere = { enabled: true, color: '#9a532c', strength: 0.22 };
    common.orbits = { enabled: true, type: 'broken', tilt: -0.5 };
    common.structures.count = 7; common.animation = { enabled: true, rotation: 0.024, flow: 0.32 };
  }
  if (style === 'crystal') {
    common.geometry = { enabled: true, type: 'faceted', complexity: 0.6, displacement: 0.13 };
    common.material = { palette: ['#111c32','#426687','#b1e7dd'], roughness: 0.62, metalness: 0.22, emission: 0.15 };
    common.atmosphere = { enabled: true, color: '#71b9d4', strength: 0.28 };
    common.orbits = { enabled: true, type: 'angular', tilt: 0.45 };
    common.structures.count = 0; common.animation = { enabled: true, rotation: 0.028, flow: 0.1 };
  }
  return validateRenderSpec(common);
}
