import { BufferGeometry, Float32BufferAttribute, Group, Mesh, Points, ShaderMaterial, DoubleSide, Color, AdditiveBlending, NormalBlending } from 'three';
import type { RenderSpec } from './RenderSpec.ts';
import { hashSeed } from './procedural.ts';

/** Thin translucent silk curves or a sparse point orbit; the planet stays mesh-driven. */
export function createOrbits(s:RenderSpec){
 const group=new Group();group.rotation.set(1.08,.18,s.orbits.tilt);
 const color=new Color(s.material.palette[1]).lerp(new Color(s.material.palette[2]),.65);
 if(s.orbits.type==='dust'){
  const count=s.quality==='low'?700:1500,positions:number[]=[],phases:number[]=[],sizes:number[]=[];
  for(let i=0;i<count;i++){
   const r=(slot:number)=>hashSeed(s.seed,40000+i*6+slot),a=r(0)*Math.PI*2;
   const lane=i%3,radius=1.48+lane*.105+(r(1)-.5)*.09;
   positions.push(Math.cos(a)*radius,Math.sin(a)*radius,(r(2)-.5)*.06+Math.sin(a*2.+lane)*.055);
   phases.push(r(3)*Math.PI*2);sizes.push(.7+r(4)*1.7);
  }
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('aPhase',new Float32BufferAttribute(phases,1));geometry.setAttribute('aSize',new Float32BufferAttribute(sizes,1));
  const material=new ShaderMaterial({transparent:true,depthWrite:false,blending:AdditiveBlending,uniforms:{uTime:{value:0},uPointScale:{value:1},uColor:{value:color}},
   vertexShader:`uniform float uTime,uPointScale;attribute float aPhase,aSize;varying float vAlpha;void main(){float speed=mix(.04,.095,fract(aPhase));float a=uTime*speed;mat2 rot=mat2(cos(a),-sin(a),sin(a),cos(a));vec3 p=position;p.xy=rot*p.xy;p.z+=sin(aPhase+uTime*.2)*.015;vAlpha=.28+.42*pow(.5+.5*sin(aPhase+uTime*.45),2.);vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=aSize*uPointScale;gl_Position=projectionMatrix*mv;}`,
   fragmentShader:`uniform vec3 uColor;varying float vAlpha;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;float alpha=exp(-d*d*4.)*vAlpha;gl_FragColor=vec4(uColor,alpha);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
   }`});
  group.add(new Points(geometry,material));return group;
 }
 const broken=s.orbits.type==='broken',angular=s.orbits.type==='angular',pieces=broken?7:angular?4:6;
 for(let k=0;k<pieces;k++){
  const start=broken?k*.91:angular?k*1.62:k*.91-.8;
  const length=broken?.65:angular?1.27:3.3+(k%3)*.65;
  const seg=Math.ceil(length*60),width=broken?.028:angular?.018:.012+(k%3)*.009;
  const radius=1.46+k*.038,pos:number[]=[],uv:number[]=[],indices:number[]=[];
  for(let i=0;i<=seg;i++)for(let j=0;j<=6;j++){
   const t=i/seg,a=start+t*length,v=j/6,taper=Math.pow(Math.sin(t*Math.PI),.6);
   const rad=radius+(v-.5)*width*taper+Math.sin(a*2.+k*.3)*.025;
   pos.push(Math.cos(a)*rad,Math.sin(a)*rad,Math.sin(a*1.5+k*.4)*.075+(v-.5)*.015);uv.push(t,v);
   if(i<seg&&j<6){const b=i*7+j;indices.push(b,b+7,b+1,b+1,b+7,b+8);}
  }
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(pos,3));geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const material=new ShaderMaterial({side:DoubleSide,transparent:true,depthWrite:false,blending:NormalBlending,
   uniforms:{uColor:{value:color},uTime:{value:0},uPhase:{value:k*.7}},
   vertexShader:`uniform float uTime,uPhase;varying vec2 vUv;varying vec3 vWorld;void main(){vUv=uv;vec3 p=position;float a=atan(p.y,p.x);p.z+=sin(a*2.+uTime*.35+uPhase)*.045;vWorld=(modelMatrix*vec4(p,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
   fragmentShader:`uniform vec3 uColor;uniform float uTime,uPhase;varying vec2 vUv;varying vec3 vWorld;void main(){float crossSection=pow(max(0.,1.-abs(vUv.y*2.-1.)),1.4);float ends=smoothstep(0.,.13,vUv.x)*(1.-smoothstep(.8,1.,vUv.x));float silk=.38+.35*pow(.5+.5*sin(vUv.x*13.-uTime*.65+uPhase),3.);vec3 sun=normalize(vec3(-2.8,3.5,3.8));float along=dot(-vWorld,sun);float nearest=length(vWorld+sun*max(along,0.));float shadow=along>0.?smoothstep(.98,1.08,nearest):1.;float alpha=crossSection*ends*silk*mix(.3,1.,shadow);gl_FragColor=vec4(uColor*(.8+silk*.4),alpha);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
   }`});
  group.add(new Mesh(geometry,material));
 }
 return group;
}
