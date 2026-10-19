import { Vector3, type Object3D } from 'three';
import type { RenderSpec, MascotSpec, BackgroundSpec } from './RenderSpec.ts';

/** Resolvers only preserve older saves. New compiled worlds must supply all fields. */
export const atmosphereSettings=(s:RenderSpec)=>({altitude:.075,falloff:5,surfaceRim:s.atmosphere.strength*.12,...s.atmosphere});
export const structureSettings=(s:RenderSpec)=>({kind:s.geometry.type==='faceted'?'mineral' as const:'rock' as const,scale:1,spread:s.geometry.complexity,altitude:s.geometry.type==='faceted'?.015:.08+s.geometry.displacement*.5,elongation:1,...s.structures});
export const motionSettings=(s:RenderSpec)=>({axis:[0,1,0] as [number,number,number],direction:1 as -1|1,axialTilt:-.19,...s.animation});
export const mascotSettings=(s:MascotSpec)=>({scale:1,latitude:Math.asin(new Vector3(.28,.43,.86).normalize().y),longitude:Math.atan2(.28,.86),bob:.009,sway:.018,pace:1.4,...s});
export function mascotAnchor(s:MascotSpec){const m=mascotSettings(s);return new Vector3(Math.cos(m.latitude)*Math.sin(m.longitude),Math.sin(m.latitude),Math.cos(m.latitude)*Math.cos(m.longitude));}
export const symbolSettings=(s:RenderSpec)=>s.symbols??{scale:1,altitude:.14,spread:1,labels:true};
export function advanceGlobe(object:Object3D,s:RenderSpec,dt:number,factor=1){const m=motionSettings(s);object.rotateOnAxis(new Vector3(...m.axis).normalize(),dt*m.rotation*m.direction*factor);}
export function updateMascot(object:Object3D,s:MascotSpec,time:number){const m=mascotSettings(s);object.position.y=m.bob?Math.sin(time*m.pace)*m.bob:0;if('material' in object)(object.material as {rotation:number}).rotation=m.sway?Math.sin(time*m.pace*.6/1.4)*m.sway:0;}
export function backgroundSettings(s?:RenderSpec):BackgroundSpec{return s?.background??{enabled:true,color:'#020306',starCount:920,starSize:1,brightness:1,twinkle:.25,speed:1,colors:['#b8d6ec','#e8e4cf','#c9b7dd'],planets:[{x:-.78,y:.57,depth:23,radius:.49,color:'#243546',accent:'#718a91',rotation:.006,ring:false},{x:.77,y:.76,depth:28,radius:.33,color:'#4d2d28',accent:'#b58668',rotation:.008,ring:false},{x:.82,y:-.63,depth:25,radius:.56,color:'#292942',accent:'#a194bf',rotation:.01,ring:true}]};}
