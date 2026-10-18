import { Color, SRGBColorSpace } from 'three';
import type { RenderSpec, TerrainSpec, WeatherSpec } from './RenderSpec.ts';
import { hashSeed } from './procedural.ts';

/** Original main.js values, radius 20 normalized to our unit-radius planet. */
export function greenheckTerrain():TerrainSpec {
 return {noise:'fractal',amplitude:1.19,sharpness:2.6,offset:-.016,period:.6,persistence:.484,lacunarity:1.8,octaves:10,relief:.05,bumpStrength:1,bumpOffset:.001,
  // Upstream uses linear RGB; preserve its colours through our sRGB contract.
  colors:[[.014,.117,.279],[.080,.527,.351],[.620,.516,.372],[.149,.254,.084],[.15,.15,.15]].map(c=>'#'+new Color(...c as [number,number,number]).getHexString()) as TerrainSpec['colors'],
  transitions:[.071,.215,.372,1.2],blends:[.152,.152,.104,.168]};
}
export function greenheckWeather():WeatherSpec{return {density:0,opacity:.35,scale:.4,altitude:.05,thickness:.075,size:75,particles:4000,speed:.03,drift:.012,color:'#ffffff'};}
/** Compatibility resolver: old DNA is still accepted without rewriting saved stories. */
export function terrainSettings(s:RenderSpec):TerrainSpec{return s.terrain??{...greenheckTerrain(),relief:s.geometry.displacement*.32,colors:[s.material.palette[0],s.material.palette[1],s.material.palette[2],s.material.palette[1],'#d9dedc']};}
export function weatherSettings(s:RenderSpec):WeatherSpec{return s.weather??greenheckWeather();}

/** Continuous seeded sampling, not selection among named planet templates. */
export function proceduralSettings(seed:number):{terrain:TerrainSpec;weather:WeatherSpec}{
 const r=(n:number)=>hashSeed(seed,22000+n),between=(n:number,a:number,b:number)=>a+(b-a)*r(n);
 const hue=r(0),contrast=between(1,.07,.28),sat=between(2,.25,.78);
 const color=(h:number,s:number,l:number)=>'#'+new Color().setHSL((h+1)%1,s,l,SRGBColorSpace).getHexString();
 const transitions:[number,number,number,number]=[between(3,.04,.16),between(4,.2,.38),between(5,.42,.68),between(6,.78,1.3)];
 return {terrain:{noise:r(7)<.18?'simplex':r(7)<.68?'fractal':'ridged',amplitude:between(8,.85,1.45),sharpness:between(9,.8,4.8),offset:between(10,-.3,.18),period:between(11,.18,1.8),persistence:between(12,.32,.68),lacunarity:between(13,1.45,2.65),octaves:8,relief:between(14,.025,.115),bumpStrength:between(15,.38,1),bumpOffset:.001,
  colors:[color(hue,sat,.12),color(hue+contrast,sat*.75,.31),color(hue+contrast*1.3,sat*.62,.55),color(hue+contrast*.7,sat*.5,.34),color(hue,.15,.83)],transitions,blends:[between(16,.015,.09),between(17,.025,.12),between(18,.025,.12),between(19,.04,.18)]},
  weather:{...greenheckWeather(),density:between(20,-.45,.22),opacity:between(21,.12,.32),scale:between(22,.12,.85),altitude:between(23,.04,.10),thickness:between(24,.025,.12),size:between(25,45,110),speed:between(26,.008,.065),drift:between(27,-.035,.035)}};
}
