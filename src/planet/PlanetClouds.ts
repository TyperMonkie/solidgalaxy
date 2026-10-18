// Adapted from Daniel Greenheck's Atmosphere (MIT, 2023).
// Original sampling, cloud.png sprite, simplex density and directional lighting.
// https://github.com/dgreenheck/threejs-procedural-planets
import { Points, BufferGeometry, Float32BufferAttribute, ShaderMaterial, NormalBlending, Color, TextureLoader, Vector3 } from 'three';
import type { RenderSpec } from './RenderSpec.ts';
import noise from './vendor/greenheck-terrain.glsl?raw';
import { hashSeed } from './procedural.ts';
// Shared immutable source asset; individual planet changes do not reload it.
let cloudTexture: ReturnType<TextureLoader['load']> | undefined;
export function createClouds(s:RenderSpec){
  cloudTexture??=new TextureLoader().load('/textures/greenheck-cloud.png');
  const count=s.quality==='low'?1800:4000,positions:number[]=[],sizes:number[]=[];
  for(let i=0;i<count;i++){
    const r=(slot:number)=>hashSeed(s.seed,12000+i*5+slot);
    const p=new Vector3(r(0)*2-1,r(1)*2-1,r(2)*2-1).normalize().multiplyScalar(1.05+r(3)*.075);
    positions.push(p.x,p.y,p.z);sizes.push(50+r(4)*50);
  }
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('size',new Float32BufferAttribute(sizes,1));
  const material=new ShaderMaterial({transparent:true,depthWrite:false,blending:NormalBlending,
    uniforms:{uTime:{value:0},uPointScale:{value:1},pointTexture:{value:cloudTexture},uColor:{value:new Color('#ffffff').lerp(new Color(s.atmosphere.color),.045)}},
    vertexShader:`attribute float size;uniform float uPointScale;varying vec3 fragPosition;
      void main(){gl_PointSize=size*uPointScale;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);fragPosition=(modelMatrix*vec4(position,1.)).xyz;}`,
    fragmentShader:noise+`
      uniform float uTime;uniform vec3 uColor;uniform sampler2D pointTexture;varying vec3 fragPosition;
      void main(){vec3 R=normalize(fragPosition);vec3 L=normalize(vec3(-2.8,3.5,3.8));float light=max(.05,dot(R,L));
      float n=simplex3(vec3(uTime*.03)+fragPosition/.4);float alpha=.35*clamp(n,0.,1.);
      gl_FragColor=vec4(light*uColor,alpha)*texture2D(pointTexture,gl_PointCoord);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`});
  const clouds=new Points(geometry,material);clouds.name='Greenheck cloud atmosphere';return clouds;
}
