import { AdditiveBlending, BackSide, Color, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from 'three';
import type { RenderSpec } from './RenderSpec.ts';
import { lightingSettings } from './ProceduralSettings.ts';
import { atmosphereSettings } from './ArtSettings.ts';
export function createAtmosphere(s: RenderSpec){
  const l=lightingSettings(s),a=atmosphereSettings(s);
  const material=new ShaderMaterial({transparent:true,depthWrite:false,blending:AdditiveBlending,side:BackSide,
    uniforms:{uColor:{value:new Color(s.atmosphere.color)},uStrength:{value:a.strength},uFalloff:{value:a.falloff},uLightDirection:{value:new Vector3(...l.direction).normalize()},uLightColor:{value:new Color(l.color)},uLight:{value:l.enabled?l.intensity:0},uAmbient:{value:l.ambient}},
    vertexShader:`varying vec3 vN; varying vec3 vP; void main(){vN=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.);vP=p.xyz;gl_Position=projectionMatrix*p;}`,
    fragmentShader:`uniform vec3 uColor,uLightDirection,uLightColor;uniform float uStrength,uLight,uAmbient,uFalloff;varying vec3 vN;varying vec3 vP;void main(){float f=abs(dot(normalize(vN),normalize(-vP)));float rim=pow(1.-f,uFalloff);float fade=smoothstep(.0,.18,f);vec3 L=normalize((viewMatrix*vec4(uLightDirection,0.)).xyz);float light=uAmbient+uLight*max(dot(normalize(vN),L),0.);gl_FragColor=vec4(uColor*uLightColor,rim*fade*uStrength*light);}`
  });
  return new Mesh(new SphereGeometry(1+a.altitude,64,48),material);
}
