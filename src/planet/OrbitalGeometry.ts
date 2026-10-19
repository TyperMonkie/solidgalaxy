import { BufferGeometry, Float32BufferAttribute, Group, Mesh, Points, ShaderMaterial, DoubleSide, Color, AdditiveBlending, Vector3 } from 'three';
import type { RenderSpec } from './RenderSpec.ts';
import { hashSeed } from './procedural.ts';
import { orbitSettings, lightingSettings } from './ProceduralSettings.ts';

/** Geometry, spacing, particles and motion all come from the compiled world. */
export function createOrbits(s:RenderSpec){
 const o=orbitSettings(s),l=lightingSettings(s),group=new Group();group.name='Personal orbital composition';group.userData.orbits=true;
 group.rotation.set(o.inclination,o.azimuth,o.tilt);
 const primary=new Color(o.colors[0]),secondary=new Color(o.colors[1]);
 const dustOnly=o.type==='dust',broken=o.type==='broken',angular=o.type==='angular';
 const phase=hashSeed(s.seed,39001)*Math.PI*2,sides=o.sides;
 const radiusAt=(a:number,r:number)=>angular?r*Math.cos(Math.PI/sides)/Math.cos(((a%(Math.PI*2/sides))+(Math.PI*2/sides))%(Math.PI*2/sides)-Math.PI/sides):r;
 const shape=(a:number,r:number,z:number)=>[Math.cos(a)*radiusAt(a,r),Math.sin(a)*radiusAt(a,r)*Math.sqrt(1-o.eccentricity*o.eccentricity),z];
 // Dust is a points-only orbit. Other families may also carry optional dust.
 const layers=dustOnly?0:o.layers;
 for(let k=0;k<layers;k++){
  const veil=k<Math.min(3,layers),lane=layers===1?0:k/(layers-1)-.5;
  const radius=o.radius+lane*o.width*1.8;
  const start=(broken?k*Math.PI*2/3:angular?k*.97:k*.83)+phase;
  const length=Math.min(Math.PI*2,o.arc*(broken?.7+hashSeed(s.seed,39100+k)*.3:1));
  const width=veil?o.width*(.65+.35*hashSeed(s.seed,39200+k)):Math.max(.002,o.width*.045);
  const seg=Math.ceil(length*64),rows=veil?12:4,pos:number[]=[],uv:number[]=[],indices:number[]=[];
  for(let i=0;i<=seg;i++)for(let j=0;j<=rows;j++){
   const t=i/seg,a=start+t*length,v=j/rows,taper=length>6.28?1:.28+.72*Math.pow(Math.sin(t*Math.PI),.6);
   pos.push(...shape(a,radius+(v-.5)*width*taper,Math.sin(a*2+k*.48)*o.warp+(v-.5)*o.warp*.5));uv.push(t,v);
   if(i<seg&&j<rows){const b=i*(rows+1)+j;indices.push(b,b+rows+1,b+1,b+1,b+rows+1,b+rows+2);}
  }
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(pos,3));geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));geometry.setIndex(indices);
  const material=new ShaderMaterial({side:DoubleSide,transparent:true,depthWrite:false,blending:AdditiveBlending,
   uniforms:{uColor:{value:k%2?primary:secondary},uOther:{value:k%2?secondary:primary},uTime:{value:0},uOrbitTime:{value:0},uPhase:{value:k*.76},uVeil:{value:veil?1:0},uOpacity:{value:o.opacity},uFeather:{value:o.feather},uStream:{value:o.streamSpeed},uTwinkle:{value:o.twinkle},uWarp:{value:o.warp},uSpeed:{value:o.speed*(k%2===0?.7:-.45)},uLightDirection:{value:new Vector3(...l.direction).normalize()},uClosed:{value:length>6.28?1:0}},
   vertexShader:`uniform float uTime,uOrbitTime,uPhase,uWarp,uSpeed,uStream;varying vec2 vUv;varying vec3 vWorld;
    void main(){vUv=uv;vec3 p=position;float a=atan(p.y,p.x);p.z+=sin(a*2.+uTime*uStream*.24+uPhase)*uWarp*.7;float r=uOrbitTime*uSpeed;mat2 rot=mat2(cos(r),-sin(r),sin(r),cos(r));p.xy=rot*p.xy;vWorld=(modelMatrix*vec4(p,0.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
   fragmentShader:`uniform vec3 uColor,uOther,uLightDirection;uniform float uTime,uPhase,uVeil,uOpacity,uClosed,uFeather,uStream,uTwinkle;varying vec2 vUv;varying vec3 vWorld;
    void main(){float edge=pow(max(0.,1.-abs(vUv.y*2.-1.)),mix(1.3,2.1,uVeil)*uFeather);float ends=mix(smoothstep(0.,.06,vUv.x)*(1.-smoothstep(.88,1.,vUv.x)),1.,uClosed);
     float stream=.5+.5*sin(vUv.x*18.-uTime*uStream*.65+uPhase);float threads=pow(.5+.5*sin(vUv.y*78.+vUv.x*8.-uTime*uStream*.28+uPhase),7.);
     float surge=pow(.5+.5*sin(vUv.x*6.283-uTime*uStream*.37+uPhase),12.);float silk=mix(.44+.48*stream,.055+.11*stream+.16*threads,uVeil);
     vec3 sun=normalize(uLightDirection);float along=dot(-vWorld,sun);float nearest=length(vWorld+sun*max(along,0.));float shadow=along>0.?smoothstep(.98,1.12,nearest):1.;
     vec3 color=mix(uColor,uOther,.5+.5*sin(vUv.x*5.+uPhase))*(1.1+surge*.8*uTwinkle);gl_FragColor=vec4(color,edge*ends*silk*mix(.2,1.,shadow)*uOpacity);
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
    }`});
  group.add(new Mesh(geometry,material));
 }
 const count=s.quality==='low'?Math.min(o.particles,2400):o.particles,positions:number[]=[],phases:number[]=[],sizes:number[]=[],colors:number[]=[];
 for(let i=0;i<count;i++){
  const r=(slot:number)=>hashSeed(s.seed,40000+i*7+slot),lane=i%o.layers;
  const start=dustOnly?lane*.17:broken?lane*Math.PI*2/3:angular?lane*.97:lane*.83;
  const a=start+phase+r(0)*o.arc,laneRadius=o.radius+((lane+.5)/o.layers-.5)*o.width*1.8+(r(1)-.5)*o.width/o.layers;
  positions.push(...shape(a,laneRadius,(r(2)-.5)*o.warp+Math.sin(a*2+lane*.45)*o.warp));
  phases.push(r(3)*Math.PI*2);sizes.push(o.particleSize*(.35+r(4)));
  const c=primary.clone().lerp(secondary,r(5));colors.push(c.r,c.g,c.b);
 }
 if(count){
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('aPhase',new Float32BufferAttribute(phases,1));geometry.setAttribute('aSize',new Float32BufferAttribute(sizes,1));geometry.setAttribute('aColor',new Float32BufferAttribute(colors,3));
  const material=new ShaderMaterial({transparent:true,depthWrite:false,blending:AdditiveBlending,uniforms:{uTime:{value:0},uOrbitTime:{value:0},uPointScale:{value:1},uSpeed:{value:o.speed},uWarp:{value:o.warp},uOpacity:{value:o.opacity},uTwinkle:{value:o.twinkle}},
   vertexShader:`uniform float uTime,uOrbitTime,uPointScale,uSpeed,uWarp,uTwinkle;attribute float aPhase,aSize;attribute vec3 aColor;varying float vAlpha;varying vec3 vColor;
    void main(){float a=uOrbitTime*uSpeed*(.7+.6*fract(aPhase));mat2 rot=mat2(cos(a),-sin(a),sin(a),cos(a));vec3 p=position;p.xy=rot*p.xy;p.z+=sin(aPhase+uTime*.2)*uWarp*.3;vColor=aColor;vAlpha=mix(.6,.3+.55*pow(.5+.5*sin(aPhase+uTime*.5),2.),uTwinkle);vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=aSize*uPointScale;gl_Position=projectionMatrix*mv;}`,
   fragmentShader:`uniform float uOpacity;varying float vAlpha;varying vec3 vColor;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(vColor*1.45,exp(-d*d*4.)*vAlpha*uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`});
  const points=new Points(geometry,material);points.visible=o.particleSize>0;group.add(points);
 }
 return group;
}

export function updateOrbitPose(group:Group,s:RenderSpec,time:number){
 const o=orbitSettings(s);group.rotation.set(o.inclination+Math.sin(time*o.precession)*o.warp,o.azimuth+Math.sin(time*o.precession*.7)*o.warp*2,o.tilt+Math.sin(time*o.precession*1.3)*o.warp);
}
