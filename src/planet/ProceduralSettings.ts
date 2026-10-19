import { Color, SRGBColorSpace } from 'three';
import type { RenderSpec, TerrainSpec, WeatherSpec, LightingSpec, BloomSpec, OrbitSpec } from './RenderSpec.ts';
import { hashSeed } from './procedural.ts';

/** Original main.js values, radius 20 normalized to our unit-radius planet. */
export function greenheckTerrain():TerrainSpec {
 return {noise:'fractal',amplitude:1.19,sharpness:2.6,offset:-.016,period:.6,persistence:.484,lacunarity:1.8,octaves:10,relief:.05,bumpStrength:1,bumpOffset:.001,
  // Upstream uses linear RGB; preserve its colours through our sRGB contract.
  colors:[[.014,.117,.279],[.080,.527,.351],[.620,.516,.372],[.149,.254,.084],[.15,.15,.15]].map(c=>'#'+new Color(...c as [number,number,number]).getHexString()) as TerrainSpec['colors'],
  transitions:[.071,.215,.372,1.2],blends:[.152,.152,.104,.168]};
}
export function greenheckWeather():WeatherSpec{return {density:0,opacity:.35,scale:.4,altitude:.05,thickness:.075,minParticleSize:50,maxParticleSize:100,particles:4000,speed:.03,drift:.012,color:'#ffffff'};}
export function greenheckLighting():Required<LightingSpec>{return {enabled:true,intensity:1,ambient:.02,specular:2,shininess:10,direction:[1,1,1],color:'#ffffff'};}
export function greenheckBloom():BloomSpec{return {threshold:0,strength:.2,radius:.5};}
export function lightingSettings(s:RenderSpec):Required<LightingSpec>{return {specular:s.lighting.intensity*.55,shininess:10,direction:[-.476,.595,.646],color:'#ffffff',...s.lighting};}
export function bloomSettings(s:RenderSpec):BloomSpec{return s.bloom??{threshold:1,strength:.16,radius:.35};}
export function orbitSettings(s:RenderSpec):Required<OrbitSpec>{return {radius:1.65,width:.2,layers:s.orbits.type==='angular'?8:s.orbits.type==='broken'?9:10,arc:s.orbits.type==='broken'?.72:4.8,eccentricity:0,warp:s.orbits.type==='angular'?.006:.06,particles:s.orbits.type==='dust'?6200:2200,particleSize:2,opacity:.8,speed:.045,precession:.08,inclination:1.08,colors:[s.material.palette[1],s.material.palette[2]],...s.orbits};}
/** Compatibility resolver: old DNA is still accepted without rewriting saved stories. */
export function terrainSettings(s:RenderSpec):TerrainSpec{return s.terrain??{...greenheckTerrain(),relief:s.geometry.displacement*.32,colors:[s.material.palette[0],s.material.palette[1],s.material.palette[2],s.material.palette[1],'#d9dedc']};}
export function weatherSettings(s:RenderSpec):Required<WeatherSpec>{const w=s.weather??greenheckWeather(),size=w.size??75;return {...w,size,minParticleSize:w.minParticleSize??size*2/3,maxParticleSize:w.maxParticleSize??Math.min(200,size*4/3)};}

/** Continuous seeded sampling, not selection among named planet templates. */
export function proceduralSettings(seed:number):{terrain:TerrainSpec;weather:WeatherSpec}{
 const r=(n:number)=>hashSeed(seed,22000+n),between=(n:number,a:number,b:number)=>a+(b-a)*r(n);
 const hue=r(0),contrast=between(1,.07,.28),sat=between(2,.25,.78);
 const color=(h:number,s:number,l:number)=>'#'+new Color().setHSL((h+1)%1,s,l,SRGBColorSpace).getHexString();
 const transitions:[number,number,number,number]=[between(3,.04,.16),between(4,.2,.38),between(5,.42,.68),between(6,.78,1.3)];
 return {terrain:{noise:r(7)<.18?'simplex':r(7)<.68?'fractal':'ridged',amplitude:between(8,.85,1.45),sharpness:between(9,.8,4.8),offset:between(10,-.3,.18),period:between(11,.18,1.8),persistence:between(12,.32,.68),lacunarity:between(13,1.45,2.65),octaves:8,relief:between(14,.025,.115),bumpStrength:between(15,.38,1),bumpOffset:.001,
  colors:[color(hue,sat,.12),color(hue+contrast,sat*.75,.31),color(hue+contrast*1.3,sat*.62,.55),color(hue+contrast*.7,sat*.5,.34),color(hue,.15,.83)],transitions,blends:[between(16,.015,.09),between(17,.025,.12),between(18,.025,.12),between(19,.04,.18)]},
  weather:{...greenheckWeather(),density:between(20,-.45,.22),opacity:between(21,.12,.32),scale:between(22,.12,.85),altitude:between(23,.04,.10),thickness:between(24,.025,.12),minParticleSize:between(25,20,65),maxParticleSize:between(28,75,140),particles:Math.round(between(29,1800,7500)),speed:between(26,.008,.065),drift:between(27,-.035,.035)}};
}
