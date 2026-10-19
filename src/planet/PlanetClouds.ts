// Adapted from Daniel Greenheck's Atmosphere (MIT, 2023).
// Original sampling, cloud.png sprite, simplex density and directional lighting.
// https://github.com/dgreenheck/threejs-procedural-planets
import { Points, BufferGeometry, Float32BufferAttribute, ShaderMaterial, NormalBlending, Color, Vector3 } from 'three';
import type { RenderSpec } from './RenderSpec.ts';
import noise from './vendor/greenheck-terrain.glsl?raw';
import { hashSeed } from './procedural.ts';
import { weatherSettings, lightingSettings } from './ProceduralSettings.ts';
import { climateGLSL, climateUniforms } from './ClimateField.ts';
import { cloudSpriteTexture } from './CloudTexture.ts';
import { cloudParticleCount } from './CloudReadout.ts';
// Shared immutable source asset; individual planet changes do not reload it.

export function createClouds(s:RenderSpec){
  const cloudTexture=cloudSpriteTexture();
  const w=weatherSettings(s),l=lightingSettings(s);
  const count=cloudParticleCount(s),positions:number[]=[],sizes:number[]=[];
  for(let i=0;i<count;i++){
    const r=(slot:number)=>hashSeed(s.seed,12000+i*5+slot);
    const p=new Vector3(r(0)*2-1,r(1)*2-1,r(2)*2-1).normalize().multiplyScalar(1+w.altitude+r(3)*w.thickness);
    positions.push(p.x,p.y,p.z);sizes.push(w.minParticleSize+r(4)*(w.maxParticleSize-w.minParticleSize));
  }
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('size',new Float32BufferAttribute(sizes,1));
  const material=new ShaderMaterial({transparent:true,depthWrite:false,blending:NormalBlending,
    uniforms:{...climateUniforms(s),uTime:{value:0},uPointScale:{value:1},pointTexture:{value:cloudTexture},uColor:{value:new Color(w.color)},uDensity:{value:w.density},uOpacity:{value:w.opacity},uScale:{value:w.scale},uSpeed:{value:w.speed},uLightDirection:{value:new Vector3(...l.direction).normalize()},uLightColor:{value:new Color(l.color)},uAmbient:{value:l.ambient},uLight:{value:l.enabled?l.intensity:0}},
    vertexShader:`attribute float size;uniform float uPointScale;varying vec3 fragPosition;
      void main(){vec4 mv=modelViewMatrix*vec4(position,1.);float worldScale=length(modelMatrix[0].xyz);gl_PointSize=size*uPointScale*worldScale*clamp(6.8/max(.1,-mv.z),.25,3.);gl_Position=projectionMatrix*mv;fragPosition=position;}`,
    fragmentShader:noise+climateGLSL+`
      uniform float uTime,uDensity,uOpacity,uScale,uSpeed,uAmbient,uLight;uniform mat4 modelMatrix;uniform vec3 uColor,uLightDirection,uLightColor;uniform sampler2D pointTexture;varying vec3 fragPosition;
      void main(){vec3 R=normalize((modelMatrix*vec4(fragPosition,0.)).xyz);vec3 L=normalize(uLightDirection);float light=uAmbient+uLight*max(0.,dot(R,L));
      float n=simplex3(vec3(uTime*uSpeed)+fragPosition/uScale);float alpha=uOpacity*clamp(n+uDensity,0.,1.)*climateCloudTransmission(uClimateCloudRotation*fragPosition);
      gl_FragColor=vec4(light*uColor*uLightColor,alpha)*texture2D(pointTexture,gl_PointCoord);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`});
  const clouds=new Points(geometry,material);clouds.visible=w.maxParticleSize>0;clouds.name='Greenheck cloud atmosphere';return clouds;
}
