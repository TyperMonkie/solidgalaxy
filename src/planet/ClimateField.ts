import { Color, Matrix3, Quaternion, Vector3, type Object3D, type ShaderMaterial } from 'three';
import type { LocalWeatherKind, RenderSpec, WeatherRegion } from './RenderSpec.ts';

export const MAX_WEATHER_REGIONS=5;
export const WEATHER_NAMES:Record<LocalWeatherKind,string>={clear:'晴空',rain:'降雨',storm:'雷暴',snow:'飘雪',tornado:'龙卷风'};
export const weatherKindCode=(kind:LocalWeatherKind)=>({clear:1,rain:2,storm:3,snow:4,tornado:5}[kind]);
export function weatherAnchor(region:Pick<WeatherRegion,'latitude'|'longitude'>){return new Vector3(Math.cos(region.latitude)*Math.sin(region.longitude),Math.sin(region.latitude),Math.cos(region.latitude)*Math.cos(region.longitude));}
export function weatherFrame(region:Pick<WeatherRegion,'latitude'|'longitude'>){return new Quaternion().setFromUnitVectors(new Vector3(0,1,0),weatherAnchor(region));}
/** Bounded spherical-cap coordinates, with height measured radially from the globe. */
export function weatherPoint(x:number,z:number,height:number){const angle=Math.hypot(x,z),k=angle>1e-8?Math.sin(angle)/angle:1;return new Vector3(x*k,Math.cos(angle),z*k).multiplyScalar(1+height);}
export function regionParticleBudget(s:RenderSpec,r:WeatherRegion){return s.quality==='low'?Math.min(r.particles,450):r.particles;}
export function createWeatherRegion(kind:LocalWeatherKind,index=0):WeatherRegion{return {
 id:`weather-${Date.now().toString(36)}-${index}`,label:WEATHER_NAMES[kind],meaning:'手动添加的局部天气，可自由微调；不代表 AI 对你的解读。',kind,
 latitude:[.38,-.35,.12,-.52,.6][index%5],longitude:[-.35,.48,1.5,-1.7,2.6][index%5],radius:.32,intensity:.65,altitude:.28,particles:kind==='snow'?360:600,particleSize:kind==='snow'?2.2:1.3,streakLength:.045,
 speed:1,windDirection:.4,windStrength:.22,turbulence:.35,opacity:.7,color:kind==='snow'?'#E6F5FF':kind==='clear'?'#FFE5A4':'#9ECFFF',cloudCoverage:kind==='clear'?0:.65,cloudColor:kind==='storm'?'#66758A':'#C5D7E6',lightning:kind==='storm'?.45:0,lightningColor:'#DDEAFF',vortexTwist:4.5,vortexWidth:.12,direction:1,surfaceInfluence:.4,
};}
export function climateUniforms(s:RenderSpec){
 const regions=s.climate?.enabled?s.climate.regions:[];
 const values=<T>(get:(r:WeatherRegion)=>T,fallback:()=>T)=>Array.from({length:MAX_WEATHER_REGIONS},(_,i)=>regions[i]?get(regions[i]):fallback());
 return {
  uClimateCount:{value:regions.length},uClimateTime:{value:0},uClimateCloudRotation:{value:new Matrix3()},
  uClimateCenters:{value:values(weatherAnchor,()=>new Vector3(0,1,0))},uClimateRadius:{value:values(r=>r.radius,()=>.1)},
  uClimateKinds:{value:values(r=>weatherKindCode(r.kind),()=>0)},uClimateIntensity:{value:values(r=>r.intensity,()=>0)},
  uClimateSurface:{value:values(r=>r.surfaceInfluence,()=>0)},uClimateLightning:{value:values(r=>r.lightning,()=>0)},
  uClimateColors:{value:values(r=>new Color(r.color),()=>new Color())},uClimateFlashColors:{value:values(r=>new Color(r.lightningColor),()=>new Color())},
 };
}
export function updateClimateUniforms(materials:ShaderMaterial[],time:number,clouds?:Object3D|null,active=true){
 if(clouds)clouds.updateMatrix();
 for(const material of materials){
  if(material.uniforms.uClimateTime)material.uniforms.uClimateTime.value=active?time:0;
  if(material.uniforms.uWeatherMotion)material.uniforms.uWeatherMotion.value=active?1:0;
  if(clouds&&material.uniforms.uClimateCloudRotation)material.uniforms.uClimateCloudRotation.value.setFromMatrix4(clouds.matrix);
 }
}
/** Original artistic weather field. Positions are globe-local, shared by clouds and surface. */
export const weatherFlashGLSL=`
float weatherFlash(float time,float rate,float phase){
 if(time<=0.||rate<=0.)return 0.;
 float period=mix(28.,5.,rate),p=mod(time+phase,period);
 return (1.-smoothstep(.035,.16,p))*rate;
}`;
export const climateGLSL=weatherFlashGLSL+`
uniform int uClimateCount;
uniform float uClimateTime,uClimateRadius[5],uClimateKinds[5],uClimateIntensity[5],uClimateSurface[5],uClimateLightning[5];
uniform vec3 uClimateCenters[5],uClimateColors[5],uClimateFlashColors[5];
uniform mat3 uClimateCloudRotation;
float climateMask(vec3 p,int i){return smoothstep(cos(uClimateRadius[i]),cos(uClimateRadius[i]*.6),dot(normalize(p),uClimateCenters[i]));}
float climateCloudTransmission(vec3 p){float transmission=1.;for(int i=0;i<5;i++){if(i>=uClimateCount)break;if(uClimateKinds[i]<1.5)transmission*=1.-climateMask(p,i)*uClimateIntensity[i];}return transmission;}
void applyClimateSurface(vec3 p,inout vec3 color,inout float rough){
 for(int i=0;i<5;i++){if(i>=uClimateCount)break;float amount=climateMask(p,i)*uClimateIntensity[i]*uClimateSurface[i];
  if(uClimateKinds[i]>1.5&&uClimateKinds[i]<3.5){color*=1.-amount*.28;rough=mix(rough,rough*.18,amount);}
  if(uClimateKinds[i]>3.5&&uClimateKinds[i]<4.5){color=mix(color,uClimateColors[i],amount*.8);rough=mix(rough,.93,amount);}
 }
}
vec3 climateSurfaceGlow(vec3 p){vec3 glow=vec3(0.);for(int i=0;i<5;i++){if(i>=uClimateCount)break;float m=climateMask(p,i)*uClimateIntensity[i]*uClimateSurface[i];
 if(uClimateKinds[i]<1.5)glow+=uClimateColors[i]*m*.2;
 if(uClimateKinds[i]>2.5&&uClimateKinds[i]<3.5)glow+=uClimateFlashColors[i]*m*weatherFlash(uClimateTime,uClimateLightning[i],float(i)*2.73)*.45;
 }return glow;}
`;
