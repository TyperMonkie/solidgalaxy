import { AdditiveBlending, BufferGeometry, CatmullRomCurve3, Color, DoubleSide, Float32BufferAttribute, Group, Matrix3, Matrix4, Mesh, NormalBlending, Points, ShaderMaterial, Texture, TubeGeometry, Vector3 } from 'three';
import type { RenderSpec, WeatherRegion } from './RenderSpec.ts';
import { hashSeed } from './procedural.ts';
import { weatherFrame, weatherPoint, regionParticleBudget, weatherFlashGLSL } from './ClimateField.ts';
import { cloudSpriteTexture } from './CloudTexture.ts';
import { lightingSettings } from './ProceduralSettings.ts';

const sphereGLSL=`vec3 capPoint(vec2 angle,float height){float a=length(angle);float k=a>.00001?sin(a)/a:1.;return vec3(angle.x*k,cos(a),angle.y*k)*(1.+height);}`;
/** Bind the same terrain field, so weather starts above mountains as well as oceans. */
export function conformWeatherToSurface(group:Group,surface:ShaderMaterial){
 const header=surface.userData.terrainHeader as string|undefined;if(!header)return;
 group.traverse(o=>{if((o instanceof Mesh||o instanceof Points)&&o.material instanceof ShaderMaterial&&o.material.userData.localWeather){
  const material=o.material,frame=new Matrix3().setFromMatrix4(new Matrix4().makeRotationFromQuaternion(o.parent!.quaternion));
  // Lightning is nested one group below its regional frame.
  if(o.parent?.name==='Regional lightning')frame.setFromMatrix4(new Matrix4().makeRotationFromQuaternion(o.parent.parent!.quaternion));
  material.uniforms={...surface.uniforms,...material.uniforms,uWeatherFrame:{value:frame}};
  material.vertexShader='#define PERSONAL_WEATHER_TERRAIN\n'+header+'\n'+material.vertexShader;
  material.needsUpdate=true;
 }});
}
function uniforms(r:WeatherRegion,index:number){return {
 uWeatherMotion:{value:1},uTime:{value:0},uPointScale:{value:1},uRadius:{value:r.radius},uHeight:{value:r.altitude},uIntensity:{value:r.intensity},uOpacity:{value:r.opacity},uColor:{value:new Color(r.color)},
 uSize:{value:r.particleSize},uStreak:{value:r.streakLength},uSpeed:{value:r.speed},uWind:{value:r.windStrength},uWindAngle:{value:r.windDirection},uTurbulence:{value:r.turbulence},uKind:{value:r.kind==='snow'?1:r.kind==='clear'?2:r.kind==='tornado'?3:0},
 uTwist:{value:r.vortexTwist},uVortexWidth:{value:Math.min(r.vortexWidth,r.radius*.8)},uDirection:{value:r.direction},uLightning:{value:r.lightning},uFlashColor:{value:new Color(r.lightningColor)},uPhase:{value:index*2.73},
};}
const weatherVertexSupport=`
#ifndef PERSONAL_WEATHER_TERRAIN
uniform float uTime;
#endif
uniform mat3 uWeatherFrame;
vec3 weatherTerrainPosition(vec3 p){
#ifdef PERSONAL_WEATHER_TERRAIN
 return normalize(p)*(length(p)+elevation(uWeatherFrame*normalize(p)));
#else
 return p;
#endif
}`;
function mark(material:ShaderMaterial){
 material.userData.localWeather=true;
 material.vertexShader=weatherVertexSupport+material.vertexShader.replace(/uniform float uTime,/g,'uniform float ');
 return material;
}

/** Immutable seeded attributes: the GPU evolves every drop, without per-frame allocations. */
export function precipitationGeometry(s:RenderSpec,r:WeatherRegion,index=0){
 const count=regionParticleBudget(s,r),rain=r.kind==='rain'||r.kind==='storm'||r.kind==='clear';
 const n=r.kind==='clear'?Math.min(count,36):count,positions:number[]=[],corners:number[]=[],indices:number[]=[];
 for(let i=0;i<n;i++){
  const random=(slot:number)=>hashSeed(s.seed,630000+index*20000+i*7+slot);
  const angle=random(0)*Math.PI*2,rad=Math.sqrt(random(1))*r.radius*.92,p=[Math.cos(angle)*rad,random(2),Math.sin(angle)*rad];
  if(rain){for(const corner of [[-1,0],[1,0],[-1,1],[1,1]]){positions.push(...p);corners.push(...corner);}const b=i*4;indices.push(b,b+1,b+2,b+2,b+1,b+3);}else positions.push(...p);
 }
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
 if(rain){geometry.setAttribute('aCorner',new Float32BufferAttribute(corners,2));geometry.setIndex(indices);}
 return geometry;
}

function precipitation(s:RenderSpec,r:WeatherRegion,index:number){
 const geometry=precipitationGeometry(s,r,index),rain=r.kind==='rain'||r.kind==='storm'||r.kind==='clear';
 const vertex=`${sphereGLSL}
 uniform float uTime,uRadius,uHeight,uIntensity,uSize,uStreak,uSpeed,uWind,uWindAngle,uTurbulence,uKind,uTwist,uVortexWidth,uDirection,uPointScale;
 varying float vFade;varying vec2 vUv;
 ${rain?'attribute vec2 aCorner;':''}
 void main(){
  float rate=uKind>1.5&&uKind<2.5?-.12:uKind>.5?.16:.95;
  float phase=fract(position.y+uTime*uSpeed*rate*(.75+uIntensity*.5));
  float height=.025+(1.-phase)*uHeight;
  vec2 wind=vec2(cos(uWindAngle),sin(uWindAngle));
  vec2 angle=position.xz+wind*uWind*(phase-.5)*uRadius*.7;
  angle+=vec2(sin(uTime*uSpeed*.6+position.y*35.),cos(uTime*uSpeed*.4+position.x*64.))*uTurbulence*uRadius*.17;
  if(uKind>2.5){height=.02+phase*uHeight;float a=position.y*6.283+uTime*uSpeed*uDirection*2.4+phase*uTwist*6.283;angle=vec2(cos(a),sin(a))*uVortexWidth*(.13+.87*phase)*(.65+abs(position.x)/uRadius*.5)+wind*uWind*phase*.1;}
  float span=length(angle);if(span>uRadius)angle*=uRadius/span;
  vec3 p=capPoint(angle,height);vec4 mv=modelViewMatrix*vec4(weatherTerrainPosition(p),1.);
  vFade=smoothstep(0.,.08,phase)*(1.-smoothstep(.87,1.,phase));
  ${rain?`vec3 end=capPoint(angle+wind*uWind*uStreak*.5,height+uStreak);vec4 top=modelViewMatrix*vec4(weatherTerrainPosition(end),1.);vec2 d=top.xy-mv.xy;vec2 side=normalize(vec2(-d.y,d.x)+vec2(.00001));mv=mix(mv,top,aCorner.y);mv.xy+=side*aCorner.x*uSize*.0012*length(modelMatrix[0].xyz);vUv=aCorner;`:`gl_PointSize=uSize*uPointScale*clamp(6.8/max(.1,-mv.z),.3,4.);vUv=vec2(0.);`}
  gl_Position=projectionMatrix*mv;
 }`;
 const material=mark(new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,blending:r.kind==='clear'?AdditiveBlending:NormalBlending,uniforms:uniforms(r,index),vertexShader:vertex,
 fragmentShader:`uniform vec3 uColor;uniform float uOpacity,uIntensity;varying float vFade;varying vec2 vUv;
 void main(){${rain?'float shape=pow(max(0.,1.-abs(vUv.x)),.7)*sin(vUv.y*3.14159);':'float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;float shape=exp(-d*d*3.8);'}gl_FragColor=vec4(uColor,shape*vFade*uOpacity*uIntensity);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`}));
 const object=rain?new Mesh(geometry,material):new Points(geometry,material);object.frustumCulled=false;object.name=r.kind==='clear'?'Sunlit shafts':r.kind==='tornado'?'Vortex debris':'Local precipitation';return object;
}

function cloudCap(s:RenderSpec,r:WeatherRegion,index:number,texture:Texture){
 const positions:number[]=[],sizes:number[]=[],count=Math.round((s.quality==='low'?20:48)*r.cloudCoverage);
 for(let i=0;i<count;i++){const rand=(n:number)=>hashSeed(s.seed,880000+index*1000+i*7+n),a=rand(0)*Math.PI*2,rad=Math.sqrt(rand(1))*r.radius*.83;positions.push(...weatherPoint(Math.cos(a)*rad,Math.sin(a)*rad,r.altitude+.025+rand(2)*.035).toArray());sizes.push((.65+rand(3)*.65)*r.radius*145);}
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('aSize',new Float32BufferAttribute(sizes,1));const light=lightingSettings(s);
 const material=mark(new ShaderMaterial({transparent:true,depthWrite:false,uniforms:{...uniforms(r,index),uCloud:{value:texture},uCloudColor:{value:new Color(r.cloudColor)},uLightDirection:{value:new Vector3(...light.direction).normalize()},uLightColor:{value:new Color(light.color)},uAmbient:{value:light.ambient},uLight:{value:light.enabled?light.intensity:0},uCoverage:{value:r.cloudCoverage}},
 vertexShader:`uniform float uTime,uSpeed,uWind,uWindAngle,uTurbulence,uPointScale;attribute float aSize;varying vec3 vNormal;
 void main(){vec3 p=position;float a=uTime*uSpeed*.035;vec2 drift=vec2(sin(a+position.x*7.),cos(a+position.z*7.))*uTurbulence*.008;p.xz+=drift+vec2(cos(uWindAngle),sin(uWindAngle))*sin(a)*uWind*.012;vec4 mv=modelViewMatrix*vec4(weatherTerrainPosition(p),1.);gl_Position=projectionMatrix*mv;gl_PointSize=aSize*uPointScale*length(modelMatrix[0].xyz)*clamp(6.8/max(.1,-mv.z),.25,3.);vNormal=normalize((modelMatrix*vec4(normalize(p),0.)).xyz);}`,
 fragmentShader:weatherFlashGLSL+`uniform sampler2D uCloud;uniform vec3 uCloudColor,uFlashColor,uLightColor,uLightDirection;uniform float uTime,uLightning,uPhase,uIntensity,uOpacity,uCoverage,uAmbient,uLight,uWeatherMotion;
 varying vec3 vNormal;void main(){vec4 tex=texture2D(uCloud,gl_PointCoord);float illumination=.18+uAmbient+uLight*max(0.,dot(normalize(vNormal),uLightDirection));vec3 color=uCloudColor*uLightColor*illumination+uFlashColor*weatherFlash(uTime,uLightning*uWeatherMotion,uPhase)*.8;gl_FragColor=vec4(color,tex.a*uOpacity*uIntensity*uCoverage*.2);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`}));material.userData.weatherCloud=true;material.uniforms.uLightning.value=r.kind==='storm'?r.lightning:0;const clouds=new Points(geometry,material);clouds.frustumCulled=false;clouds.name='Local weather cloud bank';return clouds;
}

export function tornadoFunnel(s:RenderSpec,r:WeatherRegion,index:number){
 const positions:number[]=[],uv:number[]=[],indices:number[]=[],rows=48,segments=s.quality==='low'?32:64;
 for(let y=0;y<=rows;y++)for(let a=0;a<=segments;a++){positions.push(a/segments,y/rows,0);uv.push(a/segments,y/rows);if(y<rows&&a<segments){const b=y*(segments+1)+a;indices.push(b,b+1,b+segments+1,b+1,b+segments+2,b+segments+1);}}
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));geometry.setIndex(indices);
 const material=mark(new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,uniforms:uniforms(r,index),
 vertexShader:sphereGLSL+`uniform float uTime,uSpeed,uWind,uWindAngle,uTurbulence,uTwist,uVortexWidth,uHeight,uDirection;varying vec2 vUv;
 void main(){vUv=uv;float h=uv.y,a=uv.x*6.283+uTime*uSpeed*uDirection*1.8;float rad=uVortexWidth*(.12+.88*pow(h,.8));rad*=1.+sin(a*3.+h*23.-uTime*uSpeed)*uTurbulence*.13;vec2 center=vec2(cos(uWindAngle),sin(uWindAngle))*uWind*h*.12+vec2(sin(h*5.+uTime*uSpeed*.4),cos(h*4.+uTime*uSpeed*.3))*sin(h*3.14159)*uTurbulence*.035;vec3 p=capPoint(center+vec2(cos(a),sin(a))*rad,.014+h*uHeight);gl_Position=projectionMatrix*modelViewMatrix*vec4(weatherTerrainPosition(p),1.);}`,
 fragmentShader:`uniform float uTime,uSpeed,uTwist,uIntensity,uOpacity,uDirection;uniform vec3 uColor;varying vec2 vUv;
 void main(){float stripe=.5+.5*sin(vUv.x*6.283-vUv.y*uTwist*6.283+uTime*uSpeed*uDirection*3.);float fine=.5+.5*sin(vUv.x*6.283*7.-vUv.y*37.+uTime*uSpeed*2.);float fade=smoothstep(0.,.05,vUv.y)*(1.-smoothstep(.82,1.,vUv.y));vec3 color=uColor*(.45+.55*stripe);gl_FragColor=vec4(color,fade*(.09+.35*pow(stripe,4.)+.06*fine)*uIntensity*uOpacity);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`}));const funnel=new Mesh(geometry,material);funnel.frustumCulled=false;funnel.name='Local spiral funnel';return funnel;
}

function lightning(s:RenderSpec,r:WeatherRegion,index:number){
 const group=new Group();group.name='Regional lightning';
 for(let branch=0;branch<2;branch++){
  const points:Vector3[]=[];const center=(hashSeed(s.seed,910000+index*10+branch)-.5)*r.radius;
  for(let j=0;j<8;j++){const h=1-j/7,dx=(hashSeed(s.seed,920000+index*100+branch*10+j)-.5)*r.radius*.2;points.push(weatherPoint(center+dx,branch*r.radius*.25,r.altitude*h+.025));}
  const geometry=new TubeGeometry(new CatmullRomCurve3(points),32,.0017*r.particleSize,4,false);
  const material=mark(new ShaderMaterial({transparent:true,depthWrite:false,blending:AdditiveBlending,uniforms:uniforms(r,index),vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(weatherTerrainPosition(position),1.);}',fragmentShader:weatherFlashGLSL+`uniform vec3 uFlashColor;uniform float uTime,uLightning,uPhase,uIntensity,uOpacity,uWeatherMotion;void main(){gl_FragColor=vec4(uFlashColor*2.,weatherFlash(uTime,uLightning*uWeatherMotion,uPhase)*uIntensity*uOpacity);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`}));group.add(new Mesh(geometry,material));
 }return group;
}

/** Globe-local artistic effects. No weather simulation or external executable effects. */
export function createLocalWeather(s:RenderSpec,texture?:Texture){
 const group=new Group();group.name='Personal local weather';
 if(!s.climate?.enabled)return group;
 s.climate.regions.forEach((region,index)=>{
  const patch=new Group();patch.name=region.label;patch.userData.weatherRegionId=region.id;patch.quaternion.copy(weatherFrame(region));patch.visible=region.intensity>0&&region.opacity>0;
  if(region.particles>0)patch.add(precipitation(s,region,index));
  if(region.kind!=='clear'&&region.cloudCoverage>0)patch.add(cloudCap(s,region,index,texture??cloudSpriteTexture()));
  if(region.kind==='tornado')patch.add(tornadoFunnel(s,region,index));
  if(region.kind==='storm'&&region.lightning>0)patch.add(lightning(s,region,index));
  group.add(patch);
 });return group;
}
