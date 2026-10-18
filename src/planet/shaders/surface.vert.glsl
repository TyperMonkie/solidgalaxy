varying vec3 vLocal;
varying vec3 vViewPosition;
void main(){
  vLocal=normalize(position);
  vec4 mv=modelViewMatrix*vec4(surfacePoint(vLocal),1.0);
  vViewPosition=mv.xyz;
  gl_Position=projectionMatrix*mv;
}
