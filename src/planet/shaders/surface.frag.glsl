uniform float uEmissionPattern,uEmissionFrequency,uEmissionPulse;
uniform vec3 uRimColor;
uniform float uRoughness,uMetalness,uEmission,uLight,uAmbient;
uniform vec3 uLightDirection,uLightColor;
uniform float uSpecular,uShininess,uRimStrength;
uniform bool uExplicitLighting;
uniform vec3 uPalette[3];
uniform mat3 normalMatrix;
varying vec3 vLocal,vViewPosition;
void main(){
  vec3 p=normalize(vLocal);float h=terrain(p);
  vec3 tangent=normalize(cross(abs(p.y)>.95?vec3(1,0,0):vec3(0,1,0),p));
  vec3 bitangent=normalize(cross(p,tangent));
  // Greenheck displaced finite-difference normals, corrected to view space.
  float epsilon=uProcedural?uBumpOffset:.001;vec3 pos=surfacePoint(p);
  vec3 dx=surfacePoint(normalize(p+epsilon*tangent));
  vec3 dy=surfacePoint(normalize(p+epsilon*bitangent));
  vec3 localNormal=normalize(cross(dx-pos,dy-pos));
  // Mineral relief reads as satin stone; keep micro-slopes from dominating
  // the globe's broad lighting, including legacy low-roughness configurations.
  if(uProcedural)localNormal=normalize(mix(p,localNormal,uBumpStrength));
  else if(uStyle>1.5)localNormal=normalize(mix(p,localNormal,.25));
  vec3 N=normalize(normalMatrix*localNormal);
  vec3 V=normalize(-vViewPosition),L=normalize((viewMatrix*vec4(uLightDirection,0.)).xyz),H=normalize(V+L+vec3(.000001));
  vec3 color;float emission=0.,water=0.;
  if(uProcedural){
    color=elevationColor(h);
    water=1.-smoothstep(max(.001,uTransitions[1])*.65,max(.002,uTransitions[1]),h);
    if(uStyle>.5&&uStyle<1.5){float crack=fractureMask(fractureField(p));color=mix(color,uPalette[2]*.16,crack);emission=crack*(1.+.15*sin(uTime*.35+p.y*9.));}
  }else if(uStyle<.5){
    // Five elevation layers, from Greenheck color12 -> finalColor.
    vec3 ocean=uPalette[0]*.7,shelf=mix(uPalette[0],uPalette[2],.28);
    vec3 coast=mix(uPalette[1],uPalette[2],.18),land=uPalette[1]*.45;
    vec3 summit=mix(uPalette[2],vec3(.8,.85,.9),.5);
    color=mix(ocean,shelf,smoothstep(-.081,.223,h));
    color=mix(color,coast,smoothstep(.063,.367,h));
    color=mix(color,land,smoothstep(.22,.524,h));
    color=mix(color,summit,smoothstep(1.032,1.368,h));
    water=1.-smoothstep(.083,.11,h);
    float current=sin(p.y*65.+simplex3(p*5.)*12.+uTime*.025);
    color+=uPalette[2]*water*pow(max(current,0.),16.)*.025;
    emission=pow(max(0.,1.-abs(h-.105)*100.),8.)*.035;
  }else if(uStyle<1.5){
    vec2 field=fractureField(p);float crack=fractureMask(field);
    float grain=simplex3(p*92.+uSeed)*.12;
    color=mix(uPalette[0],uPalette[1],smoothstep(.04,.38,h))*(.8+grain);
    color=mix(color,uPalette[2]*.22,crack);
    emission=crack*(1.2+.18*sin(uTime*.35+p.y*9.));
    emission+=crack*.1*smoothstep(.15,.35,h);
  }else{
    // Layered mineral strata and fine veins, rather than painted low-poly faces.
    vec3 warp=p+vec3(simplex3(p*3.+uSeed),simplex3(p*3.+11.),simplex3(p*3.-7.))*.12;
    float mineral=simplex3(warp*5.+uSeed)*.5+.5;
    float strata=.5+.5*sin(warp.y*42.+mineral*9.+simplex3(warp*13.)*2.);
    float grain=simplex3(p*95.+uSeed)*.025+simplex3(p*190.)*.01;
    color=mix(uPalette[0],uPalette[1],.38+.52*smoothstep(.18,.78,mineral));
    color*=.92+strata*.1+grain;
    float boundary=1.-smoothstep(.012,.045,abs(simplex3(warp*16.)));
    float deposits=smoothstep(.62,.84,simplex3(warp*31.)*.5+.5);
    color=mix(color,uPalette[2],deposits*.12+boundary*.06);
    emission=boundary*(.14+.04*sin(uTime*.25+p.y*8.));
  }
  if(uProcedural&&uEmissionPattern>=0.){
    float pattern=0.;
    if(uEmissionPattern>.5&&uEmissionPattern<1.5)pattern=fractureMask(fractureField(p));
    else if(uEmissionPattern>1.5&&uEmissionPattern<2.5)pattern=pow(.5+.5*sin(h*uEmissionFrequency*6.283),18.);
    else if(uEmissionPattern>2.5)pattern=1.-smoothstep(.015,.08,abs(simplex3(p*uEmissionFrequency+uSeed)));
    emission=pattern*mix(1.,.5+.5*sin(uTime*.35+p.y*9.),uEmissionPulse);
  }
  float diffuse=max(dot(N,L),0.),rough=mix(uRoughness,uRoughness*.3,water);
  applyClimateSurface(p,color,rough);
  float specular=pow(max(dot(N,H),.000001),mix(140.,12.,rough))*(1.-rough*.7);
  // Original Greenheck reflection/shininess response, with a safe pow base.
  // Independent controls also preserve roughness and metalness as art inputs.
  float falloff=uProcedural?clamp((uTransitions[1]-h)/max(.0001,uTransitions[1]),0.,1.):1.;
  float reflected=max(dot(V,reflect(-L,N)),.000001);
  float explicitSpecular=pow(reflected,uShininess)*uSpecular*mix(.2,1.,falloff)*(1.-rough*.7)*diffuse;
  float sky=max(dot(N,normalize((viewMatrix*vec4(0,1,0,0)).xyz))*.5+.5,0.);
  float rim=pow(1.-max(dot(N,V),0.),4.);
  vec3 lit=color*(uAmbient+diffuse*uLight)*uLightColor;
  if(!uExplicitLighting)lit+=color*sky*.04;
  // Rock/water are dielectric: retain a small highlight instead of a white
  // mirror lobe. Metalness still continuously selects a coloured reflection.
  lit+=mix(uLightColor*.16,color*uLightColor,uMetalness)*(uExplicitLighting?explicitSpecular:specular*uLight*(uStyle>1.5?.12:.55));
  lit+=climateSurfaceGlow(p)+uPalette[2]*emission*uEmission+uRimColor*rim*uRimStrength;
  gl_FragColor=vec4(lit,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}

