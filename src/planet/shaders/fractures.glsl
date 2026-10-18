uniform vec3 uCells[32];
uniform int uCellCount;
uniform vec4 uFractureA,uFractureB;
uniform mat3 uFractureRotation;
// x: distance to a channel; y: regional activity. Shared across near/far,
// displacement, colour and emission so visible cracks follow actual grooves.
vec2 fractureField(vec3 p){
  float seed=uFractureB.w,stretch=uFractureA.z;
  vec3 r=uFractureRotation*p;
  vec3 warp=vec3(simplex3(r*3.1+seed),simplex3(r*3.1+seed+13.),simplex3(r*3.1+seed-8.));
  vec3 q=r+warp*(.015+uFractureA.w*.24);
  vec3 metric=vec3(1.-stretch*.82,1.+stretch*1.1,1.-stretch*.68);
  float d1=10.,d2=10.;
  for(int i=0;i<32;i++){
    if(i>=uCellCount)break;
    float d=length((q-uCells[i])*metric);
    if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;
  }
  float plates=(d2-d1)*sqrt(float(uCellCount)/18.);
  vec3 v=q*vec3(1.-stretch*.88,1.+stretch*1.3,1.-stretch*.8)*(2.+uFractureA.x*4.5)+seed;
  float trunk=simplex3(v)+simplex3(v*2.17+7.)*(.08+uFractureA.w*.26);
  float trunkDistance=abs(trunk)*.13;
  // Secondary channels taper away from the main rifts rather than covering
  // the whole sphere with a second identical noise contour.
  float tributary=abs(simplex3(v*2.73+11.))*.20;
  tributary+=smoothstep(.025,.10,trunkDistance)*.07;
  float veins=min(trunkDistance,tributary/max(.1,uFractureA.y));
  // Width-weighted union continuously blends plate boundaries and tributaries.
  // Averaging distances instead would erase both networks near the midpoint.
  float branch=uFractureA.y;
  float channel=min(plates/max(.015,1.-branch),veins/max(.015,branch));
  float region=simplex3(r*2.2+seed)*.5+.5;
  float threshold=mix(.83,-.15,uFractureB.y);
  return vec2(channel,smoothstep(threshold,threshold+.16,region));
}
float fractureWidth(){return mix(.003,.035,uFractureB.x);}
float fractureMask(vec2 field){return (1.-smoothstep(fractureWidth()*.24,fractureWidth(),field.x))*field.y;}
