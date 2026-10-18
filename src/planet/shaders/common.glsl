float hash3(vec3 p) { return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453123); }
float vnoise(vec3 p) {
  vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p) {
  float f=0.0, a=0.5;
  for(int i=0;i<4;i++){ f += a*snoise(p); p=p*2.03+vec3(4.1,7.7,1.3); a*=0.5; }
  return f;
}
