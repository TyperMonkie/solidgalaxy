// Daniel Greenheck, threejs-procedural-planets, MIT (2023).
// index.html planet-frag-shader five elevation layers; names adapted for arrays.
// Source commit 23457d4f8e6bedf22aa266e12c92f850822ff3a4.
uniform vec3 uColors[5];
uniform float uTransitions[4],uBlends[4];
vec3 elevationColor(float h){
 vec3 color12=mix(uColors[0],uColors[1],smoothstep(uTransitions[0]-max(.0001,uBlends[0]),uTransitions[0]+max(.0001,uBlends[0]),h));
 vec3 color123=mix(color12,uColors[2],smoothstep(uTransitions[1]-max(.0001,uBlends[1]),uTransitions[1]+max(.0001,uBlends[1]),h));
 vec3 color1234=mix(color123,uColors[3],smoothstep(uTransitions[2]-max(.0001,uBlends[2]),uTransitions[2]+max(.0001,uBlends[2]),h));
 return mix(color1234,uColors[4],smoothstep(uTransitions[3]-max(.0001,uBlends[3]),uTransitions[3]+max(.0001,uBlends[3]),h));
}
