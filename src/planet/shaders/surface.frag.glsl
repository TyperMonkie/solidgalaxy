uniform float uRoughness,uMetalness,uEmission,uLight,uAmbient;
uniform vec3 uPalette[3];
uniform mat3 normalMatrix;
varying vec3 vLocal,vViewPosition;
void main(){
  vec3 p=normalize(vLocal);float h=terrain(p);
  vec3 tangent=normalize(cross(abs(p.y)>.95?vec3(1,0,0):vec3(0,1,0),p));
  vec3 bitangent=normalize(cross(p,tangent));
  // Greenheck displaced finite-difference normals, corrected to view space.
  float epsilon=.001;vec3 pos=surfacePoint(p);
  vec3 dx=surfacePoint(normalize(p+epsilon*tangent));
  vec3 dy=surfacePoint(normalize(p+epsilon*bitangent));
  vec3 localNormal=normalize(cross(dx-pos,dy-pos));
  vec3 N=normalize(normalMatrix*localNormal);
  if(uStyle>1.5)N=normalize(cross(dFdx(vViewPosition),dFdy(vViewPosition)));
  vec3 V=normalize(-vViewPosition),L=normalize((viewMatrix*vec4(-2.8,3.5,3.8,0.)).xyz),H=normalize(V+L);
  vec3 color;float emission=0.,water=0.;
  if(uStyle<.5){
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
    float gap=fracture(p),crack=1.-smoothstep(.002,.018,gap);
    float grain=simplex3(p*92.+uSeed)*.12;
    color=mix(uPalette[0],uPalette[1],smoothstep(.04,.38,h))*(.8+grain);
    color=mix(color,uPalette[2]*.22,crack);
    emission=crack*(1.2+.18*sin(uTime*.35+p.y*9.));
    float hairline=pow(max(0.,1.-abs(simplex3(p*18.))*35.),3.);
    emission+=hairline*.1*smoothstep(.15,.35,h);
  }else{
    float mineral=simplex3(p*4.+uSeed)*.5+.5;
    color=mix(uPalette[0],uPalette[1],mineral);
    color=mix(color,uPalette[2],smoothstep(.22,.4,h)*.6);
    float boundary=pow(max(0.,1.-abs(simplex3(p*9.))*14.),5.);
    emission=boundary*.2;
  }
  float diffuse=max(dot(N,L),0.),rough=mix(uRoughness,.17,water);
  float specular=pow(max(dot(N,H),0.),mix(140.,12.,rough))*(1.-rough*.7);
  float sky=max(dot(N,normalize((viewMatrix*vec4(0,1,0,0)).xyz))*.5+.5,0.);
  float rim=pow(1.-max(dot(N,V),0.),4.);
  vec3 lit=color*(uAmbient+diffuse*uLight)+color*sky*.04;
  lit+=mix(vec3(.82,.88,1.),color,uMetalness)*specular*uLight*.55;
  lit+=uPalette[2]*(emission*uEmission+rim*.065);
  gl_FragColor=vec4(lit,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}

