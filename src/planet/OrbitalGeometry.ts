import { BufferGeometry, Float32BufferAttribute, Group, Mesh, Points, ShaderMaterial, DoubleSide, Color, AdditiveBlending } from 'three';
import type { RenderSpec } from './RenderSpec.ts';
import { hashSeed } from './procedural.ts';

/** Layered silk, fine luminous filaments and orbiting dust. All motion stays on the GPU. */
export function createOrbits(s:RenderSpec){
 const group=new Group();group.rotation.set(1.08,.18,s.orbits.tilt);
 const primary=new Color(s.material.palette[1]).lerp(new Color(s.material.palette[2]),.7).lerp(new Color('#d0e8ff'),.23);
 const secondary=new Color(s.material.palette[2]).lerp(new Color('#f5d5ab'),.32);
 const dustOnly=s.orbits.type==='dust',broken=s.orbits.type==='broken',angular=s.orbits.type==='angular';
 const layers=dustOnly?3:10;
 for(let k=0;k<layers;k++){
  const veil=k<3, radius=veil?1.54+k*.19:1.49+(k-3)*.086;
  const start=k*.83-.9, length=broken?1.25+(k%3)*.4:angular?2.25:4.35+(k%3)*.49;
  const width=veil?(dustOnly?.09:.14+k*.025):.005+(k%3)*.004;
  const seg=Math.ceil(length*64),rows=veil?12:4,pos:number[]=[],uv:number[]=[],indices:number[]=[];
  for(let i=0;i<=seg;i++)for(let j=0;j<=rows;j++){
   const t=i/seg,a=start+t*length,v=j/rows,taper=.28+.72*Math.pow(Math.sin(t*Math.PI),.6);
   const rad=radius+(v-.5)*width*taper+Math.sin(a*2.+k*.43)*.032;
   pos.push(Math.cos(a)*rad,Math.sin(a)*rad,Math.sin(a*2.+k*.48)*(.035+k*.007)+(v-.5)*.035);uv.push(t,v);
   if(i<seg&&j<rows){const b=i*(rows+1)+j;indices.push(b,b+rows+1,b+1,b+1,b+rows+1,b+rows+2);}
  }
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(pos,3));geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));geometry.setIndex(indices);
  const material=new ShaderMaterial({side:DoubleSide,transparent:true,depthWrite:false,blending:AdditiveBlending,
   uniforms:{uColor:{value:k%2?primary:secondary},uOther:{value:k%2?secondary:primary},uTime:{value:0},uPhase:{value:k*.76},uVeil:{value:veil?1:0},uStrength:{value:dustOnly?.43:1}},
   vertexShader:`uniform float uTime,uPhase;varying vec2 vUv;varying vec3 vWorld;void main(){vUv=uv;vec3 p=position;float a=atan(p.y,p.x);p.z+=sin(a*2.+uTime*.24+uPhase)*.045;vWorld=(modelMatrix*vec4(p,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
   fragmentShader:`uniform vec3 uColor,uOther;uniform float uTime,uPhase,uVeil,uStrength;varying vec2 vUv;varying vec3 vWorld;
   void main(){float edge=pow(max(0.,1.-abs(vUv.y*2.-1.)),mix(1.3,2.1,uVeil));float ends=smoothstep(0.,.06,vUv.x)*(1.-smoothstep(.88,1.,vUv.x));
    float stream=.5+.5*sin(vUv.x*18.-uTime*.65+uPhase);float threads=pow(.5+.5*sin(vUv.y*78.+vUv.x*8.-uTime*.28+uPhase),7.);
    float surge=pow(.5+.5*sin(vUv.x*6.283-uTime*.37+uPhase),12.);float silk=mix(.44+.48*stream,.055+.11*stream+.16*threads,uVeil);
    vec3 sun=normalize(vec3(-2.8,3.5,3.8));float along=dot(-vWorld,sun);float nearest=length(vWorld+sun*max(along,0.));float shadow=along>0.?smoothstep(.98,1.12,nearest):1.;
    vec3 color=mix(uColor,uOther,.5+.5*sin(vUv.x*5.+uPhase))*(1.1+surge*.8);float alpha=edge*ends*silk*mix(.2,1.,shadow)*uStrength;gl_FragColor=vec4(color,alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`});
  group.add(new Mesh(geometry,material));
 }
 const count=s.quality==='low'?(dustOnly?2400:900):(dustOnly?6200:2200),positions:number[]=[],phases:number[]=[],sizes:number[]=[],colors:number[]=[];
 for(let i=0;i<count;i++){
  const r=(slot:number)=>hashSeed(s.seed,40000+i*7+slot),a=r(0)*Math.PI*2,lane=i%5;
  const radius=1.47+lane*.105+(r(1)-.5)*(dustOnly?.18:.075);
  positions.push(Math.cos(a)*radius,Math.sin(a)*radius,(r(2)-.5)*.055+Math.sin(a*2.+lane*.45)*.06);
  phases.push(r(3)*Math.PI*2);sizes.push(i%83===0?3.1+r(4)*1.5:.65+r(4)*1.35);
  const c=primary.clone().lerp(secondary,r(5));colors.push(c.r,c.g,c.b);
 }
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('aPhase',new Float32BufferAttribute(phases,1));geometry.setAttribute('aSize',new Float32BufferAttribute(sizes,1));geometry.setAttribute('aColor',new Float32BufferAttribute(colors,3));
 const material=new ShaderMaterial({transparent:true,depthWrite:false,blending:AdditiveBlending,uniforms:{uTime:{value:0},uPointScale:{value:1}},
  vertexShader:`uniform float uTime,uPointScale;attribute float aPhase,aSize;attribute vec3 aColor;varying float vAlpha;varying vec3 vColor;void main(){float speed=mix(.045,.1,fract(aPhase));float a=uTime*speed;mat2 rot=mat2(cos(a),-sin(a),sin(a),cos(a));vec3 p=position;p.xy=rot*p.xy;p.z+=sin(aPhase+uTime*.2)*.018;vColor=aColor;vAlpha=.3+.55*pow(.5+.5*sin(aPhase+uTime*.5),2.);vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=aSize*uPointScale;gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`varying float vAlpha;varying vec3 vColor;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;float alpha=exp(-d*d*4.)*vAlpha;gl_FragColor=vec4(vColor*1.45,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  }`});
 group.add(new Points(geometry,material));return group;
}
