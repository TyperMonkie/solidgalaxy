import type { RenderSpec } from './RenderSpec.ts';
import { weatherSettings } from './ProceduralSettings.ts';

/** Same budget used by geometry allocation. No inference of physical coverage. */
export function cloudParticleCount(s:RenderSpec){return s.quality==='low'?Math.min(1800,weatherSettings(s).particles):weatherSettings(s).particles;}
/** Match sprite footprint to projected planet size in studio and social cameras. */
export function cloudPointScale(pixelRatio:number,height:number,fov:number){return pixelRatio*height/700*Math.tan(35*Math.PI/360)/Math.tan(fov*Math.PI/360);}
export function cloudReadout(s:RenderSpec){
 const w=weatherSettings(s);
 return {enabled:s.modules.clouds,legacy:!s.weather,density:w.density,opacity:w.opacity,scale:w.scale,altitude:w.altitude,thickness:w.thickness,minSize:w.minParticleSize,maxSize:w.maxParticleSize,requestedParticles:w.particles,renderedParticles:s.modules.clouds?cloudParticleCount(s):0,speed:w.speed,drift:w.drift,color:w.color};
}
