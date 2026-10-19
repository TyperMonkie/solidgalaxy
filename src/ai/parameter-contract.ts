import type { RenderSpec } from '../planet/RenderSpec.ts';
import { EXPRESSION_MODULES } from './schemas.ts';

export type ExpressionModule=typeof EXPRESSION_MODULES[number];
const owners:Record<string,ExpressionModule>={style:'geometry',geometry:'geometry',terrain:'geometry',material:'material',weather:'weather',atmosphere:'atmosphere',orbits:'orbits',structures:'structures',lighting:'lighting',bloom:'bloom',animation:'animation',mascot:'mascot',landmarks:'landmarks',symbols:'landmarks',background:'background',climate:'climate','modules.stars':'background','modules.clouds':'weather','modules.postFX':'bloom'};
const technical:Record<string,string>={version:'配置版本',seed:'可复现的生成标识，不是性格分数',quality:'设备绘制预算，不是性格特征'};
// Deliberately enumerate fields. Adding a schema field without a renderer owner
// must fail the contract test, rather than inherit a vague top-level promise.
const fields:Record<string,string>={
 geometry:'enabled type complexity displacement fractures',
 'geometry.fractures':'density branching directionality distortion width coverage depth',
 terrain:'noise amplitude sharpness offset period persistence lacunarity octaves relief bumpStrength bumpOffset colors transitions blends',
 material:'palette roughness metalness emission emissionPattern emissionFrequency emissionPulse',
 weather:'density opacity scale altitude thickness size minParticleSize maxParticleSize particles speed drift color',
 atmosphere:'enabled color strength altitude falloff surfaceRim',
 orbits:'enabled type tilt radius width layers arc eccentricity warp particles particleSize opacity speed precession inclination colors sides feather streamSpeed twinkle azimuth',
 structures:'enabled count kind scale spread altitude elongation',
 lighting:'enabled intensity ambient specular shininess direction color',
 bloom:'threshold strength radius',
 animation:'enabled rotation flow axis direction axialTilt',
 mascot:'enabled outfit accessory accent label meaning scale latitude longitude bob sway pace',
 'landmarks[]':'id icon label meaning color placement evidenceIds',
 symbols:'scale altitude spread labels',
 climate:'enabled regions',
 'climate.regions[]':'id label meaning kind latitude longitude radius intensity altitude particles particleSize streakLength speed windDirection windStrength turbulence opacity color cloudCoverage cloudColor lightning lightningColor vortexTwist vortexWidth direction surfaceInfluence',
 background:'enabled color starCount starSize brightness twinkle speed colors planets',
 'background.planets[]':'x y depth radius color accent rotation ring',
 modules:'stars clouds postFX',
};
const allowed=new Set(['style','landmarks',...Object.entries(fields).flatMap(([root,keys])=>keys.split(' ').map(key=>`${root}.${key}`))]);
export function parameterOwner(path:string){
 if(path in technical)return {technical:technical[path]};
 if(!allowed.has(path))throw new Error(`Unregistered renderer parameter: ${path}`);
 if(/^climate\.regions\[\]\.(id|meaning)$/.test(path))return {technical:'天气区域标识或生成解释'};
 if(/^(mascot\.meaning|landmarks\[\]\.((id|meaning)|evidenceIds(\[\])?))$/.test(path))return {technical:'解释、证据或内部标识'};
 const module=owners[path.startsWith('modules.')?path:path.split(/[.[]/,1)[0]];
 if(!module)throw new Error(`Unregistered renderer parameter: ${path}`);
 return {module};
}
export function parameterRows(spec:RenderSpec){
 const rows:{path:string;value:unknown;module?:ExpressionModule;technical?:string}[]=[];
 function walk(value:unknown,path:string){
  if(value&&typeof value==='object'&&!Array.isArray(value)){for(const [k,v]of Object.entries(value))walk(v,path?`${path}.${k}`:k);}
  else if(Array.isArray(value)&&value.some(v=>v&&typeof v==='object'))value.forEach((v,i)=>walk(v,`${path}[${i}]`));
  else rows.push({path,value,...parameterOwner(path.replace(/\[\d+\]/g,'[]'))});
 }
 walk(spec,'');return rows;
}
export function schemaParameterPaths(node:any,path=''):string[]{
 if(node.anyOf){const object=node.anyOf.find((n:any)=>n.type==='object');if(object)return schemaParameterPaths(object,path);}
 if(node.type==='object')return Object.entries(node.properties).flatMap(([k,v])=>schemaParameterPaths(v,path?`${path}.${k}`:k));
 if(node.type==='array'&&node.items?.type==='object')return schemaParameterPaths(node.items,path+'[]');
 return [path];
}
export const MODULE_CONSUMERS:Record<ExpressionModule,string[]>={geometry:['PlanetGeometry.ts','PlanetMaterial.ts','shaders/terrain.glsl'],material:['PlanetMaterial.ts','shaders/surface.frag.glsl','SurfaceStructures.ts'],weather:['PlanetClouds.ts','CloudReadout.ts'],atmosphere:['PlanetAtmosphere.ts','PlanetMaterial.ts'],orbits:['OrbitalGeometry.ts'],structures:['SurfaceStructures.ts'],lighting:['PlanetMaterial.ts','PlanetClouds.ts','PlanetAtmosphere.ts','PlanetCore.ts','UniverseCore.ts'],bloom:['PlanetPostFX.ts'],animation:['ArtSettings.ts','PlanetCore.ts','UniverseCore.ts'],mascot:['PlanetMascot.ts','ArtSettings.ts'],landmarks:['PlanetLandmarks.ts'],background:['SpaceBackdrop.ts','PlanetCore.ts','UniverseCore.ts'],climate:['PlanetWeather.ts','ClimateField.ts','PlanetMaterial.ts','PlanetClouds.ts','PlanetCore.ts','UniverseCore.ts']};
